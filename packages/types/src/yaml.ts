import { TaskData } from "./protocol"

export interface ProcessedCapability extends TaskData {
    embedding: number[];
    raw: string;
  }