// FILE: src/services/db.service.ts
import Database from 'bun:sqlite';
import { ProcessedCapability } from '../types/yaml.types';
import logger from '../logger';
import { parse as parseYaml } from 'yaml';
import { CapabilityWrapper, EnactDocument, FlowStep } from '@enact/types';
import { schemaAdapter } from './schema-adapter.service'

export class DatabaseService {
  db: Database;

  constructor() {
    this.db = new Database('capabilities.db');
    this.initializeDatabase();
  }


 /**
 * Check the health of the database connection
 * @returns Database health status
 */
async checkHealth(): Promise<{status: string; details?: any}> {
  try {
    // Attempt a simple query to verify database connection
    // Use a different column name to avoid the SQLite reserved keyword
    const result = this.db.prepare('SELECT 1 as health_check').get();
    
    // Check if we can access the capabilities table
    const tablesQuery = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='capabilities'"
    ).get();
    
    if (!tablesQuery) {
      return {
        status: 'warning',
        details: 'Database connected but capabilities table not found'
      };
    }
    
    // Get table statistics
    const countQuery = this.db.prepare('SELECT COUNT(*) as count FROM capabilities').get() as any;
    
    return {
      status: 'ok',
      details: {
        connection: 'active',
        capabilities_count: countQuery.count,
        last_checked: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return {
      status: 'error',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

  /**
 * Get distinct format versions from the database
 * @returns Array of distinct format versions
 */

async getDistinctFormatVersions(): Promise<string[]> {
  try {
    // Check if the format_version column exists
    const columns = this.db.prepare("PRAGMA table_info(capabilities)").all();
    const hasFormatVersion = columns.some((col: any) => col.name === 'format_version');
    
    if (!hasFormatVersion) {
      return ['1.0.0']; // Return default if column doesn't exist
    }
    
    // Get distinct format versions
    const results = this.db.prepare(`
      SELECT DISTINCT format_version 
      FROM capabilities 
      WHERE format_version IS NOT NULL
    `).all();
    
    // Extract versions from results
    return results.map((row: any) => row.format_version);
  } catch (error) {
    logger.error('Error getting distinct format versions:', error);
    return ['1.0.0']; // Return default value on error
  }
}

  initializeDatabase() {
    // Create capabilities table with better column definitions
    // Added a format_version column to track schema versions
    this.db.run(`
      CREATE TABLE IF NOT EXISTS capabilities (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        version TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,  -- Full JSON content
        embedding TEXT NOT NULL, -- Vector embedding stored as JSON string
        format_version TEXT DEFAULT '1.0.0', -- Track which format version this uses
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    
    // Create indexes for faster searching
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_capabilities_type ON capabilities(type)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_capabilities_version ON capabilities(version)`);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity score
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0; // Handle division by zero
    }
    
    return dotProduct / denominator;
  }

  /**
   * Store a capability in the database with format version tracking
   * @param capability The capability to store
   * @param rawContent The original content string (YAML or JSON)
   * @param formatVersion Optional format version to store
   */
  async storeCapability(
    capability: ProcessedCapability, 
    rawContent: string,
    formatVersion?: string
  ) {
    try {
      logger.info(`Storing capability: ${capability.id}`);
      const { id, description, version, type } = capability;
      
      // Basic validation - more lenient
      if (!id) {
        throw new Error('Missing required ID field for capability');
      }

      const { embedding } = capability;
      
      // Determine format version (use from parameter, document, or default)
      const docVersion = formatVersion || capability.enact || '1.0.0';
      
      // Convert embedding array to JSON string
      const embeddingJson = JSON.stringify(embedding);
      
      // Store with updated timestamp and format version
      this.db.prepare(`
        INSERT OR REPLACE INTO capabilities 
        (id, description, version, type, content, embedding, format_version, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
      `).run(
        id, 
        description || '', 
        version || '1.0.0', 
        type || 'atomic', 
        rawContent, 
        embeddingJson,
        docVersion
      );
      
      logger.info(`Successfully stored capability: ${id} with format version ${docVersion}`);
    } catch (error) {
      logger.error('Error storing capability:'+ error);
      throw new Error(`Failed to store capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find capabilities similar to the query embedding
   * @param queryEmbedding The query embedding vector
   * @param limit Maximum number of results to return
   * @returns Array of capabilities sorted by similarity
   */
  async findSimilarCapabilities(queryEmbedding: number[], limit = 5) {
    try {
      // Get all capabilities
      const capabilities = this.db.prepare(`
        SELECT id, description, version, type, embedding, format_version
        FROM capabilities
      `).all();

      if (!capabilities || capabilities.length === 0) {
        return [];
      }

      // Calculate similarities
      const withSimilarity = capabilities.map((cap: any) => {
        try {
          const embeddingVector = JSON.parse(cap.embedding as string);
          return {
            ...cap,
            similarity: this.cosineSimilarity(queryEmbedding, embeddingVector)
          };
        } catch (error) {
          logger.error(`Error parsing embedding for capability ${cap.id}:`, error);
          return {
            ...cap,
            similarity: 0 // Default to lowest similarity on error
          };
        }
      });

      // Sort by similarity and return top results
      return withSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(({ embedding, ...rest }) => rest); // Remove embedding from response
    } catch (error) {
      logger.error('Error finding similar capabilities:', error);
      throw new Error(`Failed to find similar capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a capability by its ID
   * @param id The capability ID
   * @param outputFormat Optional format to convert to
   * @returns The capability content or null if not found
   */
  async getCapabilityById(id: string, outputFormat?: string) {
    try {
      const capability: any = this.db.prepare(`
        SELECT * FROM capabilities WHERE id = ?
      `).get(id);

      if (!capability) {
        return null;
      }

      try {
        // If no specific output format is requested, just return the content string
        if (!outputFormat) {
          return capability.content;
        }
        
        // Otherwise, try to convert to the requested format
        const content = this.parseContent(capability.content);
        const formatVersion = capability.format_version || '1.0.0';
        
        // If outputFormat is different from stored format, convert
        if (outputFormat !== formatVersion) {
          return this.convertFormat(content, formatVersion, outputFormat);
        }
        
        // Return as is if format matches
        return capability.content;
      } catch (parseError) {
        logger.error(`Error processing capability ${id}:`, parseError);
        return null;
      }
    } catch (error) {
      logger.error(`Error retrieving capability ${id}:`, error);
      throw new Error(`Failed to retrieve capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Delete a capability by its ID
   * @param id The capability ID to delete
   */
  async deleteCapability(id: string) {
    try {
      const result = this.db.prepare(`
        DELETE FROM capabilities WHERE id = ?
      `).run(id);
      
      if (result.changes === 0) {
        logger.warn(`No capability found with ID: ${id}`);
      } else {
        logger.info(`Successfully deleted capability: ${id}`);
      }
    } catch (error) {
      logger.error(`Error deleting capability ${id}:`, error);
      throw new Error(`Failed to delete capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Get all capabilities
   * @param preferredFormat Optional format to convert all results to
   * @returns Array of capability wrappers
   */
  async getAllCapabilities(preferredFormat?: string): Promise<CapabilityWrapper[]> {
    try {
      const capabilities = this.db.prepare(`
        SELECT id, description, version, type, content, format_version
        FROM capabilities
      `).all();
      
      if (!capabilities || capabilities.length === 0) {
        return [];
      }
      
      return capabilities.map((cap: any) => {
        try {
          const content = this.parseContent(cap.content);
          const formatVersion = cap.format_version || '1.0.0';
          
          // If preferred format is specified and different, convert
          if (preferredFormat && preferredFormat !== formatVersion) {
            try {
              const convertedContent = this.convertFormat(content, formatVersion, preferredFormat);
              return this.normalizeCapabilityWrapper(convertedContent, preferredFormat);
            } catch (conversionError) {
              logger.error(`Error converting format for ${cap.id}: ${conversionError}`);
              // Fall back to original format if conversion fails
              return this.normalizeCapabilityWrapper(content, formatVersion);
            }
          }
          
          return this.normalizeCapabilityWrapper(content, formatVersion);
        } catch (parseError) {
          logger.error(`Error parsing content for capability ${cap.id}: ${parseError}`);
          return this.createDefaultCapability(cap);
        }
      });
    } catch (error) {
      logger.error('Error getting all capabilities:', error);
      return [];
    }
  }

  /**
   * Parse content string to object, auto-detecting format
   */
  private parseContent(contentStr: string): any {
    if (!contentStr) {
      return {};
    }
    
    // First try parsing as JSON
    try {
      return JSON.parse(contentStr);
    } catch (jsonError) {
      // If that fails, try YAML
      try {
        return parseYaml(contentStr);
      } catch (yamlError) {
        throw new Error('Content is neither valid JSON nor YAML');
      }
    }
  }

  /**
   * Convert a capability from one format version to another
   */
  private convertFormat(content: any, fromVersion: string, toVersion: string): any {
    // If versions are the same, no conversion needed
    if (fromVersion === toVersion) {
      return content;
    }
    
    logger.info(`Converting capability from format ${fromVersion} to ${toVersion}`);
    
    // Handle specific format conversions
    // From v1.0.0 to v2.0.0 (example)
    if (fromVersion === '1.0.0' && toVersion === '1.0.0') {
      return this.convertV1toV2(content);
    }
    
    // From v2.0.0 to v1.0.0 (example)
    if (fromVersion === '1.0.0' && toVersion === '1.0.0') {
      return this.convertV2toV1(content);
    }
    
    // Default case: try to normalize to best match target version
    logger.warn(`No specific conversion path from ${fromVersion} to ${toVersion}, using best-effort normalization`);
    return content;
  }

  /**
   * Example conversion from v1 to v2 format (placeholder)
   */
  private convertV1toV2(content: any): any {
    // Clone to avoid modifying original
    const result = JSON.parse(JSON.stringify(content));
    
    // Update version marker
    result.enact = '1.0.0';
    
    // Example conversion: rename 'task' to 'capability' in flow steps
    if (result.flow?.steps) {
      result.flow.steps = result.flow.steps.map((step: any) => {
        if (step.task && !step.capability) {
          const { task, with: withInputs, ...rest } = step;
          return {
            capability: task,
            inputs: withInputs || {},
            ...rest
          };
        }
        return step;
      });
    }
    
    // More conversions would go here
    
    return result;
  }

  /**
   * Example conversion from v2 to v1 format (placeholder)
   */
  private convertV2toV1(content: any): any {
    // Clone to avoid modifying original
    const result = JSON.parse(JSON.stringify(content));
    
    // Update version marker
    result.enact = '1.0.0';
    
    // Example conversion: rename 'capability' to 'task' in flow steps
    if (result.flow?.steps) {
      result.flow.steps = result.flow.steps.map((step: any) => {
        if (step.capability && !step.task) {
          const { capability, inputs, ...rest } = step;
          return {
            task: capability,
            with: inputs || {},
            ...rest
          };
        }
        return step;
      });
    }
    
    // More conversions would go here
    
    return result;
  }

  /**
   * Normalize a capability to ensure it matches the expected format
   * @param content The raw capability content
   * @param formatVersion Protocol format version
   * @returns Normalized CapabilityWrapper
   */
  private normalizeCapabilityWrapper(content: any, formatVersion: string): CapabilityWrapper {
    try {
      // Get protocol details, handling potential structure differences
      const protocolDetails = content.protocolDetails || content;
      
      // Apply different normalizations based on format version
      if (formatVersion.startsWith('1.')) {
        return this.normalizeV1CapabilityWrapper(content, protocolDetails);
      } else if (formatVersion.startsWith('2.')) {
        return this.normalizeV2CapabilityWrapper(content, protocolDetails);
      } else {
        // Default to v1 format for unknown versions
        logger.warn(`Unknown format version ${formatVersion}, defaulting to v1 normalization`);
        return this.normalizeV1CapabilityWrapper(content, protocolDetails);
      }
    } catch (error) {
      logger.error('Error normalizing capability:', error);
      throw new Error(`Failed to normalize capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize capability for v1.x format
   */
  private normalizeV1CapabilityWrapper(content: any, protocolDetails: any): CapabilityWrapper {
    // Normalize flow steps to use 'capability' instead of 'task'
    let flowSteps: FlowStep[] = [];
    if (protocolDetails.flow?.steps) {
      flowSteps = protocolDetails.flow.steps.map((step: any) => {
        if (step.task && !step.capability) {
          return {
            capability: step.task,
            inputs: step.with || step.inputs || {},
            dependencies: step.dependencies || []
          };
        }
        return {
          capability: step.capability || '',
          inputs: step.inputs || {},
          dependencies: step.dependencies || []
        };
      });
    }
    
    // Normalize inputs and outputs to match JSON Schema format
    const inputs = schemaAdapter.normalizeSchemaField(protocolDetails.inputs);
    const outputs = schemaAdapter.normalizeSchemaField(protocolDetails.outputs);
    
    // Normalize environment configuration
    let normalizedEnv = undefined;
    if (protocolDetails.env) {
      const env = protocolDetails.env;
      normalizedEnv = {
        vars: env.vars || {},
        resources: env.resources || {}
      };
      
      // Convert old env.vars array format to new record format if needed
      if (Array.isArray(normalizedEnv.vars)) {
        const varsRecord: Record<string, any> = {};
        (normalizedEnv.vars as any[]).forEach(v => {
          if (v.name) {
            varsRecord[v.name] = {
              type: v.schema?.type || "string",
              description: v.description || "",
              ...(v.schema?.default !== undefined && { default: v.schema.default })
            };
          }
        });
        normalizedEnv.vars = varsRecord;
      }
    }
    

    
    // Create normalized wrapper
    return {
      id: content.id || protocolDetails.id || '',
      name: content.name || protocolDetails.id || '',
      description: content.description || protocolDetails.description || '',
      version: content.version || protocolDetails.version || '1.0.0',
      teams: content.teams || [],
      isAtomic: true,
      protocolDetails: {
        enact: protocolDetails.enact || "1.0.0",
        id: protocolDetails.id || '',
        description: protocolDetails.description || '',
        version: protocolDetails.version || '1.0.0',
        type: protocolDetails.type || 'atomic',
        authors: protocolDetails.authors || [],
        doc: protocolDetails.doc || undefined,
        inputs: inputs,
        dependencies: protocolDetails.dependencies || undefined,
        tasks: protocolDetails.tasks || [],
        imports: protocolDetails.imports || [],
        flow: { steps: flowSteps },
        outputs: outputs,
        env: normalizedEnv
      }
    };
  }

  /**
   * Normalize capability for v2.x format (placeholder for future versions)
   */
  private normalizeV2CapabilityWrapper(content: any, protocolDetails: any): CapabilityWrapper {
    // This would implement v2 specific normalization
    // For now, just use v1 normalization as a base
    const v1Normalized = this.normalizeV1CapabilityWrapper(content, protocolDetails);
    
    // Make v2 specific adjustments here
    // For example, if v2 renamed some fields or added required ones
    
    return v1Normalized;
  }
  
  /**
   * Create a default capability when content cannot be parsed
   * @param cap Basic capability information
   * @returns Default CapabilityWrapper
   */
  createDefaultCapability(cap: any): CapabilityWrapper {
    return {
      id: cap.id || 'unknown-id',
      name: cap.id || 'Unnamed Task',
      description: cap.description || '',
      version: cap.version || '1.0.0',
      teams: [],
      isAtomic: true,
      protocolDetails: {
        enact: '1.0.0',
        id: cap.id || 'unnamed',
        description: cap.description || '',
        version: cap.version || '1.0.0',
        type: 'atomic',
        authors: [],
        inputs: {
          type: "object",
          properties: {},
          required: []
        },
        tasks: [],
        flow: { steps: [] },
        outputs: {
          type: "object",
          properties: {},
          required: []
        }
      }
    };
  }
}