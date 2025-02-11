# Bun API Project

A basic API project built with Bun and Elysia.

## Setup

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Start production server
bun run start
```

## API Endpoints

- GET /health - Health check endpoint
- GET /api/users - Get all users
- POST /api/users - Create a new user

## Project Structure

```
src/
├── controllers/    # Request handlers
├── routes/        # Route definitions
├── middlewares/   # Custom middlewares
├── services/      # Business logic
├── config/        # Configuration files
├── types/         # TypeScript type definitions
├── app.ts         # Main application setup
└── server.ts      # Server entry point
```
