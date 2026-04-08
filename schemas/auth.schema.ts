import { Type, Static } from "@sinclair/typebox";

export const LoginSchema = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8, description: "Minimum 8 caractères" }),
  },
  { additionalProperties: false }
);

export const RegisterSchema = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8, description: "Minimum 8 caractères" }),
    firstName: Type.Optional(Type.String()),
    lastName: Type.Optional(Type.String()),
    role: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

export const UserResponseSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  role: Type.String(),
});

export const TokenResponseSchema = Type.Object({
  token: Type.String(),
  user: Type.Object({
    id: Type.String(),
    email: Type.String(),
    role: Type.String(),
  }),
});

export const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    statusCode: Type.Number(),
    message: Type.String(),
  }),
});

export type LoginRequest = Static<typeof LoginSchema>;
export type RegisterRequest = Static<typeof RegisterSchema>;
export type UserResponse = Static<typeof UserResponseSchema>;
export type TokenResponse = Static<typeof TokenResponseSchema>;
