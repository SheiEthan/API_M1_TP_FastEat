import { FastifyInstance } from "fastify";
import { PostService } from "../../services/post.service.js";
import { loggerDecorator } from "../../decorators/index.js";
import {
  CreatePostSchema,
  PostResponseSchema,
  PostWithCommentsResponseSchema,
  UpdatePostSchema,
} from "../../schemas/post.schema.js";
import type {
  CreatePostRequest,
  UpdatePostRequest,
} from "../../schemas/post.schema.js";

export const postRoutes = async (app: FastifyInstance) => {
  const postService = new PostService(app.prisma);

  // GET /posts - Récupérer tous les posts
  app.get(
    "/posts",
    {
      preHandler: [app.authenticate],
      schema: {
        response: {
          200: {
            type: "array",
            items: PostResponseSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const posts = await postService.getAllPosts();
      return reply.send(posts);
    },
  );

  // GET /posts/user/:userId - Récupérer les posts d'un utilisateur
  app.get(
    "/posts/user/:userId",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            userId: { type: "string" },
          },
          required: ["userId"],
        },
        response: {
          200: {
            type: "array",
            items: PostResponseSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const posts = await postService.getUserPosts(userId);
      return reply.send(posts);
    },
  );

  // GET /posts/:id - Récupérer un post par ID
  app.get(
    "/posts/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: PostWithCommentsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const post = await postService.getPostById(id);
      return reply.send(post);
    },
  );

  // POST /posts - Créer un nouveau post
  app.post<{ Body: CreatePostRequest }>(
    "/posts",
    {
      preHandler: [app.authenticate],
      schema: {
        body: CreatePostSchema,
        response: {
          201: PostResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const post = await postService.createPost(request.user.id, request.body);
      return reply.status(201).send(post);
    },
  );

  // PUT /posts/:id - Mettre à jour un post
  app.put<{ Body: UpdatePostRequest; Params: { id: string } }>(
    "/posts/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        body: UpdatePostSchema,
        response: {
          200: PostResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updatedPost = await postService.updatePost(
        id,
        request.user.id,
        request.body,
      );
      return reply.send(updatedPost);
    },
  );

  // DELETE /posts/:id - Supprimer un post
  app.delete(
    "/posts/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          204: PostResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const deletedPost = await postService.deletePost(id, request.user.id);
      return reply.status(204).send(deletedPost);
    },
  );
};
