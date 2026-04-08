import { describe, it, expect, beforeEach, vi } from "vitest";
import { register, login } from "../../services/auth.service.js";
import { ConflictError, UnauthorizedError } from "../../common/exceptions.js";
import { hash } from "bcryptjs";

describe("Auth Service - Unit Tests", () => {
  let prisma: any;

  beforeEach(() => {
    // Reset les mocks avant chaque test
    vi.clearAllMocks();

    // Créer un mock de Prisma
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };
  });

  describe("register", () => {
    it("devrait enregistrer un nouvel utilisateur avec un email valide", async () => {
      // Arrange: Préparer les données
      const input = {
        email: "newuser@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      // Mock: L'utilisateur n'existe pas
      prisma.user.findUnique.mockResolvedValue(null);

      // Mock: create retourne l'utilisateur créé
      prisma.user.create.mockResolvedValue({
        id: "user-123",
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        password: expect.any(String),
        role: "USER",
      });

      // Act: Exécuter la fonction
      const result = await register(prisma, input);

      // Assert: Vérifier les résultats
      expect(result).toEqual({
        id: "user-123",
        email: "newuser@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "USER",
      });

      // Vérifier que les bonnes méthodes ont été appelées
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: input.email },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.email).toBe("newuser@example.com");
    });

    it("devrait lancer une ConflictError si l'email existe déjà", async () => {
      // Arrange: Préparer les données
      const input = {
        email: "existing@example.com",
        password: "password123",
        firstName: "Jane",
      };

      // Mock: L'utilisateur existe déjà
      prisma.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
        firstName: "Jane",
        password: "hashedPassword",
      });

      // Act & Assert: Vérifier que l'erreur est lancée
      await expect(register(prisma, input)).rejects.toThrow(ConflictError);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("devrait loguer un utilisateur avec des identifiants valides", async () => {
      // Arrange
      const input = {
        email: "user@example.com",
        password: "password123",
      };

      // Créer un vrai hash du mot de passe
      const hashedPassword = await hash(input.password, 10);

      // Mock: L'utilisateur existe avec le bon hash
      prisma.user.findUnique.mockResolvedValue({
        id: "user-456",
        email: "user@example.com",
        firstName: "John",
        lastName: "User",
        password: hashedPassword,
        role: "USER",
      });

      // Act
      const result = await login(prisma, input);

      // Assert
      expect(result).toEqual({
        id: "user-456",
        email: "user@example.com",
        firstName: "John",
        lastName: "User",
        role: "USER",
      });
    });

    it("devrait lancer une UnauthorizedError si l'utilisateur n'existe pas", async () => {
      // Arrange
      const input = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      // Mock: L'utilisateur n'existe pas
      prisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(login(prisma, input)).rejects.toThrow(UnauthorizedError);
    });

    it("devrait lancer une UnauthorizedError si le mot de passe est incorrect", async () => {
      // Arrange
      const input = {
        email: "user@example.com",
        password: "wrongpassword",
      };

      // Mock: L'utilisateur existe avec un hash différent
      prisma.user.findUnique.mockResolvedValue({
        id: "user-789",
        email: "user@example.com",
        password: "$2a$10$fakehashedpassword123456789", // Faux hash
        role: "USER",
      });

      // Act & Assert
      await expect(login(prisma, input)).rejects.toThrow(UnauthorizedError);
    });
  });
});
