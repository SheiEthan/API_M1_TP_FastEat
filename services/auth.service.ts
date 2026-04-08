import type { PrismaClient } from "../generated/prisma/client.js";
import { hash, compare } from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../common/exceptions.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  role: string;
}

/**
 * Enregistre un nouvel utilisateur
 */
export const register = async (
  prisma: PrismaClient,
  input: RegisterInput
): Promise<AuthResponse> => {
  // Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new ConflictError("Un utilisateur avec cet email existe déjà");
  }

  const hashedPassword = await hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      role: input.role as any || "USER",
    },
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
};

/**
 * Connecte un utilisateur et retourne ses informations
 */
export const login = async (
  prisma: PrismaClient,
  input: LoginInput
): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  const isPasswordValid = await compare(input.password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError();
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
};
