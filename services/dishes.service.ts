import type { PrismaClient } from "../generated/prisma/client.js";
import { NotFoundError, ForbiddenError } from "../common/exceptions.js";
import type {
  CreateDishRequest,
  UpdateDishRequest,
  DishResponse,
} from "../schemas/dishes.schema.js";

/**
 * Crée un plat pour un restaurant
 */
export const createDish = async (
  prisma: PrismaClient,
  restaurantId: string,
  userId: string,
  input: CreateDishRequest
): Promise<DishResponse> => {
  // Vérifier que le restaurant existe et appartient à l'user
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant non trouvé");
  }

  if (restaurant.userId !== userId) {
    throw new ForbiddenError("Vous ne pouvez ajouter des plats qu'à votre restaurant");
  }

  const dish = await prisma.dish.create({
    data: {
      name: input.name,
      description: input.description || null,
      price: String(input.price),
      category: input.category,
      image: input.image || null,
      restaurantId,
    },
  });

  return mapDishToResponse(dish);
};

/**
 * Récupère les plats d'un restaurant avec pagination
 */
export const getDishesByRestaurant = async (
  prisma: PrismaClient,
  restaurantId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ 
  data: DishResponse[]; 
  pagination: { total: number; limit: number; offset: number; hasMore: boolean } 
}> => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant non trouvé");
  }

  const [dishes, total] = await Promise.all([
    prisma.dish.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.dish.count({ where: { restaurantId } }),
  ]);

  return {
    data: dishes.map(mapDishToResponse),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
};

/**
 * Récupère un plat par ID
 */
export const getDishById = async (
  prisma: PrismaClient,
  dishId: string
): Promise<DishResponse> => {
  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
  });

  if (!dish) {
    throw new NotFoundError("Plat non trouvé");
  }

  return mapDishToResponse(dish);
};

/**
 * Met à jour un plat (vérifier la propriété du restaurant)
 */
export const updateDish = async (
  prisma: PrismaClient,
  dishId: string,
  userId: string,
  input: UpdateDishRequest
): Promise<DishResponse> => {
  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    include: { restaurant: true },
  });

  if (!dish) {
    throw new NotFoundError("Plat non trouvé");
  }

  if (dish.restaurant.userId !== userId) {
    throw new ForbiddenError("Vous ne pouvez modifier que les plats de votre restaurant");
  }

  const updated = await prisma.dish.update({
    where: { id: dishId },
    data: {
      name: input.name ?? dish.name,
      description: input.description ?? dish.description,
      price: input.price !== undefined ? String(input.price) : dish.price,
      category: input.category ?? dish.category,
      image: input.image ?? dish.image,
    },
  });

  return mapDishToResponse(updated);
};

/**
 * Supprime un plat (vérifier la propriété du restaurant)
 */
export const deleteDish = async (
  prisma: PrismaClient,
  dishId: string,
  userId: string
): Promise<void> => {
  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    include: { restaurant: true },
  });

  if (!dish) {
    throw new NotFoundError("Plat non trouvé");
  }

  if (dish.restaurant.userId !== userId) {
    throw new ForbiddenError("Vous ne pouvez supprimer que les plats de votre restaurant");
  }

  await prisma.dish.delete({
    where: { id: dishId },
  });
};

/**
 * Fonction utilitaire pour formater la réponse
 */
const mapDishToResponse = (dish: any): DishResponse => ({
  id: dish.id,
  name: dish.name,
  description: dish.description,
  price: Number(dish.price),
  category: dish.category,
  image: dish.image,
  restaurantId: dish.restaurantId,
});
