import { Elysia, t } from 'elysia';
import { TaskController } from '../controllers/task.controller';

const taskController = new TaskController();

export const taskRoutes = new Elysia({ prefix: '/task' })
  .get('/', () => taskController.getAllTasks())
  .post('/', 
    (context) => taskController.addTask(context),
    {
      body: t.Object({
        // Define task schema based on your Task type
        name: t.String(),
        description: t.String(),
        version: t.String(),
        isAtomic: t.Boolean(),
        protocolDetails: t.Object({
          // Add protocol details schema
        })
      })
    }
  )
  .delete('/:id', 
    (context) => taskController.deleteTask(context),
    {
      params: t.Object({
        id: t.String()
      })
    }
  );
