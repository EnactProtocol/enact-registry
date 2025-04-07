import { CapabilityWrapper, EnactDocument } from "@enact/types"


const SERVER = import.meta.env.VITE_REGISTRY;

export const api = {
  tasks: {
    getAll: async (): Promise<CapabilityWrapper[]> => {
      const response = await fetch(`${SERVER}/api/task`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('API getAll data:', data);
      return data;
    },
    
    add: async (task: CapabilityWrapper): Promise<CapabilityWrapper> => {
      // Ensure the task conforms to the expected schema before sending
      const conformingTask = {
        ...task,
        protocolDetails: {
          ...task.protocolDetails,
          // Ensure these fields are present as they're required by the schema
          enact: task.protocolDetails.enact || "1.0.0",
          id: task.protocolDetails.id,
          description: task.protocolDetails.description,
          version: task.protocolDetails.version,
          type: task.protocolDetails.type,
          authors: task.protocolDetails.authors || [],
        }
      };
      
      const response = await fetch(`${SERVER}/api/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conformingTask),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      return data.task || data; // Handle both response formats
    },
    
    delete: async (taskId: number): Promise<void> => {
      const response = await fetch(`${SERVER}/api/task/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
    },
    
    // Add a method to get a specific task by ID
    getById: async (taskId: number | string): Promise<CapabilityWrapper> => {
      const response = await fetch(`${SERVER}/api/task/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    },
    
    // Add a method to update an existing task
    update: async (taskId: number | string, task: CapabilityWrapper): Promise<CapabilityWrapper> => {
      const response = await fetch(`${SERVER}/api/task/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      return data.task || data;
    }
  },
};