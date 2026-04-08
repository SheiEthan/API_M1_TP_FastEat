import type { WebSocket } from "@fastify/websocket";
import type {
  NewOrderNotification,
  ConnectionConfirmation,
} from "../types/socket.d.js";

/**
 * Service WebSocket - Gère les connexions en temps réel par restaurant
 * Structure: Map<restaurantId, Set<WebSocket>>
 */
class WebSocketService {
  private restaurantConnections: Map<string, Set<WebSocket>> = new Map();

  /**
   * Enregistrer une connexion WebSocket pour un restaurant
   */
  registerRestaurantConnection(restaurantId: string, socket: WebSocket): void {
    if (!this.restaurantConnections.has(restaurantId)) {
      this.restaurantConnections.set(restaurantId, new Set());
    }
    this.restaurantConnections.get(restaurantId)!.add(socket);
    console.log(
      `[WS] Restaurant ${restaurantId} connected. Total connections: ${this.restaurantConnections.get(restaurantId)!.size}`,
    );
  }

  /**
   * Désenregistrer une connexion WebSocket pour un restaurant
   */
  unregisterRestaurantConnection(restaurantId: string, socket: WebSocket): void {
    const connections = this.restaurantConnections.get(restaurantId);
    if (connections) {
      connections.delete(socket);
      console.log(
        `[WS] Restaurant ${restaurantId} disconnected. Total connections: ${connections.size}`,
      );
      
      // Supprimer l'entrée si plus aucune connexion
      if (connections.size === 0) {
        this.restaurantConnections.delete(restaurantId);
      }
    }
  }

  /**
   * Envoyer une notification de nouvelle commande à tous les WebSockets d'un restaurant
   */
  notifyRestaurant(
    restaurantId: string,
    event: string,
    data: Record<string, any>,
  ): void {
    const connections = this.restaurantConnections.get(restaurantId);
    if (!connections) {
      console.log(
        `[WS] No connections for restaurant ${restaurantId}. Skipping notification.`,
      );
      return;
    }

    const notification = {
      event,
      data,
      timestamp: new Date().getTime(),
    };

    console.log(
      `[WS] Notifying ${connections.size} connection(s) for restaurant ${restaurantId}`,
    );

    connections.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(notification));
      }
    });
  }

  /**
   * Obtenir le nombre de connexions actives pour un restaurant
   */
  getRestaurantConnectionCount(restaurantId: string): number {
    return this.restaurantConnections.get(restaurantId)?.size || 0;
  }

  /**
   * Obtenir le nombre total de connexions
   */
  getTotalConnections(): number {
    let total = 0;
    this.restaurantConnections.forEach((connections) => {
      total += connections.size;
    });
    return total;
  }

  /**
   * Nettoyer les connexions fermées
   */
  cleanupClosedConnections(): void {
    this.restaurantConnections.forEach((connections, restaurantId) => {
      connections.forEach((socket) => {
        if (socket.readyState !== WebSocket.OPEN) {
          connections.delete(socket);
        }
      });

      // Supprimer l'entrée si plus aucune connexion
      if (connections.size === 0) {
        this.restaurantConnections.delete(restaurantId);
      }
    });
  }
}

// Export singleton
export const websocketService = new WebSocketService();
