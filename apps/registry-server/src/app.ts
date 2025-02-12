import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { yamlRoutes } from './routes/yaml.routes';
import { taskRoutes } from './routes/task.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = new Elysia()
    .use(cors({
        origin: 'http://localhost:3002', // Your frontend URL
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    }))
    .use(errorHandler)
    .decorate('parseJson', true)
    .group('/api', app => app
        .use(yamlRoutes)
        .use(taskRoutes)
    )
    .get('/health', () => ({ status: 'ok' }));

export default app;
