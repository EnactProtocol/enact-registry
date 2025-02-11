// src/middlewares/error.middleware.ts
import { Elysia } from 'elysia';

export const errorHandler = new Elysia()
  .onError(({ code, error, set }) => {
    switch (code) {
      case 'VALIDATION':
        set.status = 400;
        return {
          error: 'Validation Error',
          message: error.message
        };
      
      case 'NOT_FOUND':
        set.status = 404;
        return {
          error: 'Not Found',
          message: error.message
        };
      
      default:
        set.status = 500;
        return {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        };
    }
  });