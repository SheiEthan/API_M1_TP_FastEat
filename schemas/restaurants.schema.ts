import { Type, Static } from "@sinclair/typebox";

export const CreateRestaurantSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    address: Type.String({ minLength: 1 }),
    city: Type.String({ minLength: 1 }),
    image: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

export const UpdateRestaurantSchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    address: Type.Optional(Type.String({ minLength: 1 })),
    city: Type.Optional(Type.String({ minLength: 1 })),
    image: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

export const RestaurantResponseSchema = Type.Object({
  address: Type.String(),
  city: Type.String(),
  id: Type.String(),
  name: Type.String(),
  image: Type.Optional(Type.String()),
  phone: Type.Optional(Type.String()),
});

export type CreateRestaurantRequest = Static<typeof CreateRestaurantSchema>;
export type UpdateRestaurantRequest = Static<typeof UpdateRestaurantSchema>;
export type RestaurantResponse = Static<typeof RestaurantResponseSchema>;
