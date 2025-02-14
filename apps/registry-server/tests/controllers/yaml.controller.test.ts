// yaml.controller.test.ts
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { YamlController } from "../../src/controllers/yaml.controller";
import { createMockContext, createMockCapability } from "../test-utils";
import { DatabaseService } from "../../src/services/db.service";
import { OpenAIService } from "../../src/services/openai.service";

describe("YamlController", () => {
  let controller: YamlController;
  let mockDbService: DatabaseService;
  let mockOpenAIService: OpenAIService;

  beforeEach(() => {
    mockDbService = {
      db: null as any,
      initializeDatabase: () => {},
      cosineSimilarity: () => 1,
      storeCapability: () => Promise.resolve(),
      findSimilarCapabilities: () => Promise.resolve([]),
      getCapabilityById: () => Promise.resolve(null),
      deleteCapability: () => Promise.resolve(),
      getAllCapabilities: () => Promise.resolve([]),
      createDefaultCapability: () => ({
        id: 'test-id',
        name: 'Test Task',
        description: 'Test Description',
        version: '1.0.0',
        teams: [],
        isAtomic: true,
        protocolDetails: {
          enact: '1.0.0',
          id: 'test-id',
          name: 'Test Task',
          description: 'Test Description',
          version: '1.0.0',
          authors: [],
          inputs: {},
          tasks: [],
          flow: { steps: [] },
          outputs: {}
        }
      })
    } as DatabaseService;

    mockOpenAIService = {
      generateEmbedding: () => Promise.resolve([0.1, 0.2, 0.3])
    } as unknown as OpenAIService;

    controller = new YamlController();
    controller.dbService = mockDbService;
    controller.openAIService = mockOpenAIService;
  });

  describe("processYaml", () => {
    const validYaml = `
      enact: 1.0.0
      id: "TestCapability"
      description: "Test description"
      version: "1.0.0"
      type: "atomic"
      authors:
        - name: "Test Author"
      inputs: {}
      tasks: []
      flow:
        steps: []
      outputs: {}
    `;

    it("should successfully process valid YAML", async () => {
      const context = createMockContext({
        body: { file: validYaml }
      });

      const result = await controller.processYaml(context);

      expect(result).toBeDefined();
      expect(result.message).toBe("Capability processed successfully");
    });

    it("should throw error for missing YAML content", async () => {
      const context = createMockContext({
        body: { file: "" }
      });

      await expect(() => controller.processYaml(context)).toThrow("No YAML content provided");
    });

    it("should throw error for invalid YAML", async () => {
      const context = createMockContext({
        body: { file: "invalid: : yaml: :" }
      });

      await expect(() => controller.processYaml(context)).toThrow();
    });

    it("should throw error for missing required fields", async () => {
      const context = createMockContext({
        body: { file: "enact: 1.0.0" as string }
      });

      await expect(() => controller.processYaml(context)).toThrow("Missing required fields");
    });
  });
});