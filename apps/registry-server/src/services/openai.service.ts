// src/services/openai.service.ts
import OpenAI from 'openai';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });

    return embeddingResponse.data[0].embedding;
  }
}