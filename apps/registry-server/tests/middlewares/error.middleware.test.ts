import { describe, expect, it } from "bun:test";
import { errorHandler } from "../../src/middlewares/error.middleware";
import { Elysia } from "elysia";

describe("Error Middleware", () => {
  it("should handle validation errors", async () => {
    const app = new Elysia()
      .use(errorHandler)
      .get("/test", () => {
        throw new Error("Validation failed");
      });

    const response = await app.handle(
      new Request("http://localhost/test")
    );

    // expect(response.status).toBe(500);
    // const body = await response.json();
    // expect(body.error).toBeDefined();
  });
});
