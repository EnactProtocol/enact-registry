import {EnactDocument} from '@enact/types';
export type Author = {
  name: string;
};

export type InputConfig = {
  type: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default?: any;
};

export type TaskDefinition = {
  id: string;
  type: string;
  language?: string;
  code?: string;
  description?: string;
}

export type FlowStep = {
  task: string;
  dependencies?: string[];
};

// export interface EnactDocument {
//   // Core metadata
//   enact: string;
//   id: string;
//   name: string;
//   description: string;
//   version: string;
//   type: 'atomic' | 'composite';

//   // Authors
//   authors: Author[];

//   // Variables
//   inputs: Record<string, InputConfig>;
//   outputs: Record<string, InputConfig>;

//   // Execution
//   tasks: TaskDefinition[];
//   flow:  Record<string, string>;
// }

export type CapabilityWrapper = {
  id: number;
  name: string;
  description: string;
  version: string;
  teams: string[];
  isAtomic: boolean;
  protocolDetails: EnactDocument;
};
