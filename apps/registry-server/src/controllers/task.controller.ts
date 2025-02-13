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
        type: cap.isAtomic? 'atomic' : 'composite',
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
          outputs: {} // Default empty outputs
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
      
      // Generate a valid ID if none exists
      const taskId = task.id || task.name || `task-${Date.now()}`;
      
      // Structure the task data properly
      // Structure the task data properly
const structuredTask = {
  id: taskId,
  name: task.name || taskId,
  description: task.description,
  version: task.version || '1.0.0',
  type: task.isAtomic ? 'atomic' : 'composite',
  protocolDetails: {
    enact: task.protocolDetails?.enact || '1.0.0',
    id: taskId,
    name: task.name || taskId,
    description: task.description,
    version: task.version || '1.0.0',
    authors: task.protocolDetails?.authors || [],
    inputs: task.protocolDetails?.inputs || task.inputs || {},
    tasks: task.protocolDetails?.tasks || [],
    flow: task.protocolDetails?.flow || { steps: [] },
    outputs: task.protocolDetails?.outputs || task.outputs || {}
  }
};
  
      const embedding = await this.openAIService.generateEmbedding(task.description);
      const processedCapability: ProcessedCapability = {
        ...structuredTask,
        embedding,
        enact: '1.0.0',
        id: taskId,
        description: task.description,
        version: task.version || '1.0.0',
        type: task.type || 'atomic',
        authors: task.protocolDetails?.authors || [],
        inputs: task.protocolDetails?.inputs || {},
        tasks: task.protocolDetails?.tasks || [],
        flow: {
          steps: task.protocolDetails?.flow?.steps || []
        },
        outputs: task.protocolDetails?.outputs || {}
      };
  
      // Store the properly structured data
      await this.dbService.storeCapability(processedCapability, JSON.stringify(structuredTask));
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