import type { IResolvers } from "mercurius";
import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../common/exceptions.js";
import { PostService } from "../services/post.service.js";

export const createPostResolvers = (app: FastifyInstance): IResolvers => {
  const postService = new PostService(app.prisma);

  return {
    Query: {
      posts: async () => {
        return await postService.getAllPosts();
      },
      post: async (_: any, { id }: { id: string }) => {
        const post = await postService.getPostById(id);
        return post;
      },
    },
    Mutation: {
      createPost: async (
        _: any,
        { title, content }: { title: string; content: string },
      ) => {
        const newPost = await postService.createPost(title, content);
        return newPost;
      },
      deletePost: async (_: any, { id }: { id: string }) => {
        const deleted = await postService.deletePost(id);
        return true;
      },
    },
  };
};
