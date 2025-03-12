import app from './app';
import figlet from "figlet";
import logger from './logger';
import { staticPlugin } from '@elysiajs/static';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSEElysiaTransport } from "./SSEElysiaTransport"
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'


// Create MCP server
const mcpServer = new McpServer({
  name: "enact-protocol-mcp-server",
  version: "1.0.0"
});

// Add resources
// Static resource for capabilities
mcpServer.resource(
  "capabilities",
  "capabilities://list",
  async (uri) => {
    try {
      // Import the database service to get capabilities
      const { DatabaseService } = await import('./services/db.service');
      const dbService = new DatabaseService();
      const capabilities = await dbService.getAllCapabilities();
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(capabilities)
        }]
      };
    } catch (error) {
      logger.error("Error fetching capabilities:", error);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: "Failed to fetch capabilities" })
        }]
      };
    }
  }
);

// Dynamic resource for individual capability
mcpServer.resource(
  "capability",
  new ResourceTemplate("capability://{id}", { list: undefined }),
  async (uri, { id }) => {
    try {
      // Import the database service to get the capability by ID
      const { DatabaseService } = await import('./services/db.service');
      const dbService = new DatabaseService();
      const capability = await dbService.getCapabilityById(id as string);
      
      return {
        contents: [{
          uri: uri.href,
          text: capability ? capability : JSON.stringify({ error: "Capability not found" })
        }]
      };
    } catch (error) {
      logger.error(`Error fetching capability ${id}:`, error);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: `Failed to fetch capability: ${(error as Error).message}` })
        }]
      };
    }
  }
);

// Add tools

// Tool to process YAML
mcpServer.tool(
  "process-yaml",
  { yaml: z.string() },
  async ({ yaml }) => {
    try {
      // Import the YAML controller
      const { YamlController } = await import('./controllers/yaml.controller');
      const yamlController = new YamlController();
      
      // Process the YAML
      const result = await yamlController.processYaml({ body: { file: yaml } } as any);
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    } catch (error) {
      logger.error("Error processing YAML:", error);
      return {
        content: [{ 
          type: "text", 
          text: `Error processing YAML: ${(error as Error).message}` 
        }],
        isError: true
      };
    }
  }
);

// Tool to search capabilities
mcpServer.tool(
  "search-capabilities",
  { query: z.string() },
  async ({ query }) => {
    try {
      // Import the YAML controller which has the OpenAI service
      const { YamlController } = await import('./controllers/yaml.controller');
      const yamlController = new YamlController();
      
      // Generate embedding and search
      const embedding = await yamlController.openAIService.generateEmbedding(query);
      const results = await yamlController.dbService.findSimilarCapabilities(embedding);
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(results, null, 2) 
        }]
      };
    } catch (error) {
      logger.error("Error searching capabilities:", error);
      return {
        content: [{ 
          type: "text", 
          text: `Error searching capabilities: ${(error as Error).message}` 
        }],
        isError: true
      };
    }
  }
);

// Add prompts
mcpServer.prompt(
  "yaml-analysis",
  { yaml: z.string() },
  ({ yaml }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please analyze this YAML capability document and tell me what it does:\n\n${yaml}`
      }
    }]
  })
);

const transportType = process.argv.includes('--stdio') ? 'stdio' : 'sse';

if (transportType === 'stdio') {
  // Start receiving messages on stdin and sending messages on stdout
  logger.info('Starting with stdio transport');
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  logger.info('Enact Protocol MCP server started with stdio transport');
} else {
  // Store active transports by session ID
  const transports = new Map();

  // Add MCP routes to the existing app
  app.use(staticPlugin({
    assets: './public',
    prefix: '/'
  }))
  .get("/mcp", () => ({
    name: "Enact Protocol MCP Server",
    version: "1.0.0",
    description: "Model Context Protocol integration for Enact Protocol",
    endpoints: {
      "/mcp": "This info",
      "/mcp/sse": "SSE endpoint for MCP connections",
      "/mcp/messages": "Message endpoint for MCP clients"
    }
  }))
  .get("/mcp/sse", async (context) => {
    logger.info("SSE connection requested");
    
    try {
      context.set.headers['content-type'] = 'text/event-stream';
      context.set.headers['cache-control'] = 'no-cache';
      context.set.headers['connection'] = 'keep-alive';
      
      logger.info("Headers set for SSE connection");
      
      try {
        // Create the transport
        logger.info("Creating transport");
        const transport = new SSEElysiaTransport("/mcp/messages", context);
        logger.info(`Transport created with sessionId: ${transport.sessionId}`);
        
        // Store the transport
        logger.info("Storing transport in map");
        transports.set(transport.sessionId, transport);
        logger.info(`Transports map size: ${transports.size}`);
        
        // Connect to MCP server
        logger.info("Connecting to MCP server");
        await mcpServer.connect(transport);
        logger.info("Connected to MCP server");
        
        // Return the response set by the transport
        return context.response;
      } catch (error) {
        const transportError = error as Error;
        logger.error("Transport/connection error:", transportError);
        logger.error(transportError.stack);
        
        // Try to send a proper error response
        return new Response(JSON.stringify({ 
          error: "Transport error", 
          message: transportError.message,
          stack: transportError.stack
        }), {
          status: 500,
          headers: { 'content-type': 'application/json' }
        });
      }
    } catch (error) {
      const outerError = error as Error;
      logger.error("Outer error in SSE handler:", outerError);
      logger.error(outerError.stack);
      
      // Last resort error handler
      return new Response(JSON.stringify({ 
        error: "Server error", 
        message: outerError.message,
        stack: outerError.stack
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  })
  .post("/mcp/messages", async (context) => {
    try {
      // Get session ID
      const url = new URL(context.request.url);
      const sessionId = url.searchParams.get("sessionId");
      
      if (!sessionId || !transports.has(sessionId)) {
        return new Response(JSON.stringify({ error: "Invalid or missing session ID" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get transport and handle message
      const transport = transports.get(sessionId);
      return transport.handlePostMessage(context);
    } catch (error) {
      logger.error("Error handling message:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Start the server
  const port = process.env.PORT || 8081;
  const bannerWord1 = figlet.textSync('Enact', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });
  const bannerWord2 = figlet.textSync('Protocol', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  app.listen(port, () => {
    console.log(bannerWord1);
    console.log(bannerWord2);
    console.log(`🦊 Server is running at http://localhost:${port}`);
    console.log(`🔄 MCP integration at http://localhost:${port}/mcp`);
    logger.info('Enact Protocol server started with MCP integration (SSE transport)');
  });
}