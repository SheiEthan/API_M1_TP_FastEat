import "../../config/dotenvx.js";
import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "../../routes/index.js";
import { AppError } from "../../common/exceptions.js";
import jwtDecorator from "../../decorators/jwtDecorator.js";
import { FastifyError } from "fastify";
import { prisma } from "../../prisma/prismaInstance.js";

export async function createTestServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: false,
  });

  // Gestionnaire d'erreurs global
  server.setErrorHandler((error, request, reply) => {
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

  // Décorer avec Prisma
  server.decorate("prisma", prisma);

  // Ajouter CORS
  await server.register(cors, {});

  // Ajouter JWT decorator
  await server.register(jwtDecorator);

  // Enregistrer les routes
  await registerRoutes(server);

  return server;
}

export async function closeTestServer(server: FastifyInstance) {
  await server.close();
}
