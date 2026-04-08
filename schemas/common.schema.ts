import { Type, Static } from "@sinclair/typebox";

/**
 * Schéma pour les paramètres de pagination
 */
export const PaginationQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

export type PaginationQuery = Static<typeof PaginationQuerySchema>;

/**
 * Schéma pour les métadonnées de pagination
 */
export const PaginationMetadataSchema = Type.Object({
  total: Type.Integer(),
  limit: Type.Integer(),
  offset: Type.Integer(),
  hasMore: Type.Boolean(),
});

export type PaginationMetadata = Static<typeof PaginationMetadataSchema>;

/**
 * Créer un schéma de réponse paginée
 */
export const createPaginatedSchema = <T>(itemSchema: any) =>
  Type.Object({
    data: Type.Array(itemSchema),
    pagination: PaginationMetadataSchema,
  });
