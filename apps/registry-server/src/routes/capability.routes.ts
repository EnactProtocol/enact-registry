// FILE: src/routes/capability.routes.ts
import { Elysia, t } from 'elysia';
import { CapabilityController } from '../controllers/capability.controller';

const capabilityController = new CapabilityController();

export const capabilityRoutes = new Elysia({ prefix: '/capabilities' })
  // Create a new capability
  .post('/', 
    (context) => capabilityController.createCapability(context),
    {
      body: t.Object({
        file: t.String(),
        options: t.Optional(t.Object({
          strictValidation: t.Optional(t.Boolean()),
          format: t.Optional(t.String())
        }))
      })
    }
  )
  
  // Get a capability by ID
  .get('/:id', 
    (context) => capabilityController.getCapability(context),
    {
      params: t.Object({
        id: t.String()
      }),
      query: t.Optional(t.Object({
        format: t.Optional(t.String()),
        raw: t.Optional(t.String())
      }))
    }
  )
  
  // Update a capability
  .put('/:id', 
    (context) => capabilityController.updateCapability(context),
    {
      params: t.Object({
        id: t.String()
      }),
      body: t.Object({
        file: t.String(),
        targetFormat: t.Optional(t.String()),
        options: t.Optional(t.Object({
          strictValidation: t.Optional(t.Boolean()),
          preserveMetadata: t.Optional(t.Boolean())
        }))
      })
    }
  )
  
  // Convert a capability to different format
  .post('/:id/convert', 
    (context) => capabilityController.convertCapability(context),
    {
      params: t.Object({
        id: t.String()
      }),
      body: t.Object({
        targetFormat: t.String(),
        preserveMetadata: t.Optional(t.Boolean())
      })
    }
  )
  
  // Validate a capability without storing it
  .post('/validate', 
    (context) => capabilityController.validateCapability(context),
    {
      body: t.Object({
        file: t.String(),
        options: t.Optional(t.Object({
          strictValidation: t.Optional(t.Boolean()),
          format: t.Optional(t.String())
        }))
      })
    }
  );