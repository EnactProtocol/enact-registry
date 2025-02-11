// src/controllers/yaml.controller.ts
import { Context } from 'elysia';
import { parse } from 'yaml';
import { OpenAIService } from '../services/openai.service';
import type { Capability, ProcessedCapability } from '../types/yaml.types';
import { DatabaseService } from '../services/db.service';
import logger from '../logger';

interface FileUpload {
  file: Blob & {
    name: string;
    type: string;
    size: number;
  };
}

export class YamlController {
  openAIService: OpenAIService;
  dbService: DatabaseService;

  constructor() {
    this.openAIService = new OpenAIService();
    this.dbService = new DatabaseService();
  }
  async processYaml(context: Context<{ body: { file: string } }>) {
    try {
        logger.info('Received YAML content');
        
        const content = context.body.file;
        if (!content) {
            throw new Error('No YAML content provided');
        }

        // Parse YAML content
        const parsedYaml = parse(content) as Capability;
        logger.info('Successfully parsed YAML content');
        
        // Validate required fields
        if (!parsedYaml.id || !parsedYaml.description) {
            throw new Error('Missing required fields: id and description are required');
        }

        // Generate embedding for search
        const embedding = await this.openAIService.generateEmbedding(
            parsedYaml.description
        );
        logger.info('Generated embedding for capability');

        // Process and store capability
        const processedCapability: ProcessedCapability = {
            ...parsedYaml,
            embedding
        };

        await this.dbService.storeCapability(processedCapability, content);
        logger.info('Stored capability in database');

        return {
            message: 'Capability processed successfully',
            capability: processedCapability
        };
    } catch (error) {
        logger.error('Error processing YAML:', error);
        if (error instanceof Error) {
            logger.error('Error stack:', error.stack);
            throw new Error(`Failed to process capability YAML file: ${error.message}`);
        }
        throw new Error('Failed to process capability YAML file');
    }
}
}