import type { PrismaClient } from "../generated/prisma/client.js";
import { hash, compare } from "bcryptjs";
import { randomBytes, createHash } from "crypto";
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
  firstName?: string | null;
  lastName?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  user: AuthResponse;
  newRefreshToken: string;
}

const REFRESH_TOKEN_TTL_DAYS = 7;

function generateRefreshToken(): string {
  return randomBytes(40).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function storeRefreshToken(
  prisma: PrismaClient,
  userId: string,
  token: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });
}

export const register = async (
  prisma: PrismaClient,
  input: RegisterInput
): Promise<AuthResponse> => {
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
    firstName: user.firstName,
    lastName: user.lastName,
  };
};

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
    firstName: user.firstName,
    lastName: user.lastName,
  };
};

export const issueRefreshToken = async (
  prisma: PrismaClient,
  userId: string
): Promise<string> => {
  const token = generateRefreshToken();
  await storeRefreshToken(prisma, userId, token);
  return token;
};

export const refreshAccessToken = async (
  prisma: PrismaClient,
  refreshToken: string
): Promise<RefreshResult> => {
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { tokenHash } });
    }
    throw new UnauthorizedError("Refresh token invalide ou expiré");
  }

  // Rotation : révocation de l'ancien, émission d'un nouveau
  await prisma.refreshToken.delete({ where: { tokenHash } });
  const newToken = generateRefreshToken();
  await storeRefreshToken(prisma, stored.userId, newToken);

  return {
    user: {
      id: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
      firstName: stored.user.firstName,
      lastName: stored.user.lastName,
    },
    newRefreshToken: newToken,
  };
};

export const revokeRefreshToken = async (
  prisma: PrismaClient,
  refreshToken: string
): Promise<void> => {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
};
