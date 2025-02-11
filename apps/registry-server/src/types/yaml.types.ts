// src/types/yaml.types.ts
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
  
  export interface Capability {
    enact: string;
    id: string;
    description: string;
    version: string;
    type: string;
    authors: Author[];
    inputs: {
      [key: string]: Variable;
    };
    tasks: Task[];
    flow: Flow;
    outputs: {
      [key: string]: Variable;
    };
  }
  
  export interface ProcessedCapability extends Capability {
    embedding: number[];
  }