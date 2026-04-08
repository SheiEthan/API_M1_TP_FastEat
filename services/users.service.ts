import type { PrismaClient } from "../generated/prisma/client.js";
import bcrypt from "bcryptjs";
import { ConflictError, NotFoundError } from "../common/exceptions.js";
import type { UpdateProfileRequest } from "../schemas/user.schema.js";

export async function updateUser(
  prisma: PrismaClient,
  userId: string,
  data: UpdateProfileRequest,
) {
  // Vérifier que l'utilisateur existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("Utilisateur non trouvé");
  }

  // Vérifier que l'email n'existe pas déjà (s'il est fourni et différent du sien)
  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("L'email est déjà utilisé");
    }
  }

  // Mettre à jour le profil
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      email: data.email || user.email,
      firstName: data.firstName || user.firstName,
    },
    omit: {
      password: true,
    },
  });

  return updatedUser;
}

export async function deleteUser(
  prisma: PrismaClient,
  userId: string,
) {
  // Vérifier que l'utilisateur existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("Utilisateur non trouvé");
  }

  // Supprimer l'utilisateur
  await prisma.user.delete({
    where: { id: userId },
  });

  return { message: "Compte supprimé avec succès" };
}

export async function getUserById(
  prisma: PrismaClient,
  userId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: {
      password: true,
    },
  });

  if (!user) {
    throw new NotFoundError("Utilisateur non trouvé");
  }

  return user;
}
