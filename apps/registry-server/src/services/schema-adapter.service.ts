// FILE: src/services/schema-adapter.service.ts
import { CapabilityWrapper } from '@enact/types';
import logger from '../logger';

/**
 * Schema mapping for versions
 */
export interface SchemaMapping {
  version: string;
  schema: any;
}

/**
 * Service for dynamically adapting between different schema versions
 */
export class SchemaAdapterService {
  private schemas: Map<string, any> = new Map();
  
  /**
   * Initialize the adapter with available schemas
   * @param schemaMappings Array of schema mappings
   */
  constructor(schemaMappings: SchemaMapping[] = []) {
    // Register schemas
    schemaMappings.forEach(mapping => {
      this.registerSchema(mapping.version, mapping.schema);
    });
    
    // Register default schema if not provided
    if (!this.schemas.has('1.0.0')) {
      this.registerDefaultSchema();
    }
  }
  
  /**
   * Register a schema for a specific version
   * @param version Schema version
   * @param schema Schema definition
   */
  registerSchema(version: string, schema: any): void {
    this.schemas.set(version, schema);
    logger.info(`Registered schema for version ${version}`);
  }
  
  /**
   * Register the default schema (v1.0.0)
   */
  private registerDefaultSchema(): void {
    // Default Enact v1.0.0 schema
    const defaultSchema = {
      type: "object",
      required: ["enact", "id", "description", "version", "type", "authors"],
      properties: {
        // Minimal schema definition
        enact: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
        id: { type: "string" },
        description: { type: "string" },
        version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
        type: { type: "string" },
        authors: { 
          type: "array", 
          items: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              url: { type: "string" }
            }
          }
        }
      }
    };
    
    this.registerSchema('1.0.0', defaultSchema);
  }
  
  /**
   * Get the schema for a specific version
   * @param version Schema version
   * @returns Schema or undefined if not found
   */
  getSchema(version: string): any {
    // Extract major.minor version without patch
    const majorMinor = version.split('.').slice(0, 2).join('.');
    
    // Try exact match first
    if (this.schemas.has(version)) {
      return this.schemas.get(version);
    }
    
    // Try major.minor match
    for (const [schemaVersion, schema] of this.schemas.entries()) {
      if (schemaVersion.startsWith(majorMinor)) {
        logger.info(`Using schema version ${schemaVersion} for requested version ${version}`);
        return schema;
      }
    }
    
    // Fall back to latest version
    logger.warn(`No schema found for version ${version}, using default schema`);
    return this.schemas.get('1.0.0');
  }
  
  /**
   * Validate a document against its schema version
   * @param document Document to validate
   * @param options Validation options
   * @returns Validation result
   */
  validateDocument(
    document: any, 
    options: { 
      strictMode?: boolean; 
      version?: string;
    } = {}
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const version = options.version || document.enact || '1.0.0';
    const schema = this.getSchema(version);
    
    if (!schema) {
      return {
        valid: false,
        errors: [`No schema found for version ${version}`],
        warnings: []
      };
    }
    
    return this.validateAgainstSchema(document, schema, options.strictMode);
  }
  
  /**
   * Validate a document against a specific schema
   * @param document Document to validate
   * @param schema Schema to validate against
   * @param strictMode Whether to use strict validation
   * @returns Validation result
   */
  private validateAgainstSchema(
    document: any, 
    schema: any,
    strictMode: boolean = false
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (document[field] === undefined) {
          const msg = `Missing required field: ${field}`;
          strictMode ? errors.push(msg) : warnings.push(msg);
        }
      }
    }
    
    // Check property constraints
    if (schema.properties) {
      for (const [prop, propSchema] of Object.entries<any>(schema.properties)) {
        if (document[prop] !== undefined) {
          // Type validation
          if (propSchema.type) {
            const typeValid = this.validateType(document[prop], propSchema.type);
            if (!typeValid) {
              errors.push(`Invalid type for property ${prop}. Expected ${propSchema.type}`);
            }
          }
          
          // Pattern validation
          if (propSchema.pattern && typeof document[prop] === 'string') {
            const regex = new RegExp(propSchema.pattern);
            if (!regex.test(document[prop])) {
              errors.push(`Invalid format for property ${prop}. Does not match pattern ${propSchema.pattern}`);
            }
          }
          
          // Enum validation
          if (propSchema.enum && Array.isArray(propSchema.enum)) {
            if (!propSchema.enum.includes(document[prop])) {
              errors.push(`Invalid value for property ${prop}. Must be one of: ${propSchema.enum.join(', ')}`);
            }
          }
          
          // Nested object validation
          if (propSchema.properties && typeof document[prop] === 'object' && !Array.isArray(document[prop])) {
            const nestedResult = this.validateAgainstSchema(
              document[prop], 
              { properties: propSchema.properties, required: propSchema.required },
              strictMode
            );
            errors.push(...nestedResult.errors.map(e => `${prop}.${e}`));
            warnings.push(...nestedResult.warnings.map(w => `${prop}.${w}`));
          }
          
          // Array validation
          if (propSchema.items && Array.isArray(document[prop])) {
            document[prop].forEach((item: any, index: number) => {
              const itemResult = this.validateAgainstSchema(
                item, 
                { properties: propSchema.items.properties, required: propSchema.items.required },
                strictMode
              );
              errors.push(...itemResult.errors.map(e => `${prop}[${index}].${e}`));
              warnings.push(...itemResult.warnings.map(w => `${prop}[${index}].${w}`));
            });
          }
        }
      }
    }
    
    // Check if there are any unknown additional properties
    if (schema.additionalProperties === false) {
      const knownProps = Object.keys(schema.properties || {});
      const docProps = Object.keys(document);
      
      for (const prop of docProps) {
        if (!knownProps.includes(prop) && !prop.startsWith('x-')) {
          warnings.push(`Unknown property: ${prop}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate a value against an expected type
   * @param value Value to validate
   * @param expectedType Expected type
   * @returns Whether the type is valid
   */
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
      case 'integer':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return true; // Unknown type, assume valid
    }
  }
  
  /**
   * Apply a transformation to convert a document from one format to another
   * @param document Source document
   * @param fromVersion Source version
   * @param toVersion Target version
   * @returns Transformed document
   */
  transformDocument(document: any, fromVersion: string, toVersion: string): any {
    if (fromVersion === toVersion) {
      return document; // No transformation needed
    }
    
    // Copy document to avoid modifying the original
    const result = JSON.parse(JSON.stringify(document));
    
    // Apply transformations
    if (this.isVersionBefore(fromVersion, '1.0.0') && this.isVersionAtLeast(toVersion, '1.0.0')) {
      // Transform from v1 to v2
      this.transformV1toV2(result);
    } else if (this.isVersionAtLeast(fromVersion, '1.0.0') && this.isVersionBefore(toVersion, '1.0.0')) {
      // Transform from v2 to v1
      this.transformV2toV1(result);
    }
    
    // Update version
    result.enact = toVersion;
    
    return result;
  }
  
  /**
   * Convert document from v1 to v2 format
   */
  private transformV1toV2(document: any): void {
    // Example transformation: rename 'task' to 'capability' in flow steps
    if (document.flow?.steps) {
      document.flow.steps = document.flow.steps.map((step: any) => {
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
    
    // Add more v1->v2 transformations as needed
  }
  
  /**
   * Convert document from v2 to v1 format
   */
  private transformV2toV1(document: any): void {
    // Example transformation: rename 'capability' to 'task' in flow steps
    if (document.flow?.steps) {
      document.flow.steps = document.flow.steps.map((step: any) => {
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
    
    // Add more v2->v1 transformations as needed
  }

  /**
 * Get all registered schema versions
 * @returns Array of registered schema versions
 */
getRegisteredSchemaVersions(): string[] {
    // Return array of keys from the schemas Map
    return Array.from(this.schemas.keys()).sort((a, b) => {
      // Sort versions semantically (1.0.0 before 1.1.0 before 2.0.0)
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }
      
      return 0;
    });
  }
  
  /**
   * Check if a version is at least a specific version
   */
  private isVersionAtLeast(version: string, minVersion: string): boolean {
    const vParts = version.split('.').map(Number);
    const minParts = minVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(vParts.length, minParts.length); i++) {
      const v = vParts[i] || 0;
      const min = minParts[i] || 0;
      
      if (v > min) return true;
      if (v < min) return false;
    }
    
    return true; // Equal versions
  }
  
  /**
   * Check if a version is before a specific version
   */
  private isVersionBefore(version: string, maxVersion: string): boolean {
    return !this.isVersionAtLeast(version, maxVersion);
  }
  
  /**
   * Create a normalized capability wrapper dynamically based on the document's schema version
   * @param document Document to normalize
   * @returns Normalized capability wrapper
   */
  normalizeToCapabilityWrapper(document: any): CapabilityWrapper {
    // Detect version to apply the right normalization
    const version = document.enact || document.protocolDetails?.enact || '1.0.0';
    
    // Get protocol details
    const protocolDetails = document.protocolDetails || document;
    
    // Create a base wrapper
    const baseWrapper: CapabilityWrapper = {
      id: document.id || protocolDetails.id || '',
      name: document.name || protocolDetails.id || '',
      description: document.description || protocolDetails.description || '',
      version: document.version || protocolDetails.version || '1.0.0',
      teams: document.teams || [],
      isAtomic: true,
      protocolDetails: {
        enact: version,
        id: protocolDetails.id || '',
        description: protocolDetails.description || '',
        version: protocolDetails.version || '1.0.0',
        type: protocolDetails.type ||  'atomic',
        authors: protocolDetails.authors || [],
        // Fields that may require version-specific handling
        inputs: this.normalizeSchemaField(protocolDetails.inputs),
        outputs: this.normalizeSchemaField(protocolDetails.outputs),
        tasks: [],
        flow: { steps: [] },
        // Optional fields
        doc: protocolDetails.doc,
        dependencies: protocolDetails.dependencies,
        imports: protocolDetails.imports || [],
        env: protocolDetails.env
      }
    };
    
    // Apply version-specific normalizations
    if (this.isVersionBefore(version, '1.0.0')) {
      // v1.x specific normalization
      this.normalizeV1SpecificFields(baseWrapper, protocolDetails);
    } else {
      // v2.x specific normalization
      this.normalizeV2SpecificFields(baseWrapper, protocolDetails);
    }
    
    return baseWrapper;
  }
  
  /**
   * Normalize a JSON Schema field to the expected format
   */
   normalizeSchemaField(schema: any): any {
    if (!schema) {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }
    
    // Already in correct format
    if (schema.type === 'object' && typeof schema.properties === 'object') {
      return {
        type: 'object',
        properties: schema.properties,
        required: Array.isArray(schema.required) ? schema.required : []
      };
    }
    
    // Direct properties object format
    return {
      type: 'object',
      properties: typeof schema === 'object' ? schema : {},
      required: []
    };
  }
  
  /**
   * Apply v1-specific normalizations
   */
  private normalizeV1SpecificFields(wrapper: CapabilityWrapper, details: any): void {
    // Normalize flow steps
    if (details.flow?.steps) {
      wrapper.protocolDetails.flow = {
        steps: details.flow.steps.map((step: any) => {
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
        })
      };
    }
    
    // Normalize tasks
    wrapper.protocolDetails.tasks = details.tasks || [];
    
    // Normalize environment configuration
    if (details.env) {
      const env = details.env;
      
      // Handle legacy env.vars array format
      if (env.vars && Array.isArray(env.vars)) {
        const varsRecord: Record<string, any> = {};
        env.vars.forEach((v: any) => {
          if (v.name) {
            varsRecord[v.name] = {
              type: v.schema?.type || "string",
              description: v.description || "",
              ...(v.schema?.default !== undefined && { default: v.schema.default })
            };
          }
        });
        wrapper.protocolDetails.env = {
          ...env,
          vars: varsRecord
        };
      }
    }
  }
  
  /**
   * Apply v2-specific normalizations
   */
  private normalizeV2SpecificFields(wrapper: CapabilityWrapper, details: any): void {
    // Apply v2-specific normalizations here
    // For now, use v1 normalizations as a base
    this.normalizeV1SpecificFields(wrapper, details);
    
    // Add v2-specific changes here
  }
}

// Export an instance with default schema
export const schemaAdapter = new SchemaAdapterService();