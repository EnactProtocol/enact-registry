// FILE: src/types/yaml.types.ts
import { EnactDocument, JsonSchema, InputsOutputsSchema, Author, FlowStep, Flow } from '@enact/types';

export interface ProcessedCapability extends EnactDocument {
  embedding: number[];
}

export interface SchemaValidationResult {
  valid: boolean;
  errors?: string[];
}
