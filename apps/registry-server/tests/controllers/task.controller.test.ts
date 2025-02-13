import { describe, expect, it, jest, beforeEach } from "bun:test";
import { TaskController } from "../../src/controllers/task.controller";
import { Context } from "elysia";

describe("TaskController", () => {
  let controller: TaskController;

  beforeEach(() => {
    controller = new TaskController();
    // Mock the DB service
    controller.getAllTasks = jest.fn();
    controller.addTask = jest.fn();
    controller.deleteTask = jest.fn();
  });

  describe("getAllTasks", () => {
    it("should return all tasks", async () => {
      const mockTasks = [{
        id: 1,
        name: "Test Task",
        description: "Test Description",
        version: "1.0.0",
        teams: ["team1"],
        isAtomic: true,
        protocolDetails: {
          enact: "1.0",
          id: "test-id",
          name: "Test Protocol",
          description: "Test Protocol Description",
          version: "1.0.0",
          authors: [{ name: "Test Author" }],
          inputs: {},
          tasks: [],
          flow: { steps: [] },
          outputs: {}
        }
      }];
      controller.getAllTasks = jest.fn().mockResolvedValue(mockTasks);

      const result = await controller.getAllTasks();
      expect(result).toEqual(mockTasks);
    });
  });

  describe("addTask", () => {
    it("should add a valid task", async () => {
      const mockTask = {
        name: "Test Task",
        description: "Test Description",
        version: "1.0.0",
        teams: ["team1"],
        isAtomic: true,
        protocolDetails: {
          enact: "1.0",
          id: "test-id",
          name: "Test Protocol",
          description: "Test Protocol Description",
          version: "1.0.0",
          authors: [{ name: "Test Author" }],
          inputs: {},
          tasks: [],
          flow: { steps: [] },
          outputs: {}
        }
      };

      const mockContext = {
        body: mockTask
      } as Context;

      controller.addTask = jest.fn().mockResolvedValue(mockTask);
      
      const result = await controller.addTask(mockContext);
      expect(result).toBeDefined();
    });
  });
});
