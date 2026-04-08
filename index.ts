import "./config/dotenvx.js";
import fastify, { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./routes/index.js";
import { AppError } from "./common/exceptions.js";
import jwtDecorator from "./decorators/jwtDecorator.js";
import { prisma } from "./prisma/prismaInstance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = fastify({
  logger: true,
});

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

    // Enregistrer le décorateur JWT
    await server.register(jwtDecorator);

    await registerRoutes(server);

    await server.ready();

    await server.listen({ port, host });
    server.log.info(`Server running on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
