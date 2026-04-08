import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import type {
  AuthenticatedSocket,
  WebSocketMessage,
  ConnectionConfirmation,
} from "../../types/socket.d.js";
import { websocketService } from "../../services/websocket.service.js";
import { prisma } from "../../prisma/prismaInstance.js";

/**
 * Route WebSocket pour les restaurateurs
 * GET /ws/restaurant : route WebSocket pour les restaurateurs
 *
 * Flux de connexion:
 * 1. Connexion établie
 * 2. Client envoie message: { event: "authenticate", token: "jwt_token" }
 * 3. Serveur valide le token et le rôle
 * 4. Serveur enregistre la connexion
 * 5. Serveur envoie confirmation
 */
export const websocketRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/restaurant", { websocket: true }, async (socket, request) => {
    console.log("[WS] New WebSocket connection attempt");

    let authSocket: AuthenticatedSocket | null = null;

    try {
      // Attendre le message d'authentification
      await handleAuthentication(socket, fastify, request, (auth) => {
        authSocket = auth;
      });

      if (!authSocket) {
        socket.close(1008, "Authentication failed");
        return;
      }

      // Enregistrer la connexion
      websocketService.registerRestaurantConnection(
        authSocket.restaurantId,
        socket,
      );

      // Envoyer confirmation de connexion
      const confirmation: ConnectionConfirmation = {
        event: "connected",
        data: {
          restaurantId: authSocket.restaurantId,
          message: `Connected as restaurant: ${authSocket.restaurantId}`,
        },
        timestamp: new Date().getTime(),
      };
      socket.send(JSON.stringify(confirmation));

      // Setup listeners
      setupSocketListeners(socket, authSocket);

      // Démarrer le heartbeat (ping WebSocket natif toutes les 30 secondes pour keep-alive)
      const heartbeatInterval = setInterval(() => {
        if (socket.readyState === 1) { // 1 = OPEN
          socket.ping();
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Nettoyer le heartbeat quand la socket se ferme
      socket.on("close", () => {
        clearInterval(heartbeatInterval);
      });
    } catch (error) {
      console.error("[WS] Error in websocket route:", error);
      socket.close(1011, "Internal server error");
    }
  });
};

/**
 * Gérer l'authentification via le premier message
 */
async function handleAuthentication(
  socket: WebSocket,
  fastify: FastifyInstance,
  request: FastifyRequest,
  onAuthenticated: (auth: AuthenticatedSocket) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.close(1008, "Authentication timeout");
      reject(new Error("Authentication timeout"));
    }, 30000);

    socket.on("message", async (data) => {
      try {
        clearTimeout(timeout);
        const message: WebSocketMessage = JSON.parse(data.toString());

        if (message.event !== "authenticate") {
          socket.close(1008, "First message must be authenticate");
          return reject(new Error("First message must be authenticate"));
        }

        const token = message.token;
        if (!token) {
          socket.close(1008, "Token required");
          return reject(new Error("Token required"));
        }

        // Valider le token JWT
        let decoded;
        try {
          decoded = await fastify.jwt.verify(token);
        } catch (error) {
          socket.close(1008, "Invalid token");
          return reject(new Error("Invalid token"));
        }

        // Récupérer l'utilisateur
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });

        if (!user) {
          socket.close(1008, "User not found");
          return reject(new Error("User not found"));
        }

        // Vérifier le rôle RESTAURANT
        if (user.role !== "RESTAURANT") {
          socket.close(1008, "Only RESTAURANT role can connect");
          return reject(new Error("Only RESTAURANT role can connect"));
        }

        // Récupérer le restaurant
        const restaurant = await prisma.restaurant.findFirst({
          where: { userId: user.id },
        });

        if (!restaurant) {
          socket.close(1008, "Restaurant not found");
          return reject(new Error("Restaurant not found"));
        }

        console.log(
          `[WS] Authenticated user: ${user.email} (restaurant: ${restaurant.id})`,
        );

        // Créer l'objet authentifié
        const authSocket: AuthenticatedSocket = {
          user,
          restaurantId: restaurant.id,
          socket,
        };

        onAuthenticated(authSocket);
        socket.removeAllListeners("message"); // Retirer le listener temporaire
        resolve();
      } catch (error) {
        console.error("[WS] Authentication error:", error);
        socket.close(1008, "Authentication failed");
        reject(error);
      }
    });

    socket.on("error", (error) => {
      console.error("[WS] Connection error during authentication:", error);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Setup les listeners pour les messages et événements du socket
 */
function setupSocketListeners(socket: WebSocket, authSocket: AuthenticatedSocket) {
  // Listener pour les messages entrants
  socket.on("message", (data) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      console.log(
        `[WS] Message from restaurant ${authSocket.restaurantId}: ${message.event}`,
      );

      // Gérer les ping/pong
      if (message.event === "ping") {
        socket.send(JSON.stringify({ event: "pong", timestamp: new Date().getTime() }));
      }
    } catch (error) {
      console.error("[WS] Error parsing message:", error);
      // Continuer sans fermer la connexion
    }
  });

  // Listener pour la fermeture
  socket.on("close", () => {
    console.log(`[WS] Connection closed for restaurant ${authSocket.restaurantId}`);
    websocketService.unregisterRestaurantConnection(
      authSocket.restaurantId,
      socket,
    );
  });

  // Listener pour les erreurs
  socket.on("error", (error) => {
    console.error(
      `[WS] Error for restaurant ${authSocket.restaurantId}:`,
      error,
    );
    websocketService.unregisterRestaurantConnection(
      authSocket.restaurantId,
      socket,
    );
  });
}
