import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth/index.js";
import { restaurantRoutes } from "./restaurants/index.js";
import { dishesRoutes } from "./dishes/index.js";
import { ordersRoutes } from "./orders/index.js";
import { userRoutes } from "./users/index.js";

export const registerRoutes = async (app: FastifyInstance) => {
  // Routes API
  await app.register(
    async (fastify) => {
      await fastify.register(authRoutes, { prefix: "/auth" });
      await fastify.register(userRoutes);
      await fastify.register(restaurantRoutes, { prefix: "/restaurants" });
      await fastify.register(dishesRoutes, { prefix: "/restaurants" });
      await fastify.register(ordersRoutes, { prefix: "/orders" });
    },
    { prefix: "/api" },
  );
};
