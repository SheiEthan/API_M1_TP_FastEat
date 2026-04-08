/**
 * RFC 7807 Problem Details for HTTP APIs
 */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

/**
 * Classe d'erreur personnalisée pour les réponses HTTP (RFC 7807)
 */
export class AppError extends Error {
  public readonly problemDetail: ProblemDetail;

  constructor(
    public statusCode: number,
    title: string,
    detail: string,
    type: string = "urn:app:error:internal"
  ) {
    super(detail);
    this.name = "AppError";
    this.problemDetail = {
      type,
      title,
      status: statusCode,
      detail,
    };
  }

  toJSON() {
    return this.problemDetail;
  }
}

/**
 * Erreur 400 - Requête invalide
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, "Bad Request", message, "urn:app:error:bad-request");
    this.name = "BadRequestError";
  }
}

/**
 * Erreur 401 - Non authentifié
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Invalid Access Token") {
    super(401, "Unauthorized", message, "urn:app:error:unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Erreur 403 - Non autorisé
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Access Forbidden") {
    super(403, "Forbidden", message, "urn:app:error:forbidden");
    this.name = "ForbiddenError";
  }
}

/**
 * Erreur 404 - Non trouvé
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Ressource non trouvée") {
    super(404, "Not Found", message, "urn:app:error:not-found");
    this.name = "NotFoundError";
  }
}

/**
 * Erreur 409 - Conflit
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "Conflict", message, "urn:app:error:conflict");
    this.name = "ConflictError";
  }
}
