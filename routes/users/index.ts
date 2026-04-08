import { FastifyInstance } from "fastify";
import { UserService } from "../../services/user.service.js";
import { meRoutes } from "./me.js";
import { loggerDecorator } from "../../decorators/index.js";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserResponseSchema,
} from "../../schemas/user.schema.js";
import type {
  UserRequest,
  UserUpdateRequest,
} from "../../schemas/user.schema.js";

export const userRoutes = async (app: FastifyInstance) => {
  const userService = new UserService(app.prisma);

  // Enregistrer les routes /users/me DIRECTEMENT (pas via register())
  await meRoutes(app);

  // GET /users - Récupérer tous les utilisateurs
  app.get(
    "/users",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])],
      schema: {
        response: {
          200: {
            type: "array",
            items: UserResponseSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const users = await userService.getAllUsers();
      return reply.send(users);
    },
  );

  // GET /users/:id - Récupérer un utilisateur par ID (APRÈS /users/me!)
  app.get(
    "/users/:id",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: UserResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await userService.getUserById(id);
      return reply.send(user);
    },
  );

  // POST /users - Créer un nouvel utilisateur
  app.post<{ Body: UserRequest }>(
    "/users",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])],
      schema: {
        body: CreateUserSchema,
        response: {
          201: UserResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await userService.createUser(request.body);
      return reply.status(201).send(user);
    },
  );

  // PUT /users/:id - Mettre à jour un utilisateur
  app.put<{ Body: UserUpdateRequest; Params: { id: string } }>(
    "/users/:id",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        body: UpdateUserSchema,
        response: {
          200: UserResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updatedUser = await userService.updateUser(
        id,
        request.user.id,
        request.body,
      );
      return reply.send(updatedUser);
    },
  );

  // DELETE /users/:id - Supprimer un utilisateur
  app.delete(
    "/users/:id",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: UserResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const deletedUser = await userService.deleteUser(id, request.user.id);
      return reply.send(deletedUser);
    },
  );
};
