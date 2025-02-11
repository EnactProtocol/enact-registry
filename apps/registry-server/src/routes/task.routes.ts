import { Elysia, t } from 'elysia';
import { TaskController } from '../controllers/task.controller';

const taskController = new TaskController();

export const taskRoutes = new Elysia({ prefix: '/task' })
  .post('/add',
    (context) => taskController.addTask(context),
    {
      body: t.Object({
        description: t.String(),
        // Add additional task properties as needed
      })
    }
  );
