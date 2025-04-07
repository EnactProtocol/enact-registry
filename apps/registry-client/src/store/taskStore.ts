// TaskStore with updated Enact Protocol interface
import { create } from 'zustand';
import { api } from '@/lib/api';
import { CapabilityWrapper, EnactDocument } from '@enact/types'

// Helper interface for the UI to display capabilities
interface TaskStore {
  tasks: CapabilityWrapper[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: CapabilityWrapper) => Promise<void>;
  removeTask: (taskId: number) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  isLoading: false,
  error: null,
  
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await api.tasks.getAll();
      console.log('fetchTasks:', tasks);
      set({ tasks, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred while fetching tasks',
        isLoading: false 
      });
      console.error('Error fetching tasks:', error);
    }
  },
  
  addTask: async (taskData: CapabilityWrapper) => {
    console.log('sending taskData:', taskData);
    set({ isLoading: true, error: null });
    try {
      // Ensure we're sending a properly structured task
      // Convert numeric IDs to strings if needed for Enact Protocol compatibility
      const task: CapabilityWrapper = {
        ...taskData,
        id: typeof taskData.id === 'number' ? taskData.id : parseInt(taskData.id as string, 10),
        protocolDetails: {
          ...taskData.protocolDetails,
          // Ensure required fields are present
          enact: taskData.protocolDetails.enact || "1.0.0",
          id: taskData.protocolDetails.id,
          description: taskData.protocolDetails.description,
          version: taskData.protocolDetails.version,
          type: taskData.protocolDetails.type,
          authors: taskData.protocolDetails.authors || [],
          // Make sure optional fields have proper structure according to JSON Schema
          inputs: taskData.protocolDetails.inputs || {
            type: "object",
            properties: {},
            required: []
          },
          outputs: taskData.protocolDetails.outputs || {
            type: "object",
            properties: {},
            required: []
          },
          tasks: taskData.protocolDetails.tasks || [],
          flow: taskData.protocolDetails.flow || { steps: [] },
          // Add proper structure for env if it exists
          ...(taskData.protocolDetails.env ? {
            env: {
              vars: taskData.protocolDetails.env.vars || {},
              resources: taskData.protocolDetails.env.resources || {}
            }
          } : {})
        }
      };
      
      const newTask = await api.tasks.add(task);
      set((state) => ({ 
        tasks: state.tasks ? [...state.tasks, newTask] : [newTask],
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred while adding task',
        isLoading: false 
      });
      console.error('Error adding task:', error);
      throw error;
    }
  },
  
  removeTask: async (taskId: number) => {
    set({ isLoading: true, error: null });
    try {
      await api.tasks.delete(taskId);
      set((state) => ({
        tasks: state.tasks.filter(task => {
          // Handle both string and number IDs
          const taskIdNum = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
          return taskIdNum !== taskId;
        }),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred while removing task',
        isLoading: false 
      });
      console.error('Error removing task:', error);
      throw error;
    }
  },
}));