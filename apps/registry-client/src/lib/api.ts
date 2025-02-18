import type { CapabilityWrapper } from '@/types/protocol';

const SERVER = "http://localhost:8080";

export const api = {
  tasks: {
    getAll: async (): Promise<CapabilityWrapper[]> => {
      const response = await fetch(`${SERVER}/api/task`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('data:', data);
      return data;
    },

    add: async (task: CapabilityWrapper): Promise<CapabilityWrapper> => {
      const response = await fetch(`${SERVER}/api/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.task;
    },

    delete: async (taskId: number): Promise<void> => {
      const response = await fetch(`${SERVER}/api/task/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
  },
};