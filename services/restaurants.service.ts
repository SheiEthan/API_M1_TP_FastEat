import type { PrismaClient } from "../generated/prisma/client.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../common/exceptions.js";
import type {
  CreateRestaurantRequest,
  UpdateRestaurantRequest,
  RestaurantResponse,
} from "../schemas/restaurants.schema.js";

/**
 * Crée un nouveau restaurant pour un utilisateur RESTAURANT authentifié
 */
export const createRestaurant = async (
  prisma: PrismaClient,
  userId: string,
  input: CreateRestaurantRequest
): Promise<RestaurantResponse> => {
  // Vérifier que l'utilisateur n'a pas déjà un restaurant
  const existingRestaurant = await prisma.restaurant.findUnique({
    where: { userId },
  });

  if (existingRestaurant) {
    throw new ConflictError("Cet utilisateur possède déjà un restaurant");
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name: input.name,
      address: input.address,
      city: input.city,
      image: input.image || "",
      userId,
    },
  });

  return mapRestaurantToResponse(restaurant);
};

/**
 * Récupère tous les restaurants avec pagination
 */
export const getAllRestaurants = async (
  prisma: PrismaClient,
  limit: number = 10,
  offset: number = 0
): Promise<{ data: RestaurantResponse[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }> => {
  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.restaurant.count(),
  ]);

  return {
    data: restaurants.map(mapRestaurantToResponse),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
};

/**
 * Récupère un restaurant par ID
 */
export const getRestaurantById = async (
  prisma: PrismaClient,
  restaurantId: string
): Promise<RestaurantResponse | null> => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  return restaurant ? mapRestaurantToResponse(restaurant) : null;
};

/**
 * Récupère le restaurant de l'utilisateur connecté
 */
export const getMyRestaurant = async (
  prisma: PrismaClient,
  userId: string
): Promise<RestaurantResponse | null> => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { userId },
  });

  return restaurant ? mapRestaurantToResponse(restaurant) : null;
};

/**
 * Met à jour un restaurant (vérifier l'ownership)
 */
export const updateRestaurant = async (
  prisma: PrismaClient,
  restaurantId: string,
  userId: string,
  input: UpdateRestaurantRequest
): Promise<RestaurantResponse> => {
  // Vérifier que le restaurant existe et appartient à l'user
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant non trouvé");
  }

  if (restaurant.userId !== userId) {
    throw new ForbiddenError("Vous ne pouvez modifier que votre restaurant");
  }

  // Mettre à jour seulement les champs fournis
  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      name: input.name ?? restaurant.name,
      address: input.address ?? restaurant.address,
      city: input.city ?? restaurant.city,
      image: input.image ?? restaurant.image,
    },
  });

  return mapRestaurantToResponse(updated);
};

/**
 * Supprime un restaurant (avec cascade delete de ses dishes et commandes)
 */
export const deleteRestaurant = async (
  prisma: PrismaClient,
  restaurantId: string,
  userId: string
): Promise<void> => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant non trouvé");
  }

  if (restaurant.userId !== userId) {
    throw new ForbiddenError("Vous ne pouvez supprimer que votre restaurant");
  }

  // Vérifier s'il y a des commandes actives
  const activeOrders = await prisma.order.count({
    where: {
      restaurantId,
      status: {
        in: ["PENDING", "CONFIRMED", "PREPARING", "READY"],
      },
    },
  });

  if (activeOrders > 0) {
    throw new ConflictError(
      "Impossible de supprimer un restaurant avec des commandes actives"
    );
  }

  // Delete restaurant (cascade delete de Dishes via schema.prisma)
  await prisma.restaurant.delete({
    where: { id: restaurantId },
  });
};

/**
 * Fonction utilitaire pour formater la réponse
 */
const mapRestaurantToResponse = (restaurant: any): RestaurantResponse => ({
  address: restaurant.address,
  city: restaurant.city,
  id: restaurant.id,
  name: restaurant.name,
  image: restaurant.image || "",
  phone: restaurant.phone,
});
