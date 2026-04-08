import { Type, Static } from "@sinclair/typebox";

export const CreateDishSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    price: Type.Number({ minimum: 0 }),
    category: Type.Union([
      Type.Literal("APPETIZER"),
      Type.Literal("MAIN_COURSE"),
      Type.Literal("DESSERT"),
      Type.Literal("BEVERAGE"),
      Type.Literal("SIDE_DISH"),
    ]),
    image: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

export const UpdateDishSchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String()),
    price: Type.Optional(Type.Number({ minimum: 0 })),
    category: Type.Optional(
      Type.Union([
        Type.Literal("APPETIZER"),
        Type.Literal("MAIN_COURSE"),
        Type.Literal("DESSERT"),
        Type.Literal("BEVERAGE"),
        Type.Literal("SIDE_DISH"),
      ])
    ),
    image: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

export const DishResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  price: Type.Number(),
  category: Type.String(),
  image: Type.Optional(Type.String()),
  restaurantId: Type.String(),
});

export type CreateDishRequest = Static<typeof CreateDishSchema>;
export type UpdateDishRequest = Static<typeof UpdateDishSchema>;
export type DishResponse = Static<typeof DishResponseSchema>;
