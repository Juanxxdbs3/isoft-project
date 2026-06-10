import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { CONFIG } from "./config.js";
import supabasePlugin from "./plugins/supabase.js";
import authPlugin from "./plugins/auth.js";
import authRouter from "./modules/auth/auth.router.js";
import forumRouter from "./modules/forum/forum.router.js";
import studentsRouter from "./modules/students/students.router.js";
import chatRouter from "./modules/chat/chat.router.js";
import psychologistsRouter from "./modules/psychologists/psychologists.router.js";
import alertsRouter from "./modules/alerts/alerts.router.js";
import casesRouter from "./modules/cases/cases.router.js";

export class Server {
  public readonly app: FastifyInstance;

  constructor() {
    this.app = Fastify({
      logger: {
        level: CONFIG.NODE_ENV === "production" ? "info" : "debug",
        transport:
          CONFIG.NODE_ENV !== "production"
            ? {
                target: "pino-pretty",
                options: {
                  colorize: true,
                  translateTime: "SYS:standard",
                },
              }
            : undefined,
      },
    });
  }

  async #registerMiddlewares(): Promise<void> {
    await this.app.register(cors, {
      origin: CONFIG.NODE_ENV === "development" ? true : CONFIG.CORS_ORIGIN,
      credentials: true,
    });
  }

  async #registerPlugins(): Promise<void> {
    await this.app.register(supabasePlugin);
    await this.app.register(authPlugin);
  }

  async #registerRoutes(): Promise<void> {
    await this.app.register(authRouter, { prefix: "/api/v1/auth" });
    await this.app.register(forumRouter, { prefix: "/api/v1/forum" });
    await this.app.register(studentsRouter, { prefix: "/api/v1/students" });
    await this.app.register(chatRouter, { prefix: "/api/v1/chat" });
    await this.app.register(psychologistsRouter, { prefix: "/api/v1/admin" });
    await this.app.register(alertsRouter, { prefix: "/api/v1/alerts" });
    await this.app.register(casesRouter, { prefix: "/api/v1/cases" });

    this.app.get("/health", async () => ({
      status: "ok",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    }));
  }

  #setErrorHandlers(): void {
    this.app.setErrorHandler((error: unknown, request, reply) => {
      const err = error as Error & { statusCode?: number };
      const statusCode = err.statusCode || 500;
      const code = statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR";

      request.log.error({ err }, `Error ${statusCode}`);

      reply.status(statusCode).send({
        error: code,
        message:
          statusCode >= 500
            ? "Error interno del servidor"
            : err.message || "Error en la solicitud",
        statusCode,
      });
    });

    this.app.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        error: "NOT_FOUND",
        message: `Ruta no encontrada: ${request.method} ${request.url}`,
        statusCode: 404,
      });
    });
  }

  async listen(): Promise<void> {
    await this.#registerMiddlewares();
    await this.#registerPlugins();
    await this.#registerRoutes();
    this.#setErrorHandlers();

    await this.app.listen({
      port: CONFIG.PORT,
      host: "0.0.0.0",
    });

    this.app.log.info(
      `\u{1F680} MindBridge Backend v0.1.0 running on http://0.0.0.0:${CONFIG.PORT}`
    );
    this.app.log.info(`   Environment: ${CONFIG.NODE_ENV}`);
    this.app.log.info(`   Supabase URL: ${CONFIG.SUPABASE_URL}`);
  }
}
