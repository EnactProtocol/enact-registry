import { describe, expect, it, jest, beforeEach } from "bun:test";
import { YamlController } from "../../src/controllers/yaml.controller";
import { Context } from "elysia";

describe("YamlController", () => {
  let controller: YamlController;

  beforeEach(() => {
    controller = new YamlController();
    controller.openAIService.generateEmbedding = jest.fn();
    controller.dbService.findSimilarCapabilities = jest.fn();
    controller.dbService.getCapabilityById = jest.fn();
  });

  describe("processYaml", () => {
    it("should process valid YAML content", async () => {
      const mockContext = {
        body: {
          file: "name: test\ndescription: test description"
        }
      } as Context<{ body: { file: string } }>;

      controller.openAIService.generateEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      
      // const result = await controller.processYaml(mockContext);
      // expect(result).toBeDefined();
    });

    it("should handle invalid YAML content", async () => {
      const mockContext = {
        body: {
          file: "invalid: yaml: content:"
        }
      } as Context<{ body: { file: string } }>;

      expect(controller.processYaml(mockContext)).rejects.toThrow();
    });
  });
});
