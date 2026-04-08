import { Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify/types/instance";
import { login, register } from "../../services/auth.service.js";
import {
  LoginSchema,
  RegisterSchema,
  TokenResponseSchema,
  type LoginRequest,
  type RegisterRequest,
} from "../../schemas/auth.schema.js";
import { ErrorResponseSchema } from "../../schemas/error.schema.js";
import { authorize } from "../../decorators/jwtDecorator.js";

export const authRoutes = async (app: FastifyInstance) => {
  // POST /auth/register - Inscription
  app.post<{ Body: RegisterRequest }>(
    "/register",
    {
      schema: {
        body: RegisterSchema,
        response: {
          201: TokenResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await register(app.prisma, request.body);
      const token = app.jwt.sign({ id: user.id, role: user.role });
      return reply.status(201).send({ 
        token,
        user,
      });
    },
  );

  // POST /auth/login - Connexion
  app.post<{ Body: LoginRequest }>(
    "/login",
    {
      schema: {
        body: LoginSchema,
        response: {
          200: TokenResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await login(app.prisma, request.body);
      const token = app.jwt.sign({ id: user.id, role: user.role });
      return reply.status(200).send({ 
        token,
        user,
      });
    },
  );

  // GET /auth/me - Récupérer le profil (protégé)
  app.get(
    "/me",
    {
      onRequest: [authorize()],
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
            },
          },
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return reply.status(200).send({
        id: request.user.id,
        email: request.user.email,
        role: request.user.role,
      });
    },
  );
};
