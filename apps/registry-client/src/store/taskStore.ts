// Modified addTask function for TaskStore
import { create } from 'zustand';
import type { Task, InputConfig } from '@/types/protocol';
import { api } from '@/lib/api';

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
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

  addTask: async (taskData: Task) => {
    console.log('sending taskData:', taskData);
    set({ isLoading: true, error: null });
    try {
      // Ensure inputs and outputs are properly structured
      const task: Task = {
        ...taskData,
        protocolDetails: {
          ...taskData.protocolDetails,
        }
      };

      const newTask = await api.tasks.add(task);
      set((state) => ({ 
        tasks: state.tasks ? [...state.tasks, newTask]: [newTask],
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
        tasks: state.tasks.filter(task => task.id !== taskId),
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