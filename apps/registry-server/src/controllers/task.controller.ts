import { Context } from 'elysia';
import { OpenAIService } from '../services/openai.service';
import { DatabaseService } from '../services/db.service';
import type { ProcessedCapability } from '../types/yaml.types';
import logger from '../logger';

export class TaskController {
  openAIService: OpenAIService;
  dbService: DatabaseService;

  constructor() {
    this.openAIService = new OpenAIService();
    this.dbService = new DatabaseService();
  }


  async getAllTasks() {
    try {
      const capabilities = await this.dbService.getAllCapabilities();
      const tasks = capabilities.map(cap => ({
        id: cap.id,
        name: cap.id, // Use id as name if not specified
        description: cap.description,
        version: cap.version || '1.0.0',
        type: cap.type || 'atomic',
        protocolDetails: {
          enact: '1.0.0', // Default value
          id: cap.id,
          name: cap.id,
          description: cap.description,
          version: cap.version || '1.0.0',
          authors: [], // Default empty array
          inputs: {}, // Default empty object
          tasks: [], // Default empty array
          flow: { steps: [] }, // Default empty flow
          outputs: { type: 'object', properties: {} } // Default empty outputs
        }
      }));
      return { tasks };
    } catch (error) {
      logger.error("Error getting tasks:", error);
      throw new Error("Failed to fetch tasks");
    }
  }

  async addTask(context: Context<{ body: any }>) {
    try {
      const task = context.body;
      if (!task.description) {
        throw new Error("Task description required");
      }
      const embedding = await this.openAIService.generateEmbedding(task.description);
      const processedCapability: ProcessedCapability = {
        ...task,
        embedding,
      };
      await this.dbService.storeCapability(processedCapability, JSON.stringify(task));
      return { message: "Task added successfully", task: processedCapability };
    } catch (error: any) {
      logger.error("Error adding task:", error);
      throw new Error(error.message);
    }
  }

  async deleteTask(context: Context<{ params: { id: string } }>) {
    try {
      const { id } = context.params;
      await this.dbService.deleteCapability(id);
      return { message: "Task deleted successfully" };
    } catch (error) {
      logger.error("Error deleting task:", error);
      throw new Error("Failed to delete task");
    }
  }
}