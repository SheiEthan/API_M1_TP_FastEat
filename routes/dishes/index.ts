import { FastifyInstance } from "fastify";
import {
  createDish,
  getDishesByRestaurant,
  getDishById,
  getAllDishes,
  updateDish,
  deleteDish,
} from "../../services/dishes.service.js";
import {
  CreateDishSchema,
  UpdateDishSchema,
  DishResponseSchema,
  type CreateDishRequest,
  type UpdateDishRequest,
} from "../../schemas/dishes.schema.js";
import { createPaginatedSchema, PaginationQuerySchema } from "../../schemas/common.schema.js";
import { ErrorResponseSchema } from "../../schemas/error.schema.js";
import { authorize } from "../../decorators/jwtDecorator.js";

export const dishesRoutes = async (app: FastifyInstance) => {
  // GET /restaurants/:restaurantId/dishes - Lister les plats (public) avec pagination
  app.get<{ Params: { restaurantId: string }; Querystring: { limit?: string; offset?: string } }>(
    "/:restaurantId/dishes",
    {
      schema: {
        tags: ["Dishes"],
        summary: "Lister les plats d'un restaurant",
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedSchema(DishResponseSchema),
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const limit = request.query.limit ? Math.min(parseInt(request.query.limit), 100) : 10;
      const offset = request.query.offset ? parseInt(request.query.offset) : 0;
      
      const result = await getDishesByRestaurant(
        app.prisma,
        request.params.restaurantId,
        limit,
        offset
      );
      return reply.status(200).send(result);
    }
  );

  // POST /restaurants/:restaurantId/dishes - Créer un plat (authentifié + propriétaire)
  app.post<{ Params: { restaurantId: string }; Body: CreateDishRequest }>(
    "/:restaurantId/dishes",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        tags: ["Dishes"],
        summary: "Créer un plat",
        security: [{ bearerAuth: [] }],
        body: CreateDishSchema,
        response: {
          201: DishResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const dish = await createDish(
        app.prisma,
        request.params.restaurantId,
        request.user.id,
        request.body
      );
      return reply.status(201).send(dish);
    }
  );

  // GET /restaurants/:restaurantId/dishes/:dishId - Détails d'un plat (public)
  app.get<{ Params: { restaurantId: string; dishId: string } }>(
    "/:restaurantId/dishes/:dishId",
    {
      schema: {
        tags: ["Dishes"],
        summary: "Détails d'un plat",
        response: {
          200: DishResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const dish = await getDishById(app.prisma, request.params.dishId);
      return reply.status(200).send(dish);
    }
  );

  // PATCH /restaurants/:restaurantId/dishes/:dishId - Modifier un plat
  app.patch<{
    Params: { restaurantId: string; dishId: string };
    Body: UpdateDishRequest;
  }>(
    "/:restaurantId/dishes/:dishId",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        tags: ["Dishes"],
        summary: "Modifier un plat",
        security: [{ bearerAuth: [] }],
        body: UpdateDishSchema,
        response: {
          200: DishResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await updateDish(
        app.prisma,
        request.params.dishId,
        request.user.id,
        request.body
      );
      return reply.status(200).send(updated);
    }
  );

  // DELETE /restaurants/:restaurantId/dishes/:dishId - Supprimer un plat
  app.delete<{ Params: { restaurantId: string; dishId: string } }>(
    "/:restaurantId/dishes/:dishId",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        tags: ["Dishes"],
        summary: "Supprimer un plat",
        security: [{ bearerAuth: [] }],
        response: {
          204: { type: "null" },
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteDish(
        app.prisma,
        request.params.dishId,
        request.user.id
      );
      return reply.status(204).send();
    }
  );
};

export const dishesGlobalRoutes = async (app: FastifyInstance) => {
  app.get<{ Querystring: { restaurantId?: string } }>(
    "/",
    {
      schema: {
        tags: ["Dishes"],
        summary: "Lister tous les plats",
        querystring: {
          type: "object",
          properties: { restaurantId: { type: "string", description: "Filtrer par restaurant" } },
        },
        response: { 200: { type: "array", items: DishResponseSchema } },
      },
    },
    async (request, reply) => {
      const dishes = await getAllDishes(app.prisma, request.query.restaurantId);
      return reply.status(200).send(dishes);
    },
  );

  app.get<{ Params: { dishId: string } }>(
    "/:dishId",
    {
      schema: {
        tags: ["Dishes"],
        summary: "Détails d'un plat par ID",
        response: { 200: DishResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const dish = await getDishById(app.prisma, request.params.dishId);
      return reply.status(200).send(dish);
    },
  );
};
