import type { IResolvers } from "mercurius";
import type { FastifyInstance, FastifyRequest } from "fastify";

export const createRestaurantResolvers = (app: FastifyInstance): IResolvers => {
  return {
    Query: {
      // Récupérer tous les restaurants
      restaurants: async () => {
        return await app.prisma.restaurant.findMany({
          include: { dishes: true },
        });
      },

      // Récupérer un restaurant par ID avec ses plats
      restaurant: async (_: any, { id }: { id: string }) => {
        const restaurant = await app.prisma.restaurant.findUnique({
          where: { id },
          include: { dishes: true },
        });
        if (!restaurant) {
          throw new Error(`Restaurant with id ${id} not found`);
        }
        return restaurant;
      },

      // Récupérer les plats d'un restaurant
      dishes: async (_: any, { restaurantId }: { restaurantId: string }) => {
        return await app.prisma.dish.findMany({
          where: { restaurantId },
        });
      },

      // Récupérer les commandes de l'utilisateur connecté (authentification requise)
      orders: async (_: any, __: any, context: any) => {
        if (!context.user) {
          throw new Error("Unauthorized: You must be authenticated to view orders");
        }
        
        // Retourner uniquement les commandes de l'utilisateur
        return await app.prisma.order.findMany({
          where: { userId: context.user.id },
          include: { items: true },
        });
      },

      // Récupérer une commande par ID (authentification + autorisation)
      order: async (_: any, { id }: { id: string }, context: any) => {
        if (!context.user) {
          throw new Error("Unauthorized: You must be authenticated to view orders");
        }

        const order = await app.prisma.order.findUnique({
          where: { id },
          include: { items: true },
        });

        if (!order) {
          throw new Error(`Order with id ${id} not found`);
        }

        // Vérifier que l'utilisateur accède à sa propre commande
        // (sauf s'il est RESTAURANT, il peut voir les commandes de son restaurant)
        if (order.userId !== context.user.id && context.user.role !== "RESTAURANT") {
          throw new Error("Forbidden: You can only view your own orders");
        }

        return order;
      },
    },

    // Resolvers pour les fields nested
    Restaurant: {
      dishes: async (parent: any) => {
        return await app.prisma.dish.findMany({
          where: { restaurantId: parent.id },
        });
      },
    },

    Order: {
      items: async (parent: any) => {
        return await app.prisma.orderItem.findMany({
          where: { orderId: parent.id },
        });
      },
    },
  };
};
