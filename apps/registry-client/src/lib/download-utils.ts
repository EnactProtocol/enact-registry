import { CapabilityWrapper } from "@/types/protocol"
import { dump as yamlDump } from 'js-yaml';

export interface ExportData {
  enact: string;
  id: string;
  description: string;
  version: string;
  type: "atomic" | "composite";
  authors: { name: string }[];
  inputs: Record<string, any>;
  tasks: Array<{
    id: string;
    type: string;
    language?: string;
    code?: string;
    description?: string;
  }>;
  flow: {
    steps: Array<{
      task: string;
      dependencies?: string[];
    }>;
  };
  outputs: Record<string, any>;
}

export const downloadUtils = {
  getExportData(task: CapabilityWrapper): ExportData {
    return {
      enact: task.protocolDetails.enact,
      id: task.protocolDetails.id,
      description: task.protocolDetails.description,
      version: task.protocolDetails.version,
      type: task.isAtomic ? "atomic" : "composite",
      authors: task.protocolDetails.authors,
      inputs: task.protocolDetails.inputs,
      tasks: task.protocolDetails.tasks.map(t => ({ ...t, type: t.type || 'default' })),
      flow: task.protocolDetails.flow,
      outputs: task.protocolDetails.outputs
    };
  },

  downloadFile(data: any, filename: string, type: 'json' | 'yaml') {
    let content: string;
    let mimeType: string;

    if (type === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    } else {
      content = yamlDump(data, {
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
    const filename = `${task.protocolDetails.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    this.downloadFile(exportData, filename, 'yaml');
  },

  downloadJSON(task: CapabilityWrapper) {
    const exportData = this.getExportData(task);
    const filename = `${task.protocolDetails.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    this.downloadFile(exportData, filename, 'json');
  }
};