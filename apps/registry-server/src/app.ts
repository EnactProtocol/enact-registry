// FILE: src/app.ts
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { capabilityRoutes } from './routes/capability.routes';
import { registryRoutes } from './routes/registry.routes';
import { errorHandler } from './middlewares/error.middleware';
import { initializeSchemaRegistry } from './config/schema-registry';
import logger from './logger';

try {
  initializeSchemaRegistry();
  logger.info('Schema registry initialized successfully');
} catch (error) {
  logger.error('Failed to initialize schema registry:', error);
}

const app = new Elysia()
    .use(cors({
        origin: ['http://localhost:3002', 'http://127.0.0.1:5501'], 
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    }))
    .use(errorHandler)
    .decorate('parseJson', true)
    .group('/api', app => app
        .use(capabilityRoutes) 
        .use(registryRoutes)  
    )
    .get('/health', () => ({ 
        status: 'ok',
        schema_registry: 'initialized'
    })).get('/health', () => ({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        components: {
            api: 'operational',
            schema_registry: 'initialized'
        }
    }));;

export default app;