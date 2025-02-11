import { Elysia, t } from 'elysia';
import { YamlController } from '../controllers/yaml.controller';

const yamlController = new YamlController();

export const yamlRoutes = new Elysia({ prefix: '/yaml' })
  .post('/process', 
    (context) => yamlController.processYaml(context),
    {
      body: t.Object({
        file: t.String() // Change from t.File to t.String since we'll send YAML content directly
      })
    }
  )
  .post('/search', async ({ body }: any) => {
    const { query } = body;
    const embedding = await yamlController.openAIService.generateEmbedding(query);
    return yamlController.dbService.findSimilarCapabilities(embedding);
  })
  .post('/task', async ({ body }: any) => {
    const { taskId } = body;
    console.log('Received task ID:', taskId);
    return yamlController.dbService.getCapabilityById(taskId);
  });
  ;
