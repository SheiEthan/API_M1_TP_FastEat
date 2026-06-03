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
import { loginRateLimiter } from "../../services/loginRateLimiter.service.js";

export const authRoutes = async (app: FastifyInstance) => {
  // POST /auth/register - Inscription
  app.post<{ Body: RegisterRequest }>(
    "/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Créer un compte",
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
        tags: ["Auth"],
        summary: "Se connecter",
        body: LoginSchema,
        response: {
          200: TokenResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ip = request.ip;
      const check = loginRateLimiter.check(ip);

      if (!check.allowed) {
        const message =
          check.reason === "hard_ban"
            ? `Trop de tentatives. IP bloquée pour ${check.retryAfter} secondes.`
            : `Trop d'échecs. Réessayez dans ${check.retryAfter} secondes.`;
        return reply
          .status(429)
          .header("Retry-After", String(check.retryAfter))
          .send({
            type: "urn:app:error:rate-limit",
            title: "Too Many Requests",
            status: 429,
            detail: message,
            instance: request.url,
          });
      }

      try {
        const user = await login(app.prisma, request.body);
        const token = app.jwt.sign({ id: user.id, role: user.role });
        loginRateLimiter.recordSuccess(ip);
        return reply.status(200).send({ token, user });
      } catch (err) {
        loginRateLimiter.recordFailure(ip);
        const remaining = loginRateLimiter.remainingAttempts(ip);
        return reply
          .status(401)
          .header("X-RateLimit-Remaining", String(remaining))
          .send({
            type: "urn:app:error:unauthorized",
            title: "Unauthorized",
            status: 401,
            detail: remaining > 0
              ? `Identifiants incorrects. ${remaining} tentative(s) restante(s).`
              : "Identifiants incorrects. IP bloquée pour 15 minutes.",
            instance: request.url,
          });
      }
    },
  );

  // GET /auth/me - Récupérer le profil (protégé)
  app.get(
    "/me",
    {
      onRequest: [authorize()],
      schema: {
        tags: ["Auth"],
        summary: "Récupérer mon profil",
        security: [{ bearerAuth: [] }],
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
