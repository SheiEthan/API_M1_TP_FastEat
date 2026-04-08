import { Type, Static } from "@sinclair/typebox";

export const PostSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  text: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
  userId: Type.String({ format: "uuid" }),
});

export const CreatePostSchema = Type.Object({
  text: Type.String({ minLength: 1, maxLength: 500 }),
});

export const UpdatePostSchema = Type.Partial(CreatePostSchema);

export const PostResponseSchema = PostSchema;
export const PostWithCommentsResponseSchema = Type.Object({
  ...PostSchema.properties,
  comments: Type.Array(
    Type.Object({
      id: Type.String({ format: "uuid" }),
      content: Type.String(),
      createdAt: Type.String({ format: "date-time" }),
      updatedAt: Type.String({ format: "date-time" }),
    }),
  ),
});

export const PostDetailResponseSchema = Type.Object({
  ...Type.Omit(PostSchema, ["userId"]).properties,
  user: Type.Object({
    id: Type.String(),
    email: Type.String(),
    firstName: Type.String(),
  }),
});

export type CreatePostRequest = Static<typeof CreatePostSchema>;
export type UpdatePostRequest = Static<typeof UpdatePostSchema>;
export type PostResponse = Static<typeof PostResponseSchema>;
