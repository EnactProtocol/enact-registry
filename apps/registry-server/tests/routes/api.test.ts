import { describe, expect, it } from "bun:test";
import app from "../../src/app";

describe("API Routes", () => {
  describe("Health Check", () => {
    it("should return 200 OK", async () => {
      const response = await app.handle(
        new Request("http://localhost/health")
      );
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ status: "ok" });
    });
  });

  describe("YAML Routes", () => {
    it("should handle YAML processing", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/yaml/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            file: "name: test\ndescription: test"
          })
        })
      );
      
      // expect(response.status).toBe(200);
    });
  });

  describe("Task Routes", () => {
    it("should get all tasks", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/task")
      );
      
      expect(response.status).toBe(200);
    });
  });
});
