import { FastifyInstance } from "fastify/types/instance";
import {
    login,
    register,
    issueRefreshToken,
    refreshAccessToken,
    revokeRefreshToken,
} from "../../services/auth.service.js";
import {
    LoginSchema,
    RegisterSchema,
    TokenResponseSchema,
    RefreshTokenRequestSchema,
    RefreshTokenResponseSchema,
    type LoginRequest,
    type RegisterRequest,
    type RefreshTokenRequest,
} from "../../schemas/auth.schema.js";
import { ErrorResponseSchema } from "../../schemas/error.schema.js";
import { authorize } from "../../decorators/jwtDecorator.js";
import { loginRateLimiter } from "../../services/loginRateLimiter.service.js";

export const authRoutes = async (app: FastifyInstance) => {
    // POST /auth/register
    app.post<{ Body: RegisterRequest }>(
        "/register",
        {
            schema: {
                tags: ["Auth"],
                summary: "Créer un compte",
                body: RegisterSchema,
                response: {
                    201: TokenResponseSchema,
                    409: ErrorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const user = await register(app.prisma, request.body);
            const accessToken = app.jwt.sign({ id: user.id, role: user.role });
            const refreshToken = await issueRefreshToken(app.prisma, user.id);
            return reply.status(201).send({ accessToken, refreshToken, user });
        },
    );

    // POST /auth/login
    app.post<{ Body: LoginRequest }>(
        "/login",
        {
            schema: {
                tags: ["Auth"],
                summary: "Se connecter",
                body: LoginSchema,
                response: {
                    200: TokenResponseSchema,
                    401: ErrorResponseSchema,
                    429: ErrorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const ip = request.ip;
            const check = loginRateLimiter.check(ip);

            if (!check.allowed) {
                const message =
                    check.reason === "hard_ban"
                        ? `Trop de tentatives. IP bloquée pour ${check.retryAfter} secondes.`
                        : `Trop d'échecs. Réessayez dans ${check.retryAfter} secondes.`;
                return reply
                    .status(429)
                    .header("Retry-After", String(check.retryAfter))
                    .send({
                        type: "urn:app:error:rate-limit",
                        title: "Too Many Requests",
                        status: 429,
                        detail: message,
                        instance: request.url,
                    });
            }

            try {
                const user = await login(app.prisma, request.body);
                const accessToken = app.jwt.sign({
                    id: user.id,
                    role: user.role,
                });
                const refreshToken = await issueRefreshToken(
                    app.prisma,
                    user.id,
                );
                loginRateLimiter.recordSuccess(ip);
                return reply
                    .status(200)
                    .send({ accessToken, refreshToken, user });
            } catch (err) {
                loginRateLimiter.recordFailure(ip);
                const remaining = loginRateLimiter.remainingAttempts(ip);
                return reply
                    .status(401)
                    .header("X-RateLimit-Remaining", String(remaining))
                    .send({
                        type: "urn:app:error:unauthorized",
                        title: "Unauthorized",
                        status: 401,
                        detail:
                            remaining > 0
                                ? `Identifiants incorrects. ${remaining} tentative(s) restante(s).`
                                : "Identifiants incorrects. IP bloquée pour 15 minutes.",
                        instance: request.url,
                    });
            }
        },
    );

    // POST /auth/refresh
    app.post<{ Body: RefreshTokenRequest }>(
        "/refresh",
        {
            schema: {
                tags: ["Auth"],
                summary: "Renouveler l'access token via le refresh token",
                body: RefreshTokenRequestSchema,
                response: {
                    200: RefreshTokenResponseSchema,
                    401: ErrorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const { user, newRefreshToken } = await refreshAccessToken(
                app.prisma,
                request.body.refreshToken,
            );
            const accessToken = app.jwt.sign({ id: user.id, role: user.role });
            return reply
                .status(200)
                .send({ accessToken, refreshToken: newRefreshToken });
        },
    );

    // POST /auth/logout
    app.post<{ Body: RefreshTokenRequest }>(
        "/logout",
        {
            schema: {
                tags: ["Auth"],
                summary: "Se déconnecter (révoque le refresh token)",
                body: RefreshTokenRequestSchema,
                response: {
                    204: { type: "null" },
                },
            },
        },
        async (request, reply) => {
            await revokeRefreshToken(app.prisma, request.body.refreshToken);
            return reply.status(204).send();
        },
    );

    // GET /auth/me
    app.get(
        "/me",
        {
            onRequest: [authorize()],
            schema: {
                tags: ["Auth"],
                summary: "Récupérer mon profil",
                security: [{ bearerAuth: [] }],
                response: {
                    200: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            email: { type: "string" },
                            role: { type: "string" },
                        },
                    },
                    401: ErrorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            return reply.status(200).send({
                id: request.user.id,
                email: request.user.email,
                role: request.user.role,
            });
        },
    );
};
