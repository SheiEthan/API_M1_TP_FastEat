import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { FastifyInstance } from "fastify";
import { createTestServer, closeTestServer } from "../utils/test-setup.js";
import { prisma } from "../../prisma/prismaInstance.js";

describe("Authentication Integration Tests", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // Avant TOUS les tests : démarrer le serveur
    server = await createTestServer();
  });

  afterAll(async () => {
    // Après TOUS les tests : arrêter le serveur
    await closeTestServer(server);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Avant CHAQUE test : nettoyer la base de données
    await prisma.user.deleteMany();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user and return a valid JWT token", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "test@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveProperty("token");

      const token = response.json().token;
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      // Vérifier que l'utilisateur est créé
      const user = await prisma.user.findUnique({
        where: { email: "test@example.com" },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe("test@example.com");
    });

    it("should reject registration with invalid email format", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "invalid-email",
          password: "password123",
          firstName: "Jane",
        },
      });

      expect(response.statusCode).toBe(400);

      // Vérifier que l'utilisateur n'est PAS dans la base de données
      const user = await prisma.user.findUnique({
        where: { email: "invalid-email" },
      });
      expect(user).toBeNull();
    });

    it("should return 409 when email already exists", async () => {
      // Créer un premier utilisateur
      await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "duplicate@example.com",
          password: "password123",
        },
      });

      // Tentative de créer un utilisateur avec le même email
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "duplicate@example.com",
          password: "password456",
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toHaveProperty("type");
      expect(response.json().type).toContain("conflict");

      // Vérifier qu'il n'y a qu'UN seul utilisateur dans la base de données
      const count = await prisma.user.count();
      expect(count).toBe(1);
    });

    it("should reject registration with missing password", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "test@example.com",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject registration with missing email", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Créer un utilisateur pour les tests de login
      await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "login@example.com",
          password: "correctpassword",
        },
      });
    });

    it("should login with valid credentials and return JWT token", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "login@example.com",
          password: "correctpassword",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("token");
      expect(typeof response.json().token).toBe("string");
    });

    it("should return 401 for non-existent user", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "nonexistent@example.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 401 for incorrect password", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "login@example.com",
          password: "wrongpassword",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 400 for missing email", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing password", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "login@example.com",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Protected Routes - GET /api/users/me", () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Créer un utilisateur et obtenir son token
      const registerResponse = await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "protected@example.com",
          password: "password123",
        },
      });

      authToken = registerResponse.json().token;

      // Récupérer l'ID de l'utilisateur depuis la base de données
      const user = await prisma.user.findUnique({
        where: { email: "protected@example.com" },
      });
      userId = user!.id;
    });

    it("should allow access to protected route with valid token", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/users/me",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("id");
      expect(response.json().id).toBe(userId);
    });

    it("should return 401 when accessing protected route without token", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/users/me",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 401 with invalid token", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/users/me",
        headers: {
          authorization: "Bearer invalid-token",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 401 with malformed authorization header", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/users/me",
        headers: {
          authorization: "InvalidFormat token",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
