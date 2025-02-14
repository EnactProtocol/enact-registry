// src/services/db.service.ts
import Database from 'bun:sqlite';
import { ProcessedCapability } from '../types/yaml.types';

export class DatabaseService {
  db: Database;

  constructor() {
    this.db = new Database('capabilities.db');
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Create capabilities table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS capabilities (
        id TEXT PRIMARY KEY,
        description TEXT,
        version TEXT,
        type TEXT,
        content TEXT,  -- Full YAML content
        embedding TEXT -- Vector embedding stored as JSON string
      )
    `);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async storeCapability(capability: ProcessedCapability, yamlContent: string) {
    console.log('Storing capability:', capability,"content",yamlContent);
    const { id, description, version, type, embedding } = capability;
    
    // Convert embedding array to JSON string
    const embeddingJson = JSON.stringify(embedding);
    
    // Store main capability data
    this.db.prepare(`
      INSERT OR REPLACE INTO capabilities 
      (id, description, version, type, content, embedding)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, description, version, type, yamlContent, embeddingJson);
  }

  async findSimilarCapabilities(queryEmbedding: number[], limit = 5) {
    // Get all capabilities
    const capabilities = this.db.prepare(`
      SELECT id, description, version, type, embedding
      FROM capabilities
    `).all();

    // Calculate similarities
    const withSimilarity = capabilities.map((cap : any) => ({
      ...cap,
      similarity: this.cosineSimilarity(
        queryEmbedding, 
        JSON.parse(cap.embedding as string)
      )
    }));

    // Sort by similarity and return top results
    return withSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({ embedding, ...rest }) => rest); // Remove embedding from response
  }

  async getCapabilityById(id: string) {
    const capability: any = this.db.prepare(`
      SELECT * FROM capabilities WHERE id = ?
    `).get(id);

    if (capability) {
      return {
        ...capability,
        embedding: JSON.parse(capability.embedding as string)
      }.content;
    }
    return null;
  }
  async deleteCapability(id: string) {
    this.db.prepare(`
      DELETE FROM capabilities
      WHERE id = ?
    `).run(id);
  }

  async getAllCapabilities() {
    try {
      const capabilities = this.db.prepare(`
        SELECT id, description, version, type, content
        FROM capabilities
      `).all();
      
      return capabilities.map((cap: any) => {

        try {
          // Parse the stored JSON content
          console.log("cap",cap);
          const content = cap.content ? JSON.parse(cap.content) : null;
          
          if (!content) {
            return this.createDefaultCapability(cap);
          }

          // Return the complete stored structure
          return {
            id: content.id,
            name: content.name,
            description: content.description,
            version: content.version,
            teams: content.teams || [],
            isAtomic: content.type === 'atomic',
            protocolDetails: {
              enact: content.protocolDetails.enact,
              id: content.protocolDetails.id,
              name: content.protocolDetails.name,
              description: content.protocolDetails.description,
              version: content.protocolDetails.version,
              authors: content.protocolDetails.authors,
              inputs: content.protocolDetails.inputs,
              tasks: content.protocolDetails.tasks,
              flow: content.protocolDetails.flow,
              outputs: content.protocolDetails.outputs
            }
          };
        } catch (parseError) {
          console.error(`Error parsing content for capability ${cap.id}:`, parseError);
          return this.createDefaultCapability(cap);
        }
      });
    } catch (error) {
      console.error('Error getting capabilities:', error);
      return [];
    }
  }

  createDefaultCapability(cap: any) {
    return {
      id: cap.id || 0,
      name: cap.id || 'Unnamed Task',
      description: cap.description || '',
      version: cap.version || '1.0.0',
      teams: [],
      isAtomic: true,
      protocolDetails: {
        enact: '1.0.0',
        id: cap.id || 'unnamed',
        name: cap.id || 'Unnamed Task',
        description: cap.description || '',
        version: cap.version || '1.0.0',
        authors: [],
        inputs: {},
        tasks: [],
        flow: { steps: [] },
        outputs: {}
      }
    };
  } 
}