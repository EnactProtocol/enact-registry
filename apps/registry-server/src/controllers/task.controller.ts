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
      return { message: "Task added successfully" };
    } catch (error: any) {
      logger.error("Error adding task:", error);
      return { error: error.message };
    }
  }
}
