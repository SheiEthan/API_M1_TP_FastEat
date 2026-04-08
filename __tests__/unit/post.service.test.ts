import { describe, it, expect, beforeEach, vi } from "vitest";
import { PostService } from "../../services/post.service.js";
import { NotFoundError, ForbiddenError } from "../../common/exceptions.js";

describe("Post Service - Unit Tests", () => {
  let prisma: any;
  let postService: PostService;

  beforeEach(() => {
    // Reset les mocks
    vi.clearAllMocks();

    // Créer un mock de Prisma
    prisma = {
      post: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    // Créer une instance du service avec le mock Prisma
    postService = new PostService(prisma as any);
  });

  describe("getPostById", () => {
    it("devrait retourner un post existant", async () => {
      // Arrange
      const postId = "post-123";
      const mockPost = {
        id: postId,
        text: "Mon premier post",
        userId: "user-456",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: "user-456",
          email: "user@example.com",
          firstName: "Jean",
        },
        comments: [],
      };

      prisma.post.findUnique.mockResolvedValue(mockPost);

      // Act
      const result = await postService.getPostById(postId);

      // Assert
      expect(result).toEqual(mockPost);
      expect(prisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: postId },
        }),
      );
    });

    it("devrait lancer une NotFoundError si le post n'existe pas", async () => {
      // Arrange
      const postId = "nonexistent-post";
      prisma.post.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(postService.getPostById(postId)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("createPost", () => {
    it("devrait créer un nouveau post", async () => {
      // Arrange
      const userId = "user-123";
      const data = { text: "Nouveau post" };
      const mockCreatedPost = {
        id: "post-789",
        text: data.text,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          email: "user@example.com",
          firstName: "Marie",
        },
      };

      prisma.post.create.mockResolvedValue(mockCreatedPost);

      // Act
      const result = await postService.createPost(userId, data);

      // Assert
      expect(result).toEqual(mockCreatedPost);
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            text: data.text,
            userId,
          },
        }),
      );
    });
  });

  describe("updatePost", () => {
    it("devrait mettre à jour un post si c'est le propriétaire", async () => {
      // Arrange
      const postId = "post-123";
      const userId = "user-456";
      const data = { text: "Post modifié" };

      // Mock: Le post existe et appartient à l'utilisateur
      prisma.post.findUnique.mockResolvedValue({
        id: postId,
        userId,
        text: "Ancien texte",
      });

      const mockUpdatedPost = {
        id: postId,
        text: data.text,
        userId,
        user: {
          id: userId,
          email: "user@example.com",
          firstName: "Pierre",
        },
      };

      prisma.post.update.mockResolvedValue(mockUpdatedPost);

      // Act
      const result = await postService.updatePost(postId, userId, data);

      // Assert
      expect(result).toEqual(mockUpdatedPost);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: postId },
          data,
        }),
      );
    });

    it("devrait lancer une ForbiddenError si ce n'est pas le propriétaire", async () => {
      // Arrange
      const postId = "post-123";
      const userId = "user-456";
      const differentUserId = "user-999";
      const data = { text: "Post modifié" };

      // Mock: Le post n'appartient pas à l'utilisateur
      prisma.post.findUnique.mockResolvedValue({
        id: postId,
        userId: differentUserId,
        text: "Ancien texte",
      });

      // Act & Assert
      await expect(
        postService.updatePost(postId, userId, data),
      ).rejects.toThrow(ForbiddenError);
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("devrait lancer une NotFoundError si le post n'existe pas", async () => {
      // Arrange
      const postId = "nonexistent-post";
      const userId = "user-456";
      const data = { text: "Post modifié" };

      prisma.post.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        postService.updatePost(postId, userId, data),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deletePost", () => {
    it("devrait supprimer un post si c'est le propriétaire", async () => {
      // Arrange
      const postId = "post-123";
      const userId = "user-456";

      // Mock: Le post existe et appartient à l'utilisateur
      prisma.post.findUnique.mockResolvedValue({
        id: postId,
        userId,
      });

      const mockDeletedPost = {
        id: postId,
        userId,
        user: {
          id: userId,
          email: "user@example.com",
          firstName: "Luc",
        },
      };

      prisma.post.delete.mockResolvedValue(mockDeletedPost);

      // Act
      const result = await postService.deletePost(postId, userId);

      // Assert
      expect(result).toEqual(mockDeletedPost);
      expect(prisma.post.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: postId },
        }),
      );
    });

    it("devrait lancer une ForbiddenError si ce n'est pas le propriétaire", async () => {
      // Arrange
      const postId = "post-123";
      const userId = "user-456";
      const differentUserId = "user-999";

      // Mock: Le post n'appartient pas à l'utilisateur
      prisma.post.findUnique.mockResolvedValue({
        id: postId,
        userId: differentUserId,
      });

      // Act & Assert
      await expect(postService.deletePost(postId, userId)).rejects.toThrow(
        ForbiddenError,
      );
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });
  });
});
