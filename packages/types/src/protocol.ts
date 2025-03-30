export interface Author {
  name: string;
  email?: string;
  url?: string;
}

export interface CapabilityWrapper {
  id: number | string;
  name: string;
  description: string;
  teams: string[];
  isAtomic: boolean;
  version: string;
  protocolDetails: EnactDocument;
}

// JSON Schema definitions
export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | boolean;
  additionalProperties?: JsonSchema | boolean;
  enum?: any[];
  default?: any;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  // Allow for other JSON Schema properties
  [key: string]: any;
}

// Updated to match JSON Schema format
export interface InputsOutputsSchema {
  type: string; // Usually "object"
  properties: Record<string, JsonSchema>;
  required?: string[];
  oneOf?: Array<{required: string[]}>;
}

export interface ResourceRequirements {
  memory?: string;
  timeout?: string;
}

// Updated to match the protocol's environment structure
export interface Environment {
  vars?: Record<string, JsonSchema>;
  resources?: ResourceRequirements;
}

export interface PackageDependency {
  name: string;
  version?: string;
}

export interface Dependencies {
  version?: string;
  packages?: PackageDependency[];
}

export interface Task {
  id: string;
  type: "script" | "request" | "agent" | "prompt" | "shell";
  language?: string;
  code?: string;
  dependencies?: Dependencies;
}

export interface ImportedCapability {
  id: string;
  version: string;
}

export interface FlowStep {
  capability: string;
  inputs?: Record<string, any>;
  dependencies?: string[];
}

export interface Flow {
  steps: FlowStep[];
}

export interface EnactDocument {
  // Required fields
  enact: string;
  id: string;
  description: string;
  version: string;
  type: 'atomic' | 'composite';
  authors: Author[];
  
  // Optional fields
  doc?: string;
  inputs?: InputsOutputsSchema;
  dependencies?: Dependencies;
  tasks?: Task[];
  imports?: ImportedCapability[];
  flow?: Flow;
  outputs?: InputsOutputsSchema;
  env?: Environment;
  
  // Extension fields
  [key: string]: any; // Allows for x- extensions
}

// Helper interface for application use
export interface TaskData {
  id: number;
  name: string;
  description: string;
  isAtomic: boolean;
  protocolDetails: EnactDocument;
}