#!/usr/bin/env node

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import http from "node:http";

// Plex shared module
import {
  PlexClient,
  PlexTools,
  createPlexToolRegistry,
  PLEX_CORE_TOOL_SCHEMAS,
  DEFAULT_PLEX_URL,
} from "./plex/index.js";

// Arr integration
import { ArrMCPFunctions } from "./arr/mcp-functions.js";
import { ARR_TOOL_SCHEMAS } from "./arr/tool-schemas.js";
import { createArrToolRegistry } from "./arr/tool-registry.js";

function createMcpServer(): Server {
  const server = new Server(
    { name: "plex-arr-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  const plexToken = process.env.PLEX_TOKEN;
  if (!plexToken) {
    throw new Error("PLEX_TOKEN environment variable is required");
  }

  const plexClient = new PlexClient({
    baseUrl: process.env.PLEX_URL || DEFAULT_PLEX_URL,
    token: plexToken,
  });

  const plexTools = new PlexTools(plexClient);
  const plexRegistry = createPlexToolRegistry(plexTools);
  const arrFunctions = new ArrMCPFunctions();
  const arrRegistry = createArrToolRegistry(arrFunctions);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...PLEX_CORE_TOOL_SCHEMAS, ...ARR_TOOL_SCHEMAS],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args ?? {}) as Record<string, unknown>;

    try {
      if (plexRegistry.has(name)) {
        return await plexRegistry.handle(name, a);
      }
      return await arrRegistry.handle(name, a);
    } catch (error) {
      if (error instanceof McpError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Error executing ${name}: ${msg}`);
    }
  });

  return server;
}

async function runHttp(port: number) {
  const httpServer = http.createServer(async (req, res) => {
    if (req.url !== "/mcp") {
      res.writeHead(404).end("Not found");
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405).end("Method not allowed");
      return;
    }

    // Stateless: fresh server + transport per request so connect() is never called twice
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    res.on("close", () => transport.close());

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.error(`Plex-Arr MCP server running on http://0.0.0.0:${port}/mcp`);
  });
}

async function main() {
  const mode = process.env.TRANSPORT;
  if (mode === "http") {
    const port = parseInt(process.env.MCP_PORT || "3000", 10);
    await runHttp(port);
  } else {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Plex-Arr MCP server running on stdio");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
