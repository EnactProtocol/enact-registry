import { EnactDocument, JsonSchema, InputsOutputsSchema, CapabilityWrapper } from '@enact/types'
import { dump as yamlDump } from 'js-yaml';

// Interface that matches the Enact Protocol schema for export
export interface EnactExportDocument {
  enact: string;
  id: string;
  description: string;
  version: string;
  type: "atomic" | "composite";
  authors: { name: string; email?: string; url?: string }[];
  doc?: string;
  inputs?: InputsOutputsSchema;
  dependencies?: {
    version?: string;
    packages?: Array<{ name: string; version?: string }>;
  };
  tasks?: Array<{
    id: string;
    type: "script" | "request" | "agent" | "prompt" | "shell";
    language?: string;
    code?: string;
    dependencies?: {
      version?: string;
      packages?: Array<{ name: string; version?: string }>;
    };
  }>;
  imports?: Array<{ id: string; version: string }>;
  flow?: {
    steps: Array<{
      capability: string;
      inputs?: Record<string, any>;
      dependencies?: string[];
    }>;
  };
  outputs?: InputsOutputsSchema;
  env?: {
    vars?: Record<string, JsonSchema>;
    resources?: {
      memory?: string;
      timeout?: string;
    };
  };
}

export const downloadUtils = {
  getExportData(task: CapabilityWrapper): EnactExportDocument {
    const pd = task.protocolDetails;
    
    // Convert flow steps if they use the old format
    const flowSteps = pd.flow?.steps?.map(step => {
      if ('task' in step && !('capability' in step)) {
        return {
          capability: step.task as string,
          inputs: (step as any).with, // Map the old 'with' to the new 'inputs'
          dependencies: step.dependencies
        };
      }
      return step;
    }) || [];

    // Create the export document matching the schema
    const exportData: EnactExportDocument = {
      enact: pd.enact,
      id: pd.id,
      description: pd.description,
      version: pd.version,
      type: pd.type || (task.isAtomic ? "atomic" : "composite"),
      authors: pd.authors || [],
      // Only include fields that exist to avoid null/undefined values
      ...(pd.doc && { doc: pd.doc }),
      
      // Handle inputs with new JSON Schema format
      ...(pd.inputs && { 
        inputs: pd.inputs.type ? pd.inputs : {
          type: "object",
          properties: pd.inputs,
          required: []
        }
      }),
      
      ...(pd.dependencies && { dependencies: pd.dependencies }),
      
      ...(pd.tasks && pd.tasks.length > 0 && { 
        tasks: pd.tasks.map(t => ({ 
          ...t, 
          type: t.type || 'script' // Default to 'script' type
        }))
      }),
      
      ...(pd.imports && pd.imports.length > 0 && { imports: pd.imports }),
      
      flow: {
        steps: flowSteps
      },
      
      // Handle outputs with new JSON Schema format
      ...(pd.outputs && { 
        outputs: pd.outputs.type ? pd.outputs : {
          type: "object",
          properties: pd.outputs,
          required: []
        }
      }),
      
      // Handle environment variables with new format
      ...(pd.env && { 
        env: {
          ...(pd.env.vars && { vars: pd.env.vars }),
          ...(pd.env.resources && { resources: pd.env.resources })
        }
      })
    };

    return exportData;
  },

  downloadFile(data: any, filename: string, type: 'json' | 'yaml') {
    let content: string;
    let mimeType: string;
    
    if (type === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    } else {
      // Clean up data for YAML export - remove undefined and null values
      const cleanData = JSON.parse(JSON.stringify(data));
      
      content = yamlDump(cleanData, {
        indent: 2,
        lineWidth: -1, // Don't wrap long lines
        noRefs: true, // Don't use aliases
        quotingType: '"' // Use double quotes
      });
      mimeType = 'application/x-yaml';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Append, click, and clean up
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  
  downloadYAML(task: CapabilityWrapper) {
    const exportData = this.getExportData(task);
    const filename = `${task.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    this.downloadFile(exportData, filename, 'yaml');
  },
  
  downloadJSON(task: CapabilityWrapper) {
    const exportData = this.getExportData(task);
    const filename = `${task.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    this.downloadFile(exportData, filename, 'json');
  }
};