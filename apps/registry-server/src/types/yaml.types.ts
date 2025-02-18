// src/types/yaml.types.ts
import { EnactDocument } from '@enact/types';
export interface Author {
    name: string;
  }
  
  export interface Variable {
    type: string;
    description: string;
    default?: any;
  }
  
  export interface Task {
    id: string;
    type: string;
    language: string;
    code: string;
  }
  
  export interface FlowStep {
    task: string;
  }
  
  export interface Flow {
    steps: FlowStep[];
  }
  
  export interface OutputProperty {
    type: string;
  }
  
  export interface Output {
    type: string;
    properties: {
      [key: string]: OutputProperty;
    };
  }
  

  
  export interface ProcessedCapability extends EnactDocument {
    embedding: number[];
  }