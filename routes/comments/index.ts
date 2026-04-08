import { FastifyInstance } from "fastify";
import { CommentService } from "../../services/comment.service.js";
import { loggerDecorator } from "../../decorators/index.js";
import {
  CreateCommentSchema,
  CommentResponseSchema,
  UpdateCommentSchema,
} from "../../schemas/comment.schema.js";
import type {
  CreateCommentRequest,
  UpdateCommentRequest,
} from "../../schemas/comment.schema.js";

export const commentRoutes = async (app: FastifyInstance) => {
  const commentService = new CommentService(app.prisma);

  // GET /posts/:postId/comments - Récupérer tous les commentaires d'un post
  app.get(
    "/posts/:postId/comments",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            postId: { type: "string" },
          },
          required: ["postId"],
        },
        response: {
          200: {
            type: "array",
            items: CommentResponseSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { postId } = request.params as { postId: string };
      const comments = await commentService.getCommentsByPost(postId);
      return reply.send(comments);
    },
  );

  // GET /comments/:id - Récupérer un commentaire par ID
  app.get(
    "/comments/:id",
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
          200: CommentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const comment = await commentService.getCommentById(id);
      return reply.send(comment);
    },
  );

  // POST /posts/:postId/comments - Créer un commentaire sur un post
  app.post<{ Body: CreateCommentRequest; Params: { postId: string } }>(
    "/posts/:postId/comments",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            postId: { type: "string" },
          },
          required: ["postId"],
        },
        body: CreateCommentSchema,
        response: {
          201: CommentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { postId } = request.params;
      const comment = await commentService.createComment(
        postId,
        request.user.id,
        request.body,
      );
      return reply.status(201).send(comment);
    },
  );

  // PUT /comments/:id - Mettre à jour un commentaire
  app.put<{ Body: UpdateCommentRequest; Params: { id: string } }>(
    "/comments/:id",
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
        body: UpdateCommentSchema,
        response: {
          200: CommentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updatedComment = await commentService.updateComment(
        id,
        request.user.id,
        request.body,
      );
      return reply.send(updatedComment);
    },
  );

  // DELETE /comments/:id - Supprimer un commentaire
  app.delete(
    "/comments/:id",
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
          200: CommentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const deletedComment = await commentService.deleteComment(
        id,
        request.user.id,
      );
      return reply.send(deletedComment);
    },
  );
};
