import { Type } from "@sinclair/typebox";

/**
 * RFC 7807 Problem Details schema
 */
export const ProblemDetailSchema = Type.Object({
  type: Type.String({ description: "URI identifier for the error type" }),
  title: Type.String({ description: "Short, human-readable summary" }),
  status: Type.Number({ description: "HTTP status code" }),
  detail: Type.String({ description: "Human-readable explanation" }),
  instance: Type.Optional(
    Type.String({ description: "URI identifying the specific occurrence" })
  ),
});

export const ErrorResponseSchema = ProblemDetailSchema;
