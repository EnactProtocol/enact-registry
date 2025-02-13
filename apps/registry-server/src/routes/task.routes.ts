import { Elysia, t } from 'elysia';
import { TaskController } from '../controllers/task.controller';

const taskController = new TaskController();

export const taskRoutes = new Elysia({ prefix: '/task' })
  .get('/', () => taskController.getAllTasks())
  .post('/', 
    (context) => taskController.addTask(context),
    {
      body: t.Object({
        id: t.Optional(t.Union([t.String(), t.Number()])),
        name: t.String(),
        description: t.String(),
        version: t.String(),
        teams: t.Array(t.Any()),
        isAtomic: t.Boolean(),
        protocolDetails: t.Object({
          enact: t.String(),
          id: t.String(),
          name: t.String(),
          description: t.String(),
          version: t.String(),
          authors: t.Array(t.Object({
            name: t.String()
          })),
          inputs: t.Record(t.String(), t.Object({
            type: t.String(),
            description: t.String(),
            default: t.Optional(t.Any())
          })),
          tasks: t.Array(t.Object({
            id: t.String(),
            type: t.String(),
            language: t.String(),
            code: t.String()
          })),
          flow: t.Object({
            steps: t.Array(t.Object({
              task: t.String()
            }))
          }),
          outputs: t.Record(t.String(), t.Object({
            type: t.String(),
            description: t.String()
          }))
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