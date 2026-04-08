import { Type, Static } from "@sinclair/typebox";

export const CommentSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  content: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
  postId: Type.String({ format: "uuid" }),
});

export const CreateCommentSchema = Type.Object({
  content: Type.String({ minLength: 1, maxLength: 500 }),
});

export const UpdateCommentSchema = Type.Partial(CreateCommentSchema);

export const CommentResponseSchema = Type.Omit(CommentSchema, ["postId"]);

export type CreateCommentRequest = Static<typeof CreateCommentSchema>;
export type UpdateCommentRequest = Static<typeof UpdateCommentSchema>;
export type CommentResponse = Static<typeof CommentResponseSchema>;
