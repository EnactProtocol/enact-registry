import { z } from "zod";

export const formSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  description: z.string().min(1, "Description is required"),
  authorName: z.string().min(1, "Author name is required"),
  protocolType: z.string().min(1, "Protocol type is required"),
  version: z.string().min(1, "Version is required"),
  inputs: z.array(z.object({
    name: z.string().min(1, "Input name is required"),
    type: z.string().min(1, "Input type is required"),
    description: z.string().min(1, "Input description is required"),
    default: z.string().optional(),
  })),
  taskType: z.string().min(1, "Task type is required"),
  taskLanguage: z.string().min(1, "Task language is required"),
  taskCode: z.string().min(1, "Task code is required"),
  outputs: z.array(z.object({
    name: z.string().min(1, "Output name is required"),
    type: z.string().min(1, "Output type is required"),
    description: z.string().min(1, "Output description is required"),
    default: z.string().optional(),
  })),
});
export type FormValues = z.infer<typeof formSchema>;

export type InputField = FormValues['inputs'][number];
export type OutputField = FormValues['outputs'][number];


// export interface InputField {
//     name: string;
//     type: string;
//     description: string;
//     default?: string;
//   }
  
//   export interface OutputField {
//     name: string;
//     type: string;
//     description: string;
//     default?: string;
//   }
  
//   export interface FormValues {
//     taskId: string;
//     description: string;
//     authorName: string;
//     protocolType: string;
//     version: string;
//     inputs: InputField[];
//     taskType: string;
//     taskLanguage: string;
//     taskCode: string;
//     outputs: OutputField[];
//   }

  export interface FlowStep {
    task: string;
    dependencies?: string[];
  }
  
  // Define task type for protocol tasks
  export interface ProtocolTask {
    id: string;
    type: string;
    language: string;
    code: string;
    description?: string;
  }
  
  export interface YamlContent {
    enact: string;
    id: string;
    description?: string;
    type?: string;
    version?: string;
    authors?: Array<{ name: string }>;
    inputs: Record<string, {
      type: string;
      description: string;
      default?: string;
    }>;
    tasks: ProtocolTask[];
    flow?: {
      steps: FlowStep[];
    };
    outputs: Record<string, {
      type: string;
      description: string;
      default?: string;
    }>;
  }
  