import { PrismaClient } from "../generated/prisma/client.js";
import { ForbiddenError, NotFoundError } from "../common/exceptions.js";
import type { UserRequest, UserUpdateRequest } from "../schemas/user.schema.js";

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      omit: {
        password: true,
      },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
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

  async createUser(data: UserRequest) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Un utilisateur avec cet email existe déjà");
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        password: data.password, // In production, hash this!
      },
      omit: {
        password: true,
      },
    });
  }

  async updateUser(
    userId: string,
    currentUserId: string,
    data: UserUpdateRequest,
  ) {
    // Vérifier que l'utilisateur ne peut modifier que ses propres données
    if (userId !== currentUserId) {
      throw new ForbiddenError(
        "Vous n'avez pas la permission de modifier cet utilisateur",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Utilisateur non trouvé");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
      },
      omit: {
        password: true,
      },
    });
  }

  async deleteUser(userId: string, currentUserId: string) {
    // Vérifier que l'utilisateur ne peut supprimer que son propre compte
    if (userId !== currentUserId) {
      throw new ForbiddenError(
        "Vous n'avez pas la permission de supprimer cet utilisateur",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Utilisateur non trouvé");
    }

    return this.prisma.user.delete({
      where: { id: userId },
      omit: {
        password: true,
      },
    });
  }
}
