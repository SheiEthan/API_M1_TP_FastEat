import { Type, Static } from "@sinclair/typebox";

export const UserSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  firstName: Type.String(),
  role: Type.Enum({ USER: "USER", ADMIN: "ADMIN", RESTAURANT: "RESTAURANT" }),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export const CreateUserSchema = Type.Object({
  email: Type.String({ format: "email" }),
  firstName: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 6 }),
});

export const UpdateUserSchema = Type.Object({
  email: Type.Optional(Type.String({ format: "email" })),
  firstName: Type.Optional(Type.String({ minLength: 1 })),
  password: Type.Optional(Type.String({ minLength: 6 })),
});

export const UserResponseSchema = Type.Omit(UserSchema, ["password"]);

export const UpdateProfileSchema = Type.Partial(
  Type.Object({
    email: Type.String({ format: "email" }),
    firstName: Type.String({ minLength: 1 }),
  }),
);

export type UserRequest = Static<typeof CreateUserSchema>;
export type UserUpdateRequest = Static<typeof UpdateUserSchema>;
export type UserResponse = Static<typeof UserResponseSchema>;
export type UpdateProfileRequest = Static<typeof UpdateProfileSchema>;
