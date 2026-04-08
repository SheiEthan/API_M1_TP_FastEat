import { FastifyInstance } from "fastify";
import {
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  getMyRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "../../services/restaurants.service.js";
import {
  CreateRestaurantSchema,
  UpdateRestaurantSchema,
  RestaurantResponseSchema,
  type CreateRestaurantRequest,
  type UpdateRestaurantRequest,
} from "../../schemas/restaurants.schema.js";
import { createPaginatedSchema, PaginationQuerySchema } from "../../schemas/common.schema.js";
import { ErrorResponseSchema } from "../../schemas/error.schema.js";
import { authorize } from "../../decorators/jwtDecorator.js";

export const restaurantRoutes = async (app: FastifyInstance) => {
  // POST /restaurants - Créer un restaurant (authentifié, rôle RESTAURANT)
  app.post<{ Body: CreateRestaurantRequest }>(
    "/",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        body: CreateRestaurantSchema,
        response: {
          201: RestaurantResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const restaurant = await createRestaurant(
        app.prisma,
        request.user.id,
        request.body
      );
      return reply.status(201).send(restaurant);
    }
  );

  // GET /restaurants - Récupérer tous les restaurants (public) avec pagination
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    "/",
    {
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedSchema(RestaurantResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const limit = request.query.limit ? Math.min(parseInt(request.query.limit), 100) : 10;
      const offset = request.query.offset ? parseInt(request.query.offset) : 0;
      
      const result = await getAllRestaurants(app.prisma, limit, offset);
      return reply.status(200).send(result);
    }
  );

  // GET /restaurants/me - Récupérer le restaurant de l'user connecté
  app.get(
    "/me",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        response: {
          200: RestaurantResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const restaurant = await getMyRestaurant(
        app.prisma,
        request.user.id
      );

      if (!restaurant) {
        return reply.status(404).send({
          type: "urn:app:error:not-found",
          title: "Not Found",
          status: 404,
          detail: "Aucun restaurant trouvé pour cet utilisateur",
          instance: request.url,
        });
      }

      return reply.status(200).send(restaurant);
    }
  );

  // GET /restaurants/:restaurantId - Récupérer les détails d'un restaurant (public)
  app.get<{ Params: { restaurantId: string } }>(
    "/:restaurantId",
    {
      schema: {
        response: {
          200: RestaurantResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const restaurant = await getRestaurantById(app.prisma, request.params.restaurantId);

      if (!restaurant) {
        return reply.status(404).send({
          type: "urn:app:error:not-found",
          title: "Not Found",
          status: 404,
          detail: "Restaurant non trouvé",
          instance: request.url,
        });
      }

      return reply.status(200).send(restaurant);
    }
  );

  // PATCH /restaurants/me - Modifier son restaurant
  app.patch<{ Body: UpdateRestaurantRequest }>(
    "/me",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        body: UpdateRestaurantSchema,
        response: {
          200: RestaurantResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // Récupérer d'abord le restaurant de l'user
      const myRestaurant = await getMyRestaurant(
        app.prisma,
        request.user.id
      );

      if (!myRestaurant) {
        return reply.status(404).send({
          type: "urn:app:error:not-found",
          title: "Not Found",
          status: 404,
          detail: "Aucun restaurant trouvé pour cet utilisateur",
          instance: request.url,
        });
      }

      // Mettre à jour avec vérification d'ownership
      const updated = await updateRestaurant(
        app.prisma,
        myRestaurant.id,
        request.user.id,
        request.body
      );

      return reply.status(200).send(updated);
    }
  );

  // DELETE /restaurants/me - Supprimer son restaurant
  app.delete(
    "/me",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        response: {
          204: { type: "null" },
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const myRestaurant = await getMyRestaurant(
        app.prisma,
        request.user.id
      );

      if (!myRestaurant) {
        return reply.status(404).send({
          type: "urn:app:error:not-found",
          title: "Not Found",
          status: 404,
          detail: "Aucun restaurant trouvé pour cet utilisateur",
          instance: request.url,
        });
      }

      await deleteRestaurant(app.prisma, myRestaurant.id, request.user.id);
      return reply.status(204).send();
    }
  );
};
