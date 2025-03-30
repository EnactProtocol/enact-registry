// FILE: src/config/schema-registry.ts
import { schemaAdapter } from '../services/schema-adapter.service';
import logger from '../logger';
import fs from 'fs';
import path from 'path';

/**
 * Initialize schema registry with schema definitions
 */
export function initializeSchemaRegistry(): void {
  try {
    // Register built-in schemas
    registerBuiltInSchemas();
    
    // Register schemas from configuration files (if available)
    registerSchemasFromFiles();
    
    logger.info('Schema registry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize schema registry:', error);
  }
}

/**
 * Register built-in default schemas
 */
function registerBuiltInSchemas(): void {
  // Register main v1.0.0 schema
  const v1Schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Enact Protocol Schema",
    "description": "Schema for validating Enact capability YAML files",
    "definitions": {
        "jsonSchema": {
            "type": "object",
            "description": "JSON Schema object",
            "properties": {
                "type": {
                    "type": "string",
                    "description": "Type of the schema",
                    "enum": [
                        "object",
                        "array",
                        "string",
                        "number",
                        "integer",
                        "boolean",
                        "null"
                    ]
                },
                "properties": {
                    "type": "object",
                    "description": "Properties for an object schema"
                },
                "required": {
                    "type": "array",
                    "description": "Required property names",
                    "items": {
                        "type": "string"
                    }
                },
                "items": {
                    "description": "Schema for array items",
                    "oneOf": [
                        {
                            "$ref": "#/definitions/jsonSchema"
                        },
                        {
                            "type": "boolean"
                        }
                    ]
                },
                "additionalProperties": {
                    "description": "Schema for additional properties",
                    "oneOf": [
                        {
                            "$ref": "#/definitions/jsonSchema"
                        },
                        {
                            "type": "boolean"
                        }
                    ]
                }
            }
        },
        "jsonSchemaType": {
            "type": "object",
            "description": "JSON Schema type definition",
            "properties": {
                "type": {
                    "type": "string",
                    "description": "Type of the value",
                    "enum": [
                        "string",
                        "number",
                        "integer",
                        "boolean",
                        "array",
                        "object",
                        "null"
                    ]
                },
                "description": {
                    "type": "string",
                    "description": "Description of the value"
                },
                "enum": {
                    "type": "array",
                    "description": "Enumeration of possible values"
                },
                "default": {
                    "description": "Default value"
                },
                "format": {
                    "type": "string",
                    "description": "Format of the value"
                },
                "pattern": {
                    "type": "string",
                    "description": "Regex pattern for string validation"
                },
                "minimum": {
                    "type": "number",
                    "description": "Minimum value for numeric types"
                },
                "maximum": {
                    "type": "number",
                    "description": "Maximum value for numeric types"
                },
                "source": {
                    "type": "string",
                    "description": "Source or instructions for obtaining the value"
                }
            }
        }
    },
    "type": "object",
    "required": [
        "enact",
        "id",
        "description",
        "version",
        "type"
    ],
    "properties": {
        "enact": {
            "type": "string",
            "description": "Enact Protocol version",
            "pattern": "^\\d+\\.\\d+\\.\\d+$"
        },
        "id": {
            "type": "string",
            "description": "Unique identifier for the capability"
        },
        "description": {
            "type": "string",
            "description": "Description of the capability"
        },
        "version": {
            "type": "string",
            "description": "Version of the capability",
            "pattern": "^\\d+\\.\\d+\\.\\d+$"
        },
        "type": {
            "type": "string",
            "description": "Type of capability",
            "enum": [
                "python",
                "javascript",
                "shell",
                "prompt",
                "workflow"
            ]
        },
        "authors": {
            "type": "array",
            "description": "List of authors",
            "items": {
                "type": "object",
                "required": [
                    "name"
                ],
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Author's name"
                    },
                    "email": {
                        "type": "string",
                        "description": "Author's email address",
                        "format": "email"
                    },
                    "url": {
                        "type": "string",
                        "description": "Author's URL",
                        "format": "uri"
                    }
                }
            }
        },
        "doc": {
            "type": "string",
            "description": "Optional documentation in Markdown format"
        },
        "inputs": {
            "type": "object",
            "description": "Input parameters for the capability (JSON Schema)",
            "properties": {
                "type": {
                    "type": "string",
                    "description": "Type of the inputs object",
                    "enum": [
                        "object"
                    ]
                },
                "properties": {
                    "type": "object",
                    "description": "JSON Schema properties defining the inputs"
                },
                "required": {
                    "type": "array",
                    "description": "Array of required property names",
                    "items": {
                        "type": "string"
                    }
                }
            },
            "default": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        "dependencies": {
            "type": "object",
            "description": "Runtime dependencies for the capability",
            "properties": {
                "packages": {
                    "type": "array",
                    "description": "Required packages",
                    "items": {
                        "type": "string",
                        "description": "Package name with optional version specifier (e.g., 'pandas>=2.0.0')"
                    }
                }
            }
        },
        "run": {
            "description": "Implementation code or workflow steps",
            "oneOf": [
                {
                    "type": "string",
                    "description": "Implementation code for atomic capabilities"
                },
                {
                    "type": "array",
                    "description": "Workflow steps for workflow capabilities",
                    "items": {
                        "type": "object",
                        "additionalProperties": {
                            "type": "object",
                            "description": "Parameters to pass to the capability"
                        }
                    }
                }
            ]
        },
        "outputs": {
            "type": "object",
            "description": "Output parameters for the capability (JSON Schema)",
            "properties": {
                "type": {
                    "type": "string",
                    "description": "Type of the outputs object",
                    "enum": [
                        "object"
                    ]
                },
                "properties": {
                    "type": "object",
                    "description": "JSON Schema properties defining the outputs"
                },
                "required": {
                    "type": "array",
                    "description": "Array of required property names",
                    "items": {
                        "type": "string"
                    }
                },
                "oneOf": {
                    "type": "array",
                    "description": "JSON Schema oneOf for complex validation patterns"
                }
            },
            "default": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        "env": {
            "type": "object",
            "description": "Environment configuration and resource requirements",
            "properties": {
                "vars": {
                    "type": "object",
                    "description": "Environment variables (treated as secrets by default)",
                    "additionalProperties": {
                        "$ref": "#/definitions/jsonSchemaType"
                    }
                },
                "resources": {
                    "type": "object",
                    "description": "Resource requirements for execution",
                    "properties": {
                        "memory": {
                            "type": "string",
                            "description": "Required memory allocation"
                        },
                        "timeout": {
                            "type": "string",
                            "description": "Maximum execution time"
                        }
                    }
                }
            }
        }
    },
    "patternProperties": {
        "^x-": {
            "description": "Extensions to the Enact Protocol. The field name MUST begin with 'x-'."
        }
    }
};
  
  schemaAdapter.registerSchema('1.0.0', v1Schema);
  
  // Example for registering future versions
  // schemaAdapter.registerSchema('2.0.0', v2Schema);
}

/**
 * Register schemas from configuration files
 */
function registerSchemasFromFiles(): void {
  const schemaDir = process.env.SCHEMA_DIR || path.join(process.cwd(), 'schemas');
  
  try {
    if (!fs.existsSync(schemaDir)) {
      logger.info(`Schema directory ${schemaDir} does not exist, skipping file-based schema registration`);
      return;
    }
    
    const files = fs.readdirSync(schemaDir);
    
    for (const file of files) {
      if (file.endsWith('.json') || file.endsWith('.schema.json')) {
        try {
          const filePath = path.join(schemaDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const schema = JSON.parse(content);
          
          // Extract version from filename (e.g., v1.0.0.schema.json -> 1.0.0)
          let version = file.replace(/^v/, '').replace(/\.schema\.json$/, '').replace(/\.json$/, '');
          
          // Or get it from the schema itself if available
          if (schema.version || schema.schemaVersion) {
            version = schema.version || schema.schemaVersion;
          }
          
          if (version && version.match(/^\d+\.\d+\.\d+$/)) {
            schemaAdapter.registerSchema(version, schema);
            logger.info(`Registered schema from file: ${file} (version ${version})`);
          } else {
            logger.warn(`Could not determine version for schema file: ${file}`);
          }
        } catch (error) {
          logger.error(`Error loading schema from file ${file}:`, error);
        }
      }
    }
  } catch (error) {
    logger.warn(`Error loading schemas from directory ${schemaDir}:`, error);
  }
}

/**
 * Load a specific schema from JSON
 * @param schemaJson JSON string with schema
 * @param version Schema version
 */
export function loadSchemaFromJson(schemaJson: string, version: string): void {
  try {
    const schema = JSON.parse(schemaJson);
    schemaAdapter.registerSchema(version, schema);
    logger.info(`Registered schema from JSON (version ${version})`);
  } catch (error) {
    logger.error('Error registering schema from JSON:', error);
    throw new Error(`Failed to register schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}