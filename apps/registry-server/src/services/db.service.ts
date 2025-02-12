// src/services/db.service.ts
import Database from 'bun:sqlite';
import { ProcessedCapability } from '../types/yaml.types';

export class DatabaseService {
  private db: Database;

  constructor() {
    this.db = new Database('capabilities.db');
    this.initializeDatabase();
  }

  private initializeDatabase() {
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

  private cosineSimilarity(a: number[], b: number[]): number {
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
      // Update query to include content field
      const capabilities = this.db.prepare(`
        SELECT id, description, version, type, content
        FROM capabilities
      `).all();
      
      return capabilities.map((cap: any) => {
        try {
          // Parse the stored content if it exists
          const content = cap.content ? JSON.parse(cap.content) : null;
          
          return {
            id: cap.id,
            description: cap.description,
            version: cap.version || '1.0.0',
            type: cap.type || 'atomic',
            protocolDetails: content ? {
              enact: content.enact || '1.0.0',
              id: content.id || cap.id,
              name: content.name || cap.id,
              description: content.description || cap.description,
              version: content.version || cap.version || '1.0.0',
              authors: content.authors || [],
              inputs: content.inputs || {},
              tasks: content.tasks || [],
              flow: content.flow || { steps: [] },
              outputs: content.outputs || { type: 'object', properties: {} }
            } : {
              enact: '1.0.0',
              id: cap.id,
              name: cap.id,
              description: cap.description,
              version: cap.version || '1.0.0',
              authors: [],
              inputs: {},
              tasks: [],
              flow: { steps: [] },
              outputs: { type: 'object', properties: {} }
            }
          };
        } catch (parseError) {
          console.error(`Error parsing content for capability ${cap.id}:`, parseError);
          // Return a safely structured object even if parsing fails
          return {
            id: cap.id,
            description: cap.description,
            version: cap.version || '1.0.0',
            type: cap.type || 'atomic',
            protocolDetails: {
              enact: '1.0.0',
              id: cap.id,
              name: cap.id,
              description: cap.description,
              version: cap.version || '1.0.0',
              authors: [],
              inputs: {},
              tasks: [],
              flow: { steps: [] },
              outputs: { type: 'object', properties: {} }
            }
          };
        }
      });
    } catch (error) {
      console.error('Error getting capabilities:', error);
      return [];
    }
  }
}