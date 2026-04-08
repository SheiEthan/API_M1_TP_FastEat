import type { FastifyInstance } from "fastify";
import {
  updateUser,
  deleteUser,
  getUserById,
} from "../../services/users.service.js";
import {
  UpdateProfileSchema,
  UserResponseSchema,
  type UpdateProfileRequest,
} from "../../schemas/user.schema.js";
import { ErrorResponseSchema } from "../../schemas/error.schema.js";
import { authorize } from "../../decorators/jwtDecorator.js";

export const meRoutes = async (app: FastifyInstance) => {
  /**
   * GET /users/me - Récupérer le profil de l'utilisateur connecté
   */
  app.get(
    "/users/me",
    {
      onRequest: [authorize(["USER", "RESTAURANT", "ADMIN"])],
      schema: {
        response: {
          200: UserResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await getUserById(app.prisma, request.user.id);
      return reply.status(200).send(user);
    },
  );

  /**
   * PATCH /users/me - Modifier le profil de l'utilisateur connecté
   */
  app.patch<{ Body: UpdateProfileRequest }>(
    "/users/me",
    {
      onRequest: [authorize(["USER", "RESTAURANT", "ADMIN"])],
      schema: {
        body: UpdateProfileSchema,
        response: {
          200: UserResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await updateUser(
        app.prisma,
        request.user.id,
        request.body,
      );
      return reply.status(200).send(user);
    },
  );

  /**
   * DELETE /users/me - Supprimer le compte de l'utilisateur connecté
   */
  app.delete(
    "/users/me",
    {
      onRequest: [authorize(["USER", "RESTAURANT", "ADMIN"])],
      schema: {
        response: {
          204: { type: "null" },
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteUser(app.prisma, request.user.id);
      return reply.status(204).send();
    },
  );
};
