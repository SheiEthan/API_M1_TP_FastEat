import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { FastifyInstance } from "fastify";
import { createTestServer, closeTestServer } from "../utils/test-setup.js";
import { prisma } from "../../prisma/prismaInstance.js";
import { hash } from "bcryptjs";

describe("Restaurant Routes Integration Tests", () => {
  let server: FastifyInstance;
  let restaurantToken: string;
  let userToken: string;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.rating.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.dish.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await hash("password123", 10);

    // Créer un user avec rôle RESTAURANT directement en DB
    await prisma.user.create({
      data: {
        email: "owner@restaurant.com",
        password: hashedPassword,
        role: "RESTAURANT",
      },
    });

    // Créer un user normal
    await prisma.user.create({
      data: {
        email: "user@example.com",
        password: hashedPassword,
        role: "USER",
      },
    });

    // Login pour obtenir les tokens
    const ownerLogin = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "owner@restaurant.com", password: "password123" },
    });
    restaurantToken = ownerLogin.json().token;

    const userLogin = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "user@example.com", password: "password123" },
    });
    userToken = userLogin.json().token;
  });

  // ─── GET /api/restaurants ────────────────────────────────────────────────────

  describe("GET /api/restaurants", () => {
    it("should return empty list when no restaurants exist", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/restaurants",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("data");
      expect(response.json().data).toEqual([]);
      expect(response.json()).toHaveProperty("pagination");
      expect(response.json().pagination.total).toBe(0);
    });

    it("should return all restaurants with pagination info", async () => {
      await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Chez Pierre", address: "1 Rue de la Paix", city: "Paris" },
      });

      const response = await server.inject({
        method: "GET",
        url: "/api/restaurants",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toHaveLength(1);
      expect(response.json().data[0].name).toBe("Chez Pierre");
      expect(response.json().pagination.total).toBe(1);
      expect(response.json().pagination).toHaveProperty("hasMore");
    });

    it("should work without authentication (public route)", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/restaurants",
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ─── POST /api/restaurants ───────────────────────────────────────────────────

  describe("POST /api/restaurants", () => {
    it("should create a restaurant for a RESTAURANT role user", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Mon Restaurant", address: "5 Avenue Foch", city: "Lyon" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveProperty("id");
      expect(response.json().name).toBe("Mon Restaurant");
      expect(response.json().city).toBe("Lyon");

      // Vérifier que le restaurant est en base de données
      const restaurant = await prisma.restaurant.findFirst({
        where: { name: "Mon Restaurant" },
      });
      expect(restaurant).toBeDefined();
      expect(restaurant?.city).toBe("Lyon");
    });

    it("should return 401 when a USER role tries to create a restaurant", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${userToken}` },
        payload: { name: "Interdit", address: "1 Rue Test", city: "Paris" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 401 without authentication", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/restaurants",
        payload: { name: "Sans Auth", address: "1 Rue Test", city: "Paris" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 409 when user already owns a restaurant", async () => {
      await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Premier", address: "1 Rue A", city: "Paris" },
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Deuxième", address: "2 Rue B", city: "Lyon" },
      });

      expect(response.statusCode).toBe(409);

      // Vérifier qu'il n'y a toujours qu'un seul restaurant
      const count = await prisma.restaurant.count();
      expect(count).toBe(1);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Sans Adresse" }, // address et city manquants
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── GET /api/restaurants/:id ────────────────────────────────────────────────

  describe("GET /api/restaurants/:restaurantId", () => {
    it("should return a restaurant by ID (public route)", async () => {
      const createResponse = await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Restaurant Par ID", address: "5 Rue de Test", city: "Marseille" },
      });

      const restaurantId = createResponse.json().id;

      const response = await server.inject({
        method: "GET",
        url: `/api/restaurants/${restaurantId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(restaurantId);
      expect(response.json().name).toBe("Restaurant Par ID");
    });

    it("should return 404 for a non-existent restaurant", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/restaurants/id-qui-nexiste-pas",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── GET /api/restaurants/me ─────────────────────────────────────────────────

  describe("GET /api/restaurants/me", () => {
    it("should return the restaurant of the authenticated RESTAURANT user", async () => {
      await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Mon Resto", address: "1 Rue A", city: "Paris" },
      });

      const response = await server.inject({
        method: "GET",
        url: "/api/restaurants/me",
        headers: { authorization: `Bearer ${restaurantToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe("Mon Resto");
    });

    it("should return 404 when RESTAURANT user has no restaurant yet", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/restaurants/me",
        headers: { authorization: `Bearer ${restaurantToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 401 for a USER role (insufficient permissions)", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/restaurants/me",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 401 without authentication", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/restaurants/me",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── PATCH /api/restaurants/me ───────────────────────────────────────────────

  describe("PATCH /api/restaurants/me", () => {
    it("should update the restaurant name", async () => {
      await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Ancien Nom", address: "Ancienne Adresse", city: "Paris" },
      });

      const response = await server.inject({
        method: "PATCH",
        url: "/api/restaurants/me",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Nouveau Nom" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe("Nouveau Nom");
      expect(response.json().city).toBe("Paris"); // non modifié
    });

    it("should return 404 when user has no restaurant to update", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/restaurants/me",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "Mise à jour impossible" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 401 without authentication", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/restaurants/me",
        payload: { name: "Sans Auth" },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── DELETE /api/restaurants/me ──────────────────────────────────────────────

  describe("DELETE /api/restaurants/me", () => {
    it("should delete the restaurant and return 204", async () => {
      await server.inject({
        method: "POST",
        url: "/api/restaurants",
        headers: { authorization: `Bearer ${restaurantToken}` },
        payload: { name: "A Supprimer", address: "1 Rue Delete", city: "Bordeaux" },
      });

      const response = await server.inject({
        method: "DELETE",
        url: "/api/restaurants/me",
        headers: { authorization: `Bearer ${restaurantToken}` },
      });

      expect(response.statusCode).toBe(204);

      // Vérifier que le restaurant est bien supprimé en DB
      const count = await prisma.restaurant.count();
      expect(count).toBe(0);
    });

    it("should return 404 when user has no restaurant to delete", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/restaurants/me",
        headers: { authorization: `Bearer ${restaurantToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 401 without authentication", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/restaurants/me",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
