import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import mercurius from "mercurius";
import { restaurantSchema } from "./restaurant.schema.js";
import { createRestaurantResolvers } from "./restaurant.resolvers.js";

export const registerGraphQL = async (app: FastifyInstance) => {
  const resolvers = createRestaurantResolvers(app);

  await app.register(mercurius, {
    schema: restaurantSchema,
    resolvers,
    graphiql: process.env.NODE_ENV === "development",
    context: async (request: FastifyRequest, reply: FastifyReply) => {
      let user = null;
      try {
        // Valider le JWT depuis le header Authorization
        const payload = await request.jwtVerify<{
          id: string;
          role: string;
        }>();
        
        // Récupérer l'utilisateur depuis la base de données
        const foundUser = await app.prisma.user.findUnique({
          where: { id: payload.id },
          omit: { password: true },
        });
        
        if (foundUser) {
          user = foundUser;
        }
      } catch (err) {
        // Pas de token ou token invalide, user reste null
        // C'est ok, certaines queries ne nécessitent pas d'auth
      }
      
      return { user, request };
    },
  });
};
