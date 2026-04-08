import type { User } from "../generated/prisma/client.js";

export interface AuthenticatedWebSocket {
  user?: User;
  restaurantId?: string;
}
