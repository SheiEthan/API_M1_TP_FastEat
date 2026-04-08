import type { PrismaClient } from "../generated/prisma/client.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../common/exceptions.js";
import type { CreateOrderRequest, OrderResponse, UpdateOrderStatusRequest } from "../schemas/orders.schema.js";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const isValidStatusTransition = (currentStatus: string, newStatus: string): boolean => {
  if (currentStatus === newStatus) return true;
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
};

export const createOrder = async (
  prisma: PrismaClient,
  userId: string,
  input: CreateOrderRequest,
) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: input.restaurantId },
  });

  if (!restaurant) {
    throw new NotFoundError("Restaurant non trouvé");
  }

  const dishIds = input.items.map((item) => item.dishId);
  const dishes = await prisma.dish.findMany({
    where: { id: { in: dishIds } },
  });

  if (dishes.length !== input.items.length) {
    throw new BadRequestError("Un ou plusieurs plats n'existent pas");
  }

  const restaurantIdsInOrder = new Set(dishes.map((d) => d.restaurantId));
  if (restaurantIdsInOrder.size !== 1 || !restaurantIdsInOrder.has(input.restaurantId)) {
    throw new BadRequestError("Tous les plats doivent appartenir au même restaurant");
  }

  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  let totalPrice = 0;
  const orderItems = input.items.map((item) => {
    const dish = dishMap.get(item.dishId)!;
    const unitPrice = Number(dish.price);
    const subtotal = unitPrice * item.quantity;
    totalPrice += subtotal;

    return {
      dishId: item.dishId,
      quantity: item.quantity,
      unitPrice: String(unitPrice),
      subtotal: String(subtotal),
      specialInstructions: item.specialInstructions || null,
    };
  });

  const order = await prisma.order.create({
    data: {
      userId,
      restaurantId: input.restaurantId,
      totalPrice: String(totalPrice),
      deliveryAddress: input.deliveryAddress,
      deliveryCity: input.deliveryCity,
      notes: input.notes || null,
      status: "PENDING",
      items: {
        create: orderItems,
      },
    },
    include: {
      items: true,
    },
  });

  return mapOrderToResponse(order);
};

export const getOrderById = async (prisma: PrismaClient, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError("Commande non trouvée");
  }

  return mapOrderToResponse(order);
};

export const getUserOrders = async (
  prisma: PrismaClient,
  userId: string,
  limit: number = 10,
  offset: number = 0
) => {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return {
    data: orders.map(mapOrderToResponse),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
};

export const getRestaurantOrders = async (
  prisma: PrismaClient,
  restaurantId: string,
  status?: string,
  limit: number = 10,
  offset: number = 0
) => {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: {
        restaurantId,
        ...(status && { status: status as any }),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({
      where: {
        restaurantId,
        ...(status && { status: status as any }),
      },
    }),
  ]);

  return {
    data: orders.map(mapOrderToResponse),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
};

export const updateOrderStatus = async (
  prisma: PrismaClient,
  orderId: string,
  restaurantId: string,
  input: UpdateOrderStatusRequest,
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError("Commande non trouvée");
  }

  if (order.restaurantId !== restaurantId) {
    throw new ForbiddenError("Vous ne pouvez modifier que les commandes de votre restaurant");
  }

  if (!isValidStatusTransition(order.status, input.status)) {
    throw new ConflictError(
      `Impossible de passer de ${order.status} à ${input.status}. Transitions valides: ${VALID_TRANSITIONS[order.status]?.join(", ") || "aucune"}`,
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: input.status as any },
    include: { items: true },
  });

  return mapOrderToResponse(updatedOrder);
};

export const cancelOrder = async (
  prisma: PrismaClient,
  orderId: string,
  userId: string,
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError("Commande non trouvée");
  }

  if (order.userId !== userId) {
    throw new ForbiddenError("Vous ne pouvez annuler que vos propres commandes");
  }

  if (order.status !== "PENDING") {
    throw new ConflictError(`Impossible d'annuler une commande avec le statut ${order.status}`);
  }

  const cancelledOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
    include: { items: true },
  });

  return mapOrderToResponse(cancelledOrder);
};

const mapOrderToResponse = (order: any): OrderResponse => ({
  id: order.id,
  totalPrice: Number(order.totalPrice),
  status: order.status,
  deliveryAddress: order.deliveryAddress,
  deliveryCity: order.deliveryCity,
  notes: order.notes,
  estimatedTime: order.estimatedTime,
  userId: order.userId,
  restaurantId: order.restaurantId,
  items: order.items.map((item: any) => ({
    id: item.id,
    dishId: item.dishId,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    subtotal: Number(item.subtotal),
    specialInstructions: item.specialInstructions,
  })),
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
});
