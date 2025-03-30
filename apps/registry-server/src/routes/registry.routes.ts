// FILE: src/routes/registry.routes.ts
import { Elysia, t } from 'elysia';
import { RegistryController } from '../controllers/registry.controller';

const registryController = new RegistryController();

export const registryRoutes = new Elysia({ prefix: '/registry' })
  // Get all capabilities in the registry
  .get('/', 
    (context) => registryController.getAllCapabilities(context),
    {
      query: t.Optional(t.Object({
        format: t.Optional(t.String())
      }))
    }
  )
  
  // Search capabilities
  .post('/search', 
    (context) => registryController.searchCapabilities(context),
    {
      body: t.Object({
        query: t.String(),
        format: t.Optional(t.String()),
        limit: t.Optional(t.Number())
      })
    }
  )
  
  // Alternative search with GET (query params)
  .get('/search', 
    async (context) => {
      const query = context.query.q;
      const format = context.query.format;
      const limit = context.query.limit ? parseInt(context.query.limit) : undefined;
      
      if (!query) {
        return new Response(
          JSON.stringify({ 
            error: "Missing search query",
            message: "Please provide a search query using the 'q' parameter"
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return registryController.searchCapabilities({
        body: { query, format, limit },
        request: context.request
      } as any);
    }
  )
  
  // Delete a capability from the registry
  .delete('/:id', 
    (context) => registryController.deleteCapability(context),
    {
      params: t.Object({
        id: t.String()
      })
    }
  )
  
  // Get registry statistics
  .get('/stats', 
    () => registryController.getStatistics()
  )
  
  // Batch import capabilities
  .post('/import', 
    (context) => registryController.importCapabilities(context),
    {
      body: t.Object({
        capabilities: t.Array(t.Object({
          id: t.String(),
          content: t.String(),
          format: t.Optional(t.String())
        })),
        options: t.Optional(t.Object({
          strictValidation: t.Optional(t.Boolean()),
          skipExisting: t.Optional(t.Boolean())
        }))
      })
    }
  )
  
  // Health check
  .get('/health', 
    () => registryController.checkHealth()
  );