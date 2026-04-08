import type { User } from "../generated/prisma/client.js";
import type { WebSocket } from "@fastify/websocket";

// Interface pour une connexion WebSocket authentifiée
export interface AuthenticatedSocket {
  user: User;
  restaurantId: string;
  socket: WebSocket;
}

// Format des messages WebSocket
export interface WebSocketMessage {
  event: string;
  data?: Record<string, any>;
  token?: string;
  timestamp?: number;
}

// Format de la notification de nouvelle commande
export interface NewOrderNotification {
  event: "new-order";
  data: {
    orderId: string;
    restaurantId: string;
    totalPrice: number;
    itemCount: number;
    createdAt: string;
  };
  timestamp: number;
}

// Format de la notification de confirmation de connexion
export interface ConnectionConfirmation {
  event: "connected";
  data: {
    restaurantId: string;
    message: string;
  };
  timestamp: number;
}
