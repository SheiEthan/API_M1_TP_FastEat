import { PrismaClient } from "../generated/prisma/client.js";
import { ForbiddenError, NotFoundError } from "../common/exceptions.js";
import type {
  CreatePostRequest,
  UpdatePostRequest,
} from "../schemas/post.schema.js";

export class PostService {
  constructor(private prisma: PrismaClient) {}

  async getAllPosts() {
    return this.prisma.post.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getPostById(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
        comments: {
          include: {
            post: {
              select: {
                userId: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundError("Post non trouvé");
    }

    return post;
  }

  async getUserPosts(userId: string) {
    return this.prisma.post.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createPost(userId: string, data: CreatePostRequest) {
    return this.prisma.post.create({
      data: {
        text: data.text,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });
  }

  async updatePost(postId: string, userId: string, data: UpdatePostRequest) {
    // Vérifier que le post existe et appartient à l'utilisateur
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError("Post non trouvé");
    }

    if (post.userId !== userId) {
      throw new ForbiddenError(
        "Vous n'avez pas la permission de modifier ce post",
      );
    }

    return this.prisma.post.update({
      where: { id: postId },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });
  }

  async deletePost(postId: string, userId: string) {
    // Vérifier que le post existe et appartient à l'utilisateur
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError("Post non trouvé");
    }

    if (post.userId !== userId) {
      throw new ForbiddenError(
        "Vous n'avez pas la permission de supprimer ce post",
      );
    }

    return this.prisma.post.delete({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });
  }
}
