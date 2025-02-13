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

export type ProtocolDetails = {
  enact: string;
  id: string;
  name: string;
  description: string;
  version: string;
  authors: Author[];
  inputs: Record<string, InputConfig>;
  tasks: TaskDefinition[];
  flow: {
    steps: FlowStep[];
  };      
  outputs: Record<string, InputConfig>;
};

export type Task = {
  id: number;
  name: string;
  description: string;
  version: string;
  teams: string[];
  isAtomic: boolean;
  protocolDetails: ProtocolDetails;
};
