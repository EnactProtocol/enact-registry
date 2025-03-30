// FILE: src/controllers/registry.controller.ts
import { Context } from 'elysia';
import { OpenAIService } from '../services/openai.service';
import { DatabaseService } from '../services/db.service';
import { ProcessedCapability } from '../types/yaml.types';
import { schemaAdapter } from '../services/schema-adapter.service';
import logger from '../logger';

/**
 * Controller for registry-wide operations including listing,
 * searching, and management of multiple capabilities
 */
export class RegistryController {
  private openAIService: OpenAIService;
  private dbService: DatabaseService;

  constructor() {
    this.openAIService = new OpenAIService();
    this.dbService = new DatabaseService();
  }

  /**
   * Get all capabilities in the registry
   * @param context Request context with optional format
   * @returns Array of capabilities
   */
  async getAllCapabilities(context: Context<{ query?: { format?: string } }>) {
    try {
      const { format } = context.query || {};
      
      logger.info('Retrieving all capabilities');
      const capabilities = await this.dbService.getAllCapabilities(format);
      
      return {
        count: capabilities.length,
        capabilities
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving capabilities");
      throw new Error("Failed to retrieve capabilities");
    }
  }

  /**
   * Search for capabilities using semantic search
   * @param context Request context with search parameters
   * @returns Array of matching capabilities
   */
  async searchCapabilities(context: Context<{ 
    body: { 
      query: string; 
      format?: string;
      limit?: number;
    } 
  }>) {
    try {
      const { query, format, limit = 10 } = context.body;
      
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid search query');
      }
      
      logger.info(`Searching capabilities with query: "${query}"`);
      
      // Generate embedding for the search query
      const embedding = await this.openAIService.generateEmbedding(query);
      
      // Search with the embedding
      const results = await this.dbService.findSimilarCapabilities(embedding, limit);
      
      // If specific output format is requested, convert all results
      if (format) {
        logger.info(`Converting search results to format: ${format}`);
        const convertedResults = [];
        
        for (const result of results) {
          try {
            // Get capability with conversion
            const capability = await this.dbService.getCapabilityById(result.id, format);
            if (capability) {
              convertedResults.push({
                ...result,
                content: capability
              });
            }
          } catch (error) {
            logger.error(`Error converting capability ${result.id} to format ${format}: ${error}`);
            // Include the original result if conversion fails
            convertedResults.push(result);
          }
        }
        
        return {
          count: convertedResults.length,
          query,
          format,
          results: convertedResults
        };
      }
      
      return {
        count: results.length,
        query,
        results
      };
    } catch (error) {
      logger.error({ error }, 'Error searching capabilities');
      throw new Error(`Failed to search capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a capability from the registry
   * @param context Request context with capability ID
   * @returns Success message
   */
  async deleteCapability(context: Context<{ params: { id: string } }>) {
    try {
      const { id } = context.params;
      
      if (!id) {
        throw new Error("Capability ID is required");
      }
      
      logger.info(`Deleting capability: ${id}`);
      await this.dbService.deleteCapability(id);
      logger.info(`Capability ${id} deleted successfully`);
      
      return { 
        message: "Capability deleted successfully",
        id
      };
    } catch (error) {
      logger.error({ error, id: context.params.id }, "Error deleting capability");
      throw new Error(`Failed to delete capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get registry statistics
   * @returns Registry statistics
   */
  async getStatistics() {
    try {
      logger.info('Retrieving registry statistics');
      
      // Get all capabilities
      const capabilities = await this.dbService.getAllCapabilities();
      
      // Count by type
      const typeCount = capabilities.reduce((acc, cap) => {
        const type =  'atomic'
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Count by version
      const versionCount = capabilities.reduce((acc, cap) => {
        const version = cap.version || 'unknown';
        acc[version] = (acc[version] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Get version distribution
      const formatVersions = await this.dbService.getDistinctFormatVersions();
      
      return {
        totalCapabilities: capabilities.length,
        types: typeCount,
        versions: versionCount,
        formatVersions,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving registry statistics");
      throw new Error("Failed to retrieve registry statistics");
    }
  }

  /**
   * Batch import capabilities
   * @param context Request context with capabilities to import
   * @returns Import results
   */
  async importCapabilities(context: Context<{ 
    body: { 
      capabilities: Array<{ 
        id: string; 
        content: string;
        format?: string;
      }>;
      options?: {
        strictValidation?: boolean;
        skipExisting?: boolean;
      }
    } 
  }>) {
    try {
      const { capabilities, options = {} } = context.body;
      
      if (!Array.isArray(capabilities) || capabilities.length === 0) {
        throw new Error('No capabilities provided for import');
      }
      
      logger.info(`Starting batch import of ${capabilities.length} capabilities`);
      
      const results = {
        total: capabilities.length,
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [] as Array<{ id: string; error: string }>
      };
      
      // Process each capability
      for (const item of capabilities) {
        try {
          // Check if capability exists and should be skipped
          if (options.skipExisting) {
            const existing = await this.dbService.getCapabilityById(item.id);
            if (existing) {
              logger.info(`Skipping existing capability: ${item.id}`);
              results.skipped++;
              continue;
            }
          }
          
          // Parse content
          let parsedContent;
          try {
            if (typeof item.content === 'string') {
              // Try parsing as JSON first
              if (item.content.trim().startsWith('{') || item.content.trim().startsWith('[')) {
                try {
                  parsedContent = JSON.parse(item.content);
                } catch (jsonError) {
                  // If that fails, try YAML
                  const { parse } = await import('yaml');
                  parsedContent = parse(item.content);
                }
              } else {
                // Try YAML
                const { parse } = await import('yaml');
                parsedContent = parse(item.content);
              }
            } else {
              // If content is already an object
              parsedContent = item.content;
            }
          } catch (parseError) {
            throw new Error(`Failed to parse capability content: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          }
          
          // Ensure ID matches
          parsedContent.id = item.id;
          
          // Get protocol version
          const protocolVersion = item.format || parsedContent.enact || '1.0.0';
          
          // Validate
          const validationResult = schemaAdapter.validateDocument(parsedContent, {
            strictMode: options.strictValidation || false,
            version: protocolVersion
          });
          
          if (!validationResult.valid && options.strictValidation) {
            throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
          }
          
          // Generate embedding
          const embedding = await this.openAIService.generateEmbedding(
            parsedContent.description || ''
          );
          
          // Normalize
          const normalizedCapability = schemaAdapter.normalizeToCapabilityWrapper(parsedContent);
          
          // Create processed capability
          const processedCapability: ProcessedCapability = {
            ...(normalizedCapability.protocolDetails as any),
            embedding
          };
          
          // Store capability
          const contentToStore = typeof item.content === 'string' 
            ? item.content 
            : JSON.stringify(parsedContent, null, 2);
            
          await this.dbService.storeCapability(processedCapability, contentToStore, protocolVersion);
          
          logger.info(`Successfully imported capability: ${item.id}`);
          results.successful++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Error importing capability ${item.id}: ${errorMessage}`);
          
          results.failed++;
          results.errors.push({
            id: item.id,
            error: errorMessage
          });
        }
      }
      
      logger.info(`Batch import completed: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`);
      
      return results;
    } catch (error) {
      logger.error({ error }, 'Error during batch import');
      throw new Error(`Failed to import capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check the health of the registry
   * @returns Health status
   */
  async checkHealth() {
    try {
      // Check database connection
      const dbStatus = await this.dbService.checkHealth();
      
      // Check schema registry
      const registeredSchemas = schemaAdapter.getRegisteredSchemaVersions();
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        components: {
          database: dbStatus,
          schemaRegistry: {
            status: registeredSchemas.length > 0 ? 'ok' : 'warning',
            registeredSchemas
          }
        }
      };
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}