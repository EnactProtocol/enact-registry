import { Elysia, t } from 'elysia';
import { YamlController } from '../controllers/yaml.controller';

const yamlController = new YamlController();

export const yamlRoutes = new Elysia({ prefix: '/yaml' })
    .post('/search', async ({ body }: any) => {
      const { query } = body;
      const embedding = await yamlController.openAIService.generateEmbedding(query);
      return yamlController.dbService.findSimilarCapabilities(embedding);
    })
    .post('/task', async ({ body }: any) => {
      const { taskId } = body;
      console.log('Received task ID:', taskId);
      return yamlController.dbService.getCapabilityById(taskId);
    })
    .post('/process', 
      (context) => yamlController.processYaml(context),
      {
        body: t.Object({
          file: t.String() 
        })
      }
    )
    .get('/tasks/:taskId', async ({ params }) => {
      const { taskId } = params;
      
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const decodedTaskId = decodeURIComponent(taskId);
      console.log('Decoded task ID:', decodedTaskId);
      
      const task = await yamlController.dbService.getCapabilityById(decodedTaskId);
      
      if (!task) {
        throw new Error(`Task not found: ${decodedTaskId}`);
      }
      
      return task;
    });;

