
// task.controller.test.ts
import { describe, expect, it, beforeEach } from "bun:test";
import { TaskController } from "../../src/controllers/task.controller";
import { createMockContext, createMockCapability } from "../test-utils";
import { DatabaseService } from "../../src/services/db.service";
import { OpenAIService } from "../../src/services/openai.service";

describe("TaskController", () => {
  let controller: TaskController;
  let mockDbService: DatabaseService;
  let mockOpenAIService: OpenAIService;
  beforeEach(() => {
    mockDbService = {
      db: null as any,
      initializeDatabase: () => { },
      cosineSimilarity: () => 1,
      storeCapability: () => Promise.resolve(),
      findSimilarCapabilities: () => Promise.resolve([]),
      getCapabilityById: () => Promise.resolve(null),
      deleteCapability: () => Promise.resolve(),
      getAllCapabilities: () => Promise.resolve([createMockCapability()]),
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
    } as unknown as DatabaseService;

    mockOpenAIService = {
      generateEmbedding: () => Promise.resolve([0.1, 0.2, 0.3])
    } as unknown as OpenAIService;

    controller = new TaskController();
    controller.dbService = mockDbService;
    controller.openAIService = mockOpenAIService;
  });

  describe("getAllTasks", () => {
    it("should return all tasks successfully", async () => {
      const result = await controller.getAllTasks();
      
      expect(result).toEqual([createMockCapability()]);
    });

    it("should handle errors when fetching tasks", async () => {
      mockDbService.getAllCapabilities = () => Promise.reject(new Error("Database error"));
      
      await expect(() => controller.getAllTasks()).toThrow("Failed to fetch tasks");
    });
  });

  describe("addTask", () => {
    it("should add a valid task successfully", async () => {
      const mockTask = {
        name: "Test Task",
        description: "Test Description",
        version: "1.0.0",
        teams: ["team1"],
        isAtomic: true,
        protocolDetails: createMockCapability()
      };

      const context = createMockContext({
        body: mockTask
      });

      const result = await controller.addTask(context);

      expect(result.message).toBe("Task added successfully");
    });

    it("should throw error for missing description", async () => {
      const context = createMockContext({
        body: { name: "Test Task" }
      });

      await expect(() => controller.addTask(context)).toThrow("Task description required");
    });
  });

  describe("deleteTask", () => {
    it("should delete task successfully", async () => {
      const context = createMockContext({
        params: { id: "test-id" }
      });

      const result = await controller.deleteTask(context);

      expect(result.message).toBe("Task deleted successfully");
    });

    it("should handle errors when deleting task", async () => {
      mockDbService.deleteCapability = () => Promise.reject(new Error("Database error"));
      
      const context = createMockContext({
        params: { id: "test-id" }
      });

      await expect(() => controller.deleteTask(context)).toThrow("Failed to delete task");
    });
  });
});