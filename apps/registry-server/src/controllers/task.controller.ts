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
     
      return  capabilities ;
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
     console.log("server received", task); 
      const taskId = task.id || task.name || `task-${Date.now()}`;
      
      // Store the complete protocolDetails
      const structuredTask = {
        id: taskId,
        name: task.name || taskId,
        description: task.description,
        version: task.version || '1.0.0',
        type: task.isAtomic ? 'atomic' : 'composite',
        teams: task.teams || [],
        protocolDetails: {
          enact: task.protocolDetails?.enact || '1.0.0',
          id: taskId,
          name: task.name || taskId,
          description: task.description,
          version: task.version || '1.0.0',
          authors: task.protocolDetails?.authors || [],
          inputs: task.protocolDetails?.inputs || {},
          tasks: task.protocolDetails?.tasks || [],
          flow: task.protocolDetails?.flow || { steps: [] },
          outputs: task.protocolDetails?.outputs || {}
        }
      };
  
      const embedding = await this.openAIService.generateEmbedding(task.description);
      
      // Create ProcessedCapability with all required properties
      const processedCapability: ProcessedCapability = {
        id: taskId,
        description: task.description,
        version: task.version || '1.0.0',
        type: task.isAtomic ? 'atomic' : 'composite',
        embedding,
        enact: '1.0.0',
        authors: task.protocolDetails?.authors || [],
        inputs: task.protocolDetails?.inputs || {},
        tasks: task.protocolDetails?.tasks || [],
        flow: task.protocolDetails?.flow || { steps: [] },
        outputs: task.protocolDetails?.outputs || {}
      };
  
      // Store the complete JSON string of structuredTask
      await this.dbService.storeCapability(processedCapability, JSON.stringify(structuredTask));
      return { message: "Task added successfully", task: structuredTask };
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