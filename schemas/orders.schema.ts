import { Type, type Static } from "@sinclair/typebox";

export const OrderItemSchema = Type.Object({
  dishId: Type.String({ format: "uuid", description: "ID du plat" }),
  quantity: Type.Integer({ minimum: 1, description: "Quantité du plat" }),
  specialInstructions: Type.Optional(Type.String({ description: "Instructions spéciales" })),
});

export type OrderItem = Static<typeof OrderItemSchema>;

export const CreateOrderSchema = Type.Object({
  restaurantId: Type.String({ format: "uuid", description: "ID du restaurant" }),
  deliveryAddress: Type.String({ minLength: 5, description: "Adresse de livraison" }),
  deliveryCity: Type.String({ minLength: 2, description: "Ville de livraison" }),
  items: Type.Array(OrderItemSchema, {
    minItems: 1,
    description: "Liste des articles de la commande",
  }),
  notes: Type.Optional(Type.String({ description: "Notes de la commande" })),
});

export type CreateOrderRequest = Static<typeof CreateOrderSchema>;

export const OrderItemResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  dishId: Type.String({ format: "uuid" }),
  quantity: Type.Integer(),
  unitPrice: Type.Number(),
  subtotal: Type.Number(),
  specialInstructions: Type.Optional(Type.String()),
});

export type OrderItemResponse = Static<typeof OrderItemResponseSchema>;

export const OrderResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  totalPrice: Type.Number(),
  status: Type.Union([
    Type.Literal("PENDING"),
    Type.Literal("CONFIRMED"),
    Type.Literal("PREPARING"),
    Type.Literal("READY"),
    Type.Literal("DELIVERED"),
    Type.Literal("CANCELLED"),
  ]),
  deliveryAddress: Type.String(),
  deliveryCity: Type.String(),
  notes: Type.Optional(Type.String()),
  estimatedTime: Type.Optional(Type.Integer()),
  userId: Type.String({ format: "uuid" }),
  restaurantId: Type.String({ format: "uuid" }),
  items: Type.Array(OrderItemResponseSchema),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export type OrderResponse = Static<typeof OrderResponseSchema>;

export const UpdateOrderStatusSchema = Type.Object({
  status: Type.Union([
    Type.Literal("PENDING"),
    Type.Literal("CONFIRMED"),
    Type.Literal("PREPARING"),
    Type.Literal("READY"),
    Type.Literal("DELIVERED"),
    Type.Literal("CANCELLED"),
  ]),
});

export type UpdateOrderStatusRequest = Static<typeof UpdateOrderStatusSchema>;

export const OrderListItemSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  totalPrice: Type.Number(),
  status: Type.Union([
    Type.Literal("PENDING"),
    Type.Literal("CONFIRMED"),
    Type.Literal("PREPARING"),
    Type.Literal("READY"),
    Type.Literal("DELIVERED"),
    Type.Literal("CANCELLED"),
  ]),
  restaurantId: Type.String({ format: "uuid" }),
  createdAt: Type.String({ format: "date-time" }),
});

export type OrderListItem = Static<typeof OrderListItemSchema>;
