import type { FastifyInstance } from "fastify";
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getRestaurantOrders,
  updateOrderStatus,
  cancelOrder,
} from "../../services/orders.service.js";
import {
  CreateOrderSchema,
  OrderResponseSchema,
  UpdateOrderStatusSchema,
  type CreateOrderRequest,
  type UpdateOrderStatusRequest,
} from "../../schemas/orders.schema.js";
import { createPaginatedSchema, PaginationQuerySchema } from "../../schemas/common.schema.js";
import { ErrorResponseSchema } from "../../schemas/error.schema.js";
import { authorize } from "../../decorators/jwtDecorator.js";

export const ordersRoutes = async (app: FastifyInstance) => {
  /**
   * GET /users/:userId/orders - Lister les commandes de l'utilisateur avec pagination
   */
  app.get<{ Params: { userId: string }; Querystring: { limit?: string; offset?: string } }>(
    "/users/:userId/orders",
    {
      onRequest: [authorize(["USER"])],
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedSchema(OrderResponseSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.params.userId;
      if (userId !== request.user.id) {
        return reply.status(403).send({
          type: "urn:app:error:forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Vous ne pouvez voir que vos propres commandes",
          instance: request.url,
        });
      }
      
      const limit = request.query.limit ? Math.min(parseInt(request.query.limit), 100) : 10;
      const offset = request.query.offset ? parseInt(request.query.offset) : 0;
      
      const result = await getUserOrders(app.prisma, userId, limit, offset);
      return reply.status(200).send(result);
    },
  );

  /**
   * GET /restaurants/:restaurantId/orders - Lister les commandes du restaurant avec pagination
   */
  app.get<{ Params: { restaurantId: string }; Querystring: { status?: string; limit?: string; offset?: string } }>(
    "/restaurants/:restaurantId/orders",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedSchema(OrderResponseSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const restaurantId = request.params.restaurantId;
      const restaurant = await app.prisma.restaurant.findUnique({
        where: { id: restaurantId },
      });
      if (!restaurant) {
        return reply.status(404).send({
          type: "urn:app:error:not-found",
          title: "Not Found",
          status: 404,
          detail: "Restaurant non trouvé",
          instance: request.url,
        });
      }
      if (restaurant.userId !== request.user.id) {
        return reply.status(403).send({
          type: "urn:app:error:forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Vous ne pouvez voir que les commandes de votre restaurant",
          instance: request.url,
        });
      }
      
      const limit = request.query.limit ? Math.min(parseInt(request.query.limit), 100) : 10;
      const offset = request.query.offset ? parseInt(request.query.offset) : 0;
      
      const result = await getRestaurantOrders(
        app.prisma,
        restaurantId,
        request.query.status,
        limit,
        offset
      );
      return reply.status(200).send(result);
    },
  );

  /**
   * POST / - Créer une commande
   */
  app.post<{ Body: CreateOrderRequest }>(
    "/",
    {
      onRequest: [authorize(["USER"])],
      schema: {
        body: CreateOrderSchema,
        response: {
          201: OrderResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const order = await createOrder(app.prisma, request.user.id, request.body);
      return reply.status(201).send(order);
    },
  );

  /**
   * PATCH /:orderId/status - Changer le statut
   */
  app.patch<{ Params: { orderId: string }; Body: UpdateOrderStatusRequest }>(
    "/:orderId/status",
    {
      onRequest: [authorize(["RESTAURANT"])],
      schema: {
        body: UpdateOrderStatusSchema,
        response: {
          200: OrderResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const order = await getOrderById(app.prisma, request.params.orderId);
      const restaurant = await app.prisma.restaurant.findUnique({
        where: { id: order.restaurantId },
      });
      if (restaurant?.userId !== request.user.id) {
        return reply.status(403).send({
          type: "urn:app:error:forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Vous ne pouvez modifier que les commandes de votre restaurant",
          instance: request.url,
        });
      }
      const updatedOrder = await updateOrderStatus(
        app.prisma,
        request.params.orderId,
        order.restaurantId,
        request.body,
      );
      return reply.status(200).send(updatedOrder);
    },
  );

  /**
   * GET /:orderId - Récupérer une commande (authent requise)
   */
  app.get<{ Params: { orderId: string } }>(
    "/:orderId",
    {
      onRequest: [authorize(["USER", "RESTAURANT"])],
      schema: {
        response: {
          200: OrderResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const order = await getOrderById(app.prisma, request.params.orderId);
      const isOwner = order.userId === request.user.id;
      let isRestaurant = false;
      if (request.user.role === "RESTAURANT") {
        const restaurant = await app.prisma.restaurant.findUnique({
          where: { id: order.restaurantId },
        });
        isRestaurant = restaurant?.userId === request.user.id;
      }
      if (!isOwner && !isRestaurant) {
        return reply.status(403).send({
          type: "urn:app:error:forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Vous n'avez pas accès à cette commande",
          instance: request.url,
        });
      }
      return reply.status(200).send(order);
    },
  );

  /**
   * DELETE /:orderId - Annuler une commande
   */
  app.delete<{ Params: { orderId: string } }>(
    "/:orderId",
    {
      onRequest: [authorize(["USER"])],
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
      await cancelOrder(app.prisma, request.params.orderId, request.user.id);
      return reply.status(204).send();
    },
  );
};
