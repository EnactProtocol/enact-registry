export interface Author {
    name: string;
    email?: string;
  }
  
  export interface Input {
    type: string;
    description: string;
    default?: string | number | boolean;
  }
  
  export interface Task {
    id: string;
    type?: string;
    language?: string;
    description?: string;
    code?: string;
  }
  
  interface FlowStep {
    task: string;  // Similar to GitHub's 'uses'
    name?: string; // Optional descriptive name
  }
  
  export interface Flow {
    steps: FlowStep[];
  }
  
  export interface Output {
    type: string;
    description?: string;
  }
  interface PackageDependency {
    name: string;
    version: string;
  }
  
  interface PythonDependencies {
    version: string;
    packages: PackageDependency[];
  }
  
  interface Dependencies {
    python?: PythonDependencies;
    // Add other runtimes as needed, e.g.:
    // node?: NodeDependencies;
  }
  
  export interface EnactDocument {
    enact: string;
    id: string;
    name: string;
    type: 'composite' | 'atomic';
    description: string;
    version: string;
    authors: Author[];
    inputs: Record<string, Input>;
    tasks: Task[];
    flow: Flow;
    outputs: Record<string, Output>;
    dependencies?: Dependencies;  // Optional dependencies field
  }
  
  export interface TaskData {
    id: number;
    name: string;
    description: string;
    isAtomic: boolean;
    protocolDetails: EnactDocument;
  }
  