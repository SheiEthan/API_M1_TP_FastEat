import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { FastifyInstance } from "fastify";
import { createTestServer, closeTestServer } from "../utils/test-setup.js";
import { prisma } from "../../prisma/prismaInstance.js";

describe.skip("Posts Routes Integration Tests", () => {
  let server: FastifyInstance;
  let userToken1: string;
  let userToken2: string;
  let userId1: string;
  let userId2: string;
  let postId1: string;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Nettoyer la base de données
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.dish.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.user.deleteMany();

    // Créer deux utilisateurs
    const user1Response = await server.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "user1@example.com",
        password: "password123",
        firstName: "User",
        lastName: "One",
      },
    });

    if (user1Response.statusCode !== 201) {
      console.error("User 1 registration failed:", user1Response.json());
    }
    userToken1 = user1Response.json().token;
    const user1 = await prisma.user.findUnique({
      where: { email: "user1@example.com" },
    });
    userId1 = user1!.id;

    const user2Response = await server.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "user2@example.com",
        password: "password123",
        firstName: "User",
        lastName: "Two",
      },
    });

    if (user2Response.statusCode !== 201) {
      console.error(
        "User 2 registration failed - Status:",
        user2Response.statusCode,
        "Response:",
        user2Response.json(),
      );
    }
    userToken2 = user2Response.json().token;
    const user2 = await prisma.user.findUnique({
      where: { email: "user2@example.com" },
    });
    userId2 = user2!.id;

    // Créer un post pour l'utilisateur 1
    const postResponse = await server.inject({
      method: "POST",
      url: "/api/posts",
      headers: {
        authorization: `Bearer ${userToken1}`,
      },
      payload: {
        text: "Post by user 1",
      },
    });

    postId1 = postResponse.json().id;
  });

  describe("GET /api/posts", () => {
    it("should return all posts", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/posts",
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      console.log("data sent", {
        method: "GET",
        url: "/api/posts",
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.json())).toBe(true);
      expect(response.json().length).toBeGreaterThanOrEqual(1);
    });

    it("should include user information in posts", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/posts",
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const posts = response.json();
      console.log("Posts retrieved:", posts);
      expect(posts[0]).toHaveProperty("userId");
    });

    it("should order posts by creation date descending", async () => {
      // Créer un autre post
      await server.inject({
        method: "POST",
        url: "/api/posts",
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
        payload: {
          text: "Second post",
        },
      });

      const response = await server.inject({
        method: "GET",
        url: "/api/posts",
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      const posts = response.json();
      expect(new Date(posts[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(posts[1].createdAt).getTime(),
      );
    });
  });

  describe("GET /api/posts/:id", () => {
    it("should return a post by id", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(postId1);
      expect(response.json().text).toBe("Post by user 1");
    });

    it("should return 404 for non-existent post", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/posts/non-existent-id`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should include comments in post details", async () => {
      // Ajouter un commentaire au post
      const commentPayload = {
        content: "Test comment",
      };

      await server.inject({
        method: "POST",
        url: `/api/posts/${postId1}/comments`,
        headers: {
          authorization: `Bearer ${userToken2}`,
        },
        payload: commentPayload,
      });

      const response = await server.inject({
        method: "GET",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      console.log(response.json(), "cest la reponse");

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("comments");
      expect(Array.isArray(response.json().comments)).toBe(true);
    });
  });

  describe("POST /api/posts", () => {
    it("should create a new post", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/posts",
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
        payload: {
          text: "New post",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveProperty("id");
      expect(response.json().text).toBe("New post");
      expect(response.json().userId).toBe(userId1);
    });

    it("should reject post without text field", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/posts",
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
        payload: {
          text: "", // Empty text
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject post without authorization", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/posts",
        payload: {
          text: "Unauthorized post",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 400 for missing text field", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/posts",
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("PUT /api/posts/:id", () => {
    it("should update a post by owner", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
        payload: {
          text: "Updated post text",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().text).toBe("Updated post text");

      // Vérifier que le post a réellement été mise à jour
      const getResponse = await server.inject({
        method: "GET",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(getResponse.json().text).toBe("Updated post text");
    });

    it("should return 403 when non-owner tries to update post", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken2}`,
        },
        payload: {
          text: "Hacked post",
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 404 for non-existent post", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/posts/non-existent-id`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
        payload: {
          text: "Updated text",
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 401 without authorization", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/posts/${postId1}`,
        payload: {
          text: "Updated text",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/posts/:id", () => {
    it("should delete a post by owner", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Vérifier que le post n'existe plus
      const getResponse = await server.inject({
        method: "GET",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it("should return 403 when non-owner tries to delete post", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken2}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 404 for non-existent post", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/posts/non-existent-id`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 401 without authorization", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/posts/${postId1}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it("should cascade delete comments when post is deleted", async () => {
      // Ajouter un commentaire
      const commentResponse = await server.inject({
        method: "POST",
        url: `/api/posts/${postId1}/comments`,
        headers: {
          authorization: `Bearer ${userToken2}`,
        },
        payload: {
          content: "Comment to be deleted",
        },
      });

      const commentId = commentResponse.json().id;

      // Supprimer le post
      await server.inject({
        method: "DELETE",
        url: `/api/posts/${postId1}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      // Vérifier que le commentaire a été supprimé aussi
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      expect(comment).toBeNull();
    });
  });

  describe("GET /api/posts/user/:userId", () => {
    it("should return posts by specific user", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/posts/user/${userId1}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.json())).toBe(true);
      expect(
        response.json().every((post: any) => post.userId === userId1),
      ).toBe(true);
    });

    it("should return empty array for user with no posts", async () => {
      // Créer un nouvel utilisateur
      const user3Response = await server.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "user3@example.com",
          password: "password123",
        },
      });

      const user3 = await prisma.user.findUnique({
        where: { email: "user3@example.com" },
      });

      const response = await server.inject({
        method: "GET",
        url: `/api/posts/user/${user3!.id}`,
        headers: {
          authorization: `Bearer ${userToken1}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().length).toBe(0);
    });
  });
});
