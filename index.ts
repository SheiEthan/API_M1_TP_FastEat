import "./config/dotenvx.js";
import fastify, { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./routes/index.js";
import { websocketRoutes } from "./routes/websocket/index.js";
import { registerGraphQL } from "./graphql/index.js";
import { AppError } from "./common/exceptions.js";
import jwtDecorator from "./decorators/jwtDecorator.js";
import { prisma } from "./prisma/prismaInstance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

// Gestionnaire d'erreurs global (RFC 7807)
server.setErrorHandler((error, request, reply) => {
  // Enregistrer l'erreur complète côté serveur pour le debugging
  server.log.error({
    err: error,
    url: request.url,
    method: request.method,
  });

  // AppError: utiliser le format RFC 7807
  if (error instanceof AppError) {
    const problemDetail = error.problemDetail;
    problemDetail.instance = request.url;
    return reply.status(error.statusCode).send(problemDetail);
  }

  // Erreurs de validation Fastify
  const validationError = error as FastifyError;
  if (validationError.code === "FST_ERR_VALIDATION") {
    return reply.status(400).send({
      type: "urn:app:error:validation",
      title: "Validation Error",
      status: 400,
      detail: validationError.message,
      instance: request.url,
    });
  }

  reply.status(500).send({
    type: "urn:app:error:internal",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred",
    instance: request.url,
  });
});

server.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = "0.0.0.0";

    // Décorer l'instance Fastify avec Prisma
    server.decorate("prisma", prisma);

    await server.register(cors, {});

    // Swagger / OpenAPI
    await server.register(swagger, {
      openapi: {
        openapi: "3.0.3",
        info: {
          title: "Fastify Demo API",
          description: "API REST pour la gestion de restaurants, plats et commandes",
          version: "1.0.0",
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
        tags: [
          { name: "Auth", description: "Authentification et profil" },
          { name: "Users", description: "Gestion des utilisateurs" },
          { name: "Restaurants", description: "Gestion des restaurants" },
          { name: "Dishes", description: "Gestion des plats" },
          { name: "Orders", description: "Gestion des commandes" },
        ],
      },
    });

    await server.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
      },
    });

    // Enregistrer le plugin WebSocket
    await server.register(websocket);

    // Enregistrer le décorateur JWT
    await server.register(jwtDecorator);

    // Enregistrer les routes API
    await registerRoutes(server);

    // Enregistrer les routes WebSocket
    await server.register(websocketRoutes, { prefix: "/ws" });

    // Enregistrer GraphQL
    await registerGraphQL(server);

    await server.ready();

    await server.listen({ port, host });
    server.log.info(`Server running on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
