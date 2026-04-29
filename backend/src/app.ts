import "dotenv/config";
import path from "path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./core/config";
import { logger } from "./core/utils/logger";
import { errorHandler } from "./core/middlewares/errorHandler";
import { redis } from "./infra/redis/client";
import { db } from "./infra/db/client";
import { registerRoutes } from "./routes";

async function buildServer() {
  const server = Fastify({
    logger: false, // We use our own Pino instance
    genReqId: () => crypto.randomUUID(),
    trustProxy: config.NODE_ENV === "production",
  });

  // ── Security headers ────────────────────────────────────────────────────────
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Gallery images served cross-origin
  });

  // ── CORS ────────────────────────────────────────────────────────────────────
  await server.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        // Allow server-to-server and curl calls
        callback(null, true);
        return;
      }
      const allowed = config.ALLOWED_ORIGINS;
      if (allowed.some((o) => origin.startsWith(o))) {
        callback(null, true);
      } else {
        logger.warn({ origin }, "CORS: rejected request from unlisted origin");
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  });

  // ── Rate limiting ───────────────────────────────────────────────────────────
  await server.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    redis,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please slow down.",
      },
    }),
  });

  // ── OpenAPI / Swagger ───────────────────────────────────────────────────────
  await server.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Rishikesh Smart Travel Guide — API",
        description:
          "Production REST API powering the Rishikesh Smart Travel Guide. " +
          "Provides weather proxying, demand-based pricing, trip planning, gallery metadata, and reach intelligence.",
        version: "1.0.0",
        contact: {
          name: "Research Project DP-301P-ISTP",
          email: "gehrishiksha@gmail.com",
        },
      },
      servers: [
        { url: `http://localhost:${config.PORT}`, description: "Local dev" },
      ],
      tags: [
        { name: "Weather", description: "Proxied weather data with Redis caching" },
        { name: "Pricing", description: "Demand-based activity pricing engine" },
        { name: "Planner", description: "Personalised trip itinerary builder" },
        { name: "Gallery", description: "Dynamic image metadata from /assets" },
        { name: "Reach", description: "Route intelligence for reaching Rishikesh" },
        { name: "Health", description: "Health & readiness probes" },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: false,
  });

  // ── Static assets (frontend gallery images) ─────────────────────────────────
  // Serve the frontend's /assets directory so gallery URLs are resolvable.
  // In production, proxy this through nginx or a CDN instead.
  const { default: fastifyStatic } = await import("@fastify/static").catch(
    () => ({ default: null })
  );
  if (fastifyStatic) {
    await server.register(fastifyStatic, {
      root: path.resolve(__dirname, "../../assets"),
      prefix: "/assets/",
      decorateReply: false,
    });
    logger.info("Static assets served from /assets/");
  } else {
    logger.warn(
      "@fastify/static not installed — gallery image URLs will not resolve through this server. " +
        "Install with: npm install @fastify/static"
    );
  }

  // ── Health probes ───────────────────────────────────────────────────────────
  server.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Liveness probe",
        response: { 200: { type: "object" } },
      },
    },
    async (_req, reply) => {
      reply.send({ status: "ok", timestamp: new Date().toISOString() });
    }
  );

  server.get(
    "/ready",
    {
      schema: {
        tags: ["Health"],
        summary: "Readiness probe — checks DB and Redis connectivity",
        response: { 200: { type: "object" } },
      },
    },
    async (_req, reply) => {
      const checks: Record<string, "ok" | "error"> = {};

      try {
        await db.$queryRaw`SELECT 1`;
        checks["database"] = "ok";
      } catch {
        checks["database"] = "error";
      }

      try {
        await redis.ping();
        checks["redis"] = "ok";
      } catch {
        checks["redis"] = "error";
      }

      const allHealthy = Object.values(checks).every((v) => v === "ok");
      reply
        .status(allHealthy ? 200 : 503)
        .send({ status: allHealthy ? "ready" : "degraded", checks });
    }
  );

  // ── API routes (prefix: /api) ───────────────────────────────────────────────
  await server.register(
    async (api) => {
      await registerRoutes(api);
    },
    { prefix: "/api" }
  );

  // ── Error handler ───────────────────────────────────────────────────────────
  server.setErrorHandler(errorHandler);

  // ── 404 fallback ────────────────────────────────────────────────────────────
  server.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found. See /docs for the API reference.",
      },
    });
  });

  // ── Request logging ─────────────────────────────────────────────────────────
  server.addHook("onRequest", async (request) => {
    logger.info(
      { method: request.method, url: request.url, ip: request.ip, reqId: request.id },
      "→ request"
    );
  });

  server.addHook("onSend", async (request, reply) => {
    logger.info(
      { method: request.method, url: request.url, statusCode: reply.statusCode, reqId: request.id },
      "← response"
    );
  });

  return server;
}

// ── Bootstrap ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const server = await buildServer();

  try {
    await redis.connect();
  } catch {
    logger.warn("Redis connection failed on startup — caching disabled. App will still function.");
  }

  await server.listen({ port: config.PORT, host: config.HOST });
  logger.info(
    { port: config.PORT, env: config.NODE_ENV },
    `🏔  Rishikesh Travel API is running`
  );
  logger.info(`📄  API docs available at http://${config.HOST}:${config.PORT}/docs`);
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutdown signal received");
  await db.$disconnect();
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
