import { PrismaClient } from "../generated/prisma/client.js";
import { ForbiddenError, NotFoundError } from "../common/exceptions.js";
import type {
  CreateCommentRequest,
  UpdateCommentRequest,
} from "../schemas/comment.schema.js";

export class CommentService {
  constructor(private prisma: PrismaClient) {}

  async getCommentsByPost(postId: string) {
    // Vérifier que le post existe
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError("Post non trouvé");
    }

    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getCommentById(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundError("Commentaire non trouvé");
    }

    return comment;
  }

  async createComment(
    postId: string,
    userId: string,
    data: CreateCommentRequest,
  ) {
    // Vérifier que le post existe
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError("Post non trouvé");
    }

    return this.prisma.comment.create({
      data: {
        content: data.content,
        postId,
      },
    });
  }

  async updateComment(
    commentId: string,
    userId: string,
    data: UpdateCommentRequest,
  ) {
    // Vérifier que le commentaire existe
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundError("Commentaire non trouvé");
    }

    // Vérifier que l'utilisateur est le propriétaire du post
    if (comment.post.userId !== userId) {
      throw new ForbiddenError(
        "Vous n'avez pas la permission de modifier ce commentaire",
      );
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data,
    });
  }

  async deleteComment(commentId: string, userId: string) {
    // Vérifier que le commentaire existe
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundError("Commentaire non trouvé");
    }

    // Vérifier que l'utilisateur est le propriétaire du post
    if (comment.post.userId !== userId) {
      throw new ForbiddenError(
        "Vous n'avez pas la permission de supprimer ce commentaire",
      );
    }

    return this.prisma.comment.delete({
      where: { id: commentId },
    });
  }
}
