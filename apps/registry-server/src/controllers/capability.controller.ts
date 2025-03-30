// FILE: src/controllers/capability.controller.ts
import { Context } from 'elysia';
import { parse, stringify } from 'yaml';
import { OpenAIService } from '../services/openai.service';
import { ProcessedCapability } from '../types/yaml.types';
import { EnactDocument } from '@enact/types';
import { DatabaseService } from '../services/db.service';
import { schemaAdapter } from '../services/schema-adapter.service';
import logger from '../logger';

/**
 * Controller for handling individual capability operations
 * including parsing, validation, format conversion, and storage
 */
export class CapabilityController {
  private openAIService: OpenAIService;
  private dbService: DatabaseService;

  constructor() {
    this.openAIService = new OpenAIService();
    this.dbService = new DatabaseService();
  }
  
  /**
   * Process and store a capability definition
   * @param context Request context with capability content
   * @returns Processed capability
   */
  async createCapability(context: Context<{ 
    body: { 
      file: string; 
      options?: { 
        strictValidation?: boolean;
        format?: string;
      } 
    } 
  }>) {
    try {
      logger.info('Processing new capability');
      
      const { file, options = {} } = context.body;
      if (!file) {
        throw new Error('No capability content provided');
      }

      // Parse content (handles both YAML and JSON)
      const parsedContent = this.parseContent(file);
      logger.info('Successfully parsed capability content');
      
      // Get protocol version from document or use specified format
      const protocolVersion = options.format || parsedContent.enact || '1.0.0';
      
      // Validate against schema with flexible validation
      const validationResult = schemaAdapter.validateDocument(parsedContent, {
        strictMode: options.strictValidation || false,
        version: protocolVersion
      });
      
      // Log warnings but don't fail on them
      if (validationResult.warnings.length > 0) {
        logger.warn(`Schema validation warnings: ${validationResult.warnings.join(', ')}`);
      }
      
      // Fail on errors if strict validation is enabled
      if (!validationResult.valid && options.strictValidation) {
        const errorMessage = `Invalid capability: ${validationResult.errors.join(', ')}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Generate embedding for search
      const embedding = await this.openAIService.generateEmbedding(
        parsedContent.description || ''
      );
      logger.info('Generated embedding for capability');

      // Normalize to ensure we have all required fields
      const normalizedCapability = schemaAdapter.normalizeToCapabilityWrapper(parsedContent);
      
      // Process and store capability
      const processedCapability: ProcessedCapability = {
        ...(normalizedCapability.protocolDetails as EnactDocument),
        embedding
      };

      // Convert to string for storage (maintain original format)
      const contentToStore = this.isYamlContent(file) 
        ? stringify(parsedContent)
        : JSON.stringify(parsedContent, null, 2);

      // Store with format version information
      await this.dbService.storeCapability(processedCapability, contentToStore, protocolVersion);
      logger.info(`Stored capability ${processedCapability.id} with format version ${protocolVersion}`);

      // Return successful response without embedding for security
      const { embedding: _, ...capabilityWithoutEmbedding } = processedCapability;
      
      return {
        message: 'Capability processed successfully',
        capability: capabilityWithoutEmbedding,
        warnings: validationResult.warnings
      };
    } catch (error) {
      logger.error({ error }, 'Error processing capability');
      if (error instanceof Error) {
        logger.error(`Error stack: ${error.stack}`);
        throw new Error(`Failed to process capability: ${error.message}`);
      }
      throw new Error('Failed to process capability');
    }
  }

  /**
   * Get a capability by its ID
   * @param context Request context with capability ID and format option
   * @returns The capability or error if not found
   */
  async getCapability(context: Context<{ 
    params: { id: string }; 
    query?: { format?: string; raw?: string } 
  }>) {
    try {
      const { id } = context.params;
      const format = context.query?.format;
      const returnRaw = context.query?.raw === 'true';
      
      if (!id) {
        throw new Error('Capability ID is required');
      }
      
      // Get capability with optional format conversion
      const capability = await this.dbService.getCapabilityById(id, format);
      
      if (!capability) {
        throw new Error(`Capability not found: ${id}`);
      }
      
      // For raw requests, just return the capability content as is
      if (returnRaw) {
        // Determine content type for response headers
        const contentType = this.isYamlContent(capability) 
          ? 'application/x-yaml' 
          : 'application/json';
        
        // Return raw content with appropriate content type
        return new Response(capability, {
          headers: { 'Content-Type': contentType }
        });
      }
      
      // Otherwise return as part of JSON response
      return {
        message: 'Capability retrieved successfully',
        id,
        content: capability,
        format: format || this.detectFormatVersion(capability)
      };
    } catch (error) {
      logger.error({ error, id: context.params.id }, 'Error retrieving capability');
      throw new Error(`Failed to retrieve capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Update an existing capability
   * @param context Request context with capability ID and updated content
   * @returns Updated capability
   */
  async updateCapability(context: Context<{ 
    params: { id: string };
    body: { 
      file: string; 
      targetFormat?: string;
      options?: { 
        strictValidation?: boolean;
        preserveMetadata?: boolean;
      } 
    } 
  }>) {
    try {
      const { id } = context.params;
      const { file, targetFormat, options = {} } = context.body;
      
      if (!id) {
        throw new Error('Capability ID is required');
      }
      
      if (!file) {
        throw new Error('Updated capability content is required');
      }
      
      // First check if the capability exists
      const existingCapabilityRaw = await this.dbService.getCapabilityById(id);
      
      if (!existingCapabilityRaw) {
        throw new Error(`Capability not found: ${id}`);
      }
      
      // Parse the updated content
      const updatedContent = this.parseContent(file);
      
      // Parse existing capability
      const existingCapability = this.parseContent(existingCapabilityRaw);
      
      // Get source and target formats
      const sourceFormat = existingCapability.enact || '1.0.0';
      const finalFormat = targetFormat || sourceFormat;
      
      // If preserving metadata is requested, merge existing metadata with updates
      let mergedContent = updatedContent;
      if (options.preserveMetadata) {
        // Create a new object with existing metadata and updated content
        mergedContent = {
          ...existingCapability,
          ...updatedContent,
          // Preserve these fields from the existing capability
          id: existingCapability.id,
          enact: finalFormat,
          version: updatedContent.version || existingCapability.version
        };
      }
      
      // Ensure ID is correct
      mergedContent.id = id;
      
      // If target format is different, convert the merged content
      const formattedContent = finalFormat !== sourceFormat 
        ? schemaAdapter.transformDocument(mergedContent, sourceFormat, finalFormat) 
        : mergedContent;
      
      // Validate the updated content
      const validationResult = schemaAdapter.validateDocument(formattedContent, {
        strictMode: options.strictValidation || false,
        version: finalFormat
      });
      
      // Log warnings
      if (validationResult.warnings.length > 0) {
        logger.warn(`Schema validation warnings for updated capability: ${validationResult.warnings.join(', ')}`);
      }
      
      // Fail on errors if strict validation is enabled
      if (!validationResult.valid && options.strictValidation) {
        const errorMessage = `Invalid updated capability: ${validationResult.errors.join(', ')}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      // Generate embedding
      const embedding = await this.openAIService.generateEmbedding(
        formattedContent.description || ''
      );
      
      // Normalize to ensure we have all required fields
      const normalizedCapability = schemaAdapter.normalizeToCapabilityWrapper(formattedContent);
      
      // Process and store updated capability
      const processedCapability: ProcessedCapability = {
        ...(normalizedCapability.protocolDetails as EnactDocument),
        embedding
      };
      
      // Convert to string for storage (maintain original format)
      const contentToStore = this.isYamlContent(file) 
        ? stringify(formattedContent)
        : JSON.stringify(formattedContent, null, 2);
      
      // Store with the target format version
      await this.dbService.storeCapability(processedCapability, contentToStore, finalFormat);
      
      logger.info(`Updated capability ${id} with format version ${finalFormat}`);
      
      // Return successful response
      const { embedding: _, ...capabilityWithoutEmbedding } = processedCapability;
      
      return {
        message: 'Capability updated successfully',
        capability: capabilityWithoutEmbedding,
        warnings: validationResult.warnings,
        format: finalFormat
      };
    } catch (error) {
      logger.error({ error, id: context.params.id }, 'Error updating capability');
      throw new Error(`Failed to update capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert a capability to a different format without storing it
   * @param context Request context with capability ID and target format
   * @returns Converted capability
   */
  async convertCapability(context: Context<{ 
    params: { id: string };
    body: { 
      targetFormat: string;
      preserveMetadata?: boolean;
    } 
  }>) {
    try {
      const { id } = context.params;
      const { targetFormat, preserveMetadata = true } = context.body;
      
      if (!id) {
        throw new Error('Capability ID is required');
      }
      
      if (!targetFormat) {
        throw new Error('Target format is required');
      }
      
      const existingCapabilityRaw = await this.dbService.getCapabilityById(id);
      
      if (!existingCapabilityRaw) {
        throw new Error(`Capability not found: ${id}`);
      }
      
      const existingCapability = this.parseContent(existingCapabilityRaw);
      
      const sourceFormat = existingCapability.enact || '1.0.0';
      
      if (sourceFormat === targetFormat) {
        return {
          message: 'No conversion needed (source and target formats are the same)',
          capability: existingCapability,
          sourceFormat,
          targetFormat
        };
      }
      
      logger.info(`Converting capability ${id} from ${sourceFormat} to ${targetFormat}`);
      const convertedCapability = schemaAdapter.transformDocument(
        existingCapability, 
        sourceFormat, 
        targetFormat
      );
      
      convertedCapability.id = id;
      
      const result = {
        message: 'Capability converted successfully',
        capability: convertedCapability,
        sourceFormat,
        targetFormat
      };
      
      return result;
    } catch (error) {
      logger.error({ error, id: context.params.id }, 'Error converting capability');
      throw new Error(`Failed to convert capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a capability without storing it
   * @param context Request context with capability content and validation options
   * @returns Validation result
   */
  async validateCapability(context: Context<{ 
    body: { 
      file: string; 
      options?: { 
        strictValidation?: boolean;
        format?: string;
      } 
    } 
  }>) {
    try {
      logger.info('Validating capability');
      
      const { file, options = {} } = context.body;
      if (!file) {
        throw new Error('No capability content provided');
      }

      const parsedContent = this.parseContent(file);
      
      const protocolVersion = options.format || parsedContent.enact || '1.0.0';
      
      const validationResult = schemaAdapter.validateDocument(parsedContent, {
        strictMode: options.strictValidation || false,
        version: protocolVersion
      });
      
      return {
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        format: protocolVersion
      };
    } catch (error) {
      logger.error({ error }, 'Error validating capability');
      throw new Error(`Failed to validate capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse content string to object, auto-detecting format (YAML or JSON)
   * @param content The content string to parse
   * @returns Parsed object
   */
  private parseContent(content: string): any {
    if (!content) {
      throw new Error('Empty content provided');
    }
    
    // Try parsing as JSON first
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        return JSON.parse(content);
      } catch (jsonError) {
        logger.debug('Failed to parse as JSON, trying YAML');
      }
    }
    
    // Otherwise try YAML
    try {
      return parse(content);
    } catch (yamlError) {
      throw new Error('Content is neither valid JSON nor YAML');
    }
  }

  /**
   * Check if content is in YAML format
   * @param content The content to check
   * @returns Whether content is YAML
   */
  private isYamlContent(content: string): boolean {
    // Simple heuristic: if it doesn't start with { or [, it's probably YAML
    return !(content.trim().startsWith('{') || content.trim().startsWith('['));
  }
  
  /**
   * Detect format version from capability content
   * @param content The capability content
   * @returns Detected format version
   */
  private detectFormatVersion(content: string): string {
    try {
      const parsed = this.parseContent(content);
      return parsed.enact || '1.0.0';
    } catch (error) {
      return '1.0.0'; // Default if can't detect
    }
  }
}