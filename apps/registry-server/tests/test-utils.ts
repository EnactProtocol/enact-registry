import { Context } from "elysia";
import type { ProcessedCapability } from "../src/types/yaml.types";

export function createMockContext(data: Partial<Context> = {}): any {
  return {
    body: {},
    set: {
      status: 200,
      headers: new Map()
    },
    request: new Request("http://localhost"),
    store: {},
    ...data
  } as any;
}

export function createMockCapability(): any {
  return {
    id: "test-capability",
    description: "Test Description",
    version: "1.0.0",
    type: "atomic",
    enact: "1.0.0",
    authors: [{ name: "Test Author" }],
    inputs: {
      testInput: {
        type: "string",
        description: "Test input",
        default: "default"
      }
    },
    tasks: [{
      id: "testTask",
      type: "script",
      language: "python",
      code: "print('test')"
    }],
    flow: {
      steps: [{ task: "testTask" }]
    },
    outputs: {
      testOutput: {
        type: "string",
        description: "Test output"
      }
    },
    embedding: [0.1, 0.2, 0.3]
  };
}