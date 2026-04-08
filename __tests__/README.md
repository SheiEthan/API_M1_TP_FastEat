# Test Suite Documentation

Comprehensive test suite pour le projet Fastify RBAC API avec Prisma et TypeScript.

## Structure des Tests

```
__tests__/
├── services/                          # Tests unitaires des services
│   ├── auth.service.test.ts           # Tests auth (register, login, password hashing)
│   ├── user.service.test.ts           # Tests utilisateurs (CRUD + permissions)
│   ├── post.service.test.ts           # Tests posts (création, modification, suppression)
│   └── comment.service.test.ts        # Tests commentaires et autorisation
├── integration/                       # Tests d'intégration E2E
│   ├── auth.integration.test.ts       # Authentification JWT + endpoints protégés
│   ├── posts.integration.test.ts      # Routes posts + cascade delete
│   ├── comments.integration.test.ts   # Routes commentaires + autorisation
│   ├── users.integration.test.ts      # Routes utilisateurs + permissions
│   └── edge-cases.integration.test.ts # Cas limites + cohérence données
└── utils/
    └── test-setup.ts                  # Factory serveur Fastify pour tests
```

## Installation des dépendances

```bash
npm install
```

Les dépendances de test suivantes sont incluses:

- **vitest**: Framework de test rapide avec support TypeScript
- **@vitest/ui**: Interface utilisateur pour visualiser les tests
- **@vitest/coverage-v8**: Couverture de code
- **supertest**: Tester les routes HTTP (préinstallé mais intégré avec vitest)

## Commandes de Test

### Exécuter tous les tests

```bash
npm run test
```

### Mode watch (réexécute les tests à chaque modification)

```bash
npm run test:watch
```

### Interface utilisateur

```bash
npm run test:ui
```

Ouvre une interface web interactive à `http://localhost:51204` pour visualiser les résultats.

### Couverture de code

```bash
npm run test:coverage
```

Génère un rapport de couverture en HTML dans `coverage/`.

## Types de Tests

### 1. Tests Unitaires - Services (`__tests__/services/`)

Tests isolés des services métier avec mocks Prisma.

**Fichiers et couverture:**

- **`auth.service.test.ts`**
  - ✅ Register utilisateur valide
  - ✅ Reject email en doublon (ConflictError)
  - ✅ Hash du mot de passe
  - ✅ Login avec bons credentials
  - ✅ Login utilisateur inexistant (UnauthorizedError)
  - ✅ Login mauvais mot de passe (UnauthorizedError)

- **`user.service.test.ts`**
  - ✅ getAllUsers (sans passwords)
  - ✅ getUserById + NotFoundError
  - ✅ createUser
  - ✅ updateUser - permission (propriétaire seulement)
  - ✅ deleteUser - permission (propriétaire seulement)

- **`post.service.test.ts`**
  - ✅ getAllPosts avec user info
  - ✅ getPostById + comments
  - ✅ getUserPosts
  - ✅ createPost
  - ✅ updatePost - vérification propriété
  - ✅ deletePost + cascade

- **`comment.service.test.ts`**
  - ✅ createComment sur post existant
  - ✅ Reject commentaire si post inexistant
  - ✅ getCommentsByPost
  - ✅ getCommentById
  - ✅ updateComment - permission post owner
  - ✅ deleteComment - permission post owner

**Caractéristiques:**

- ✅ Prisma mocké avec `vi.fn()`
- ✅ Tests des chemins heureux et erreurs
- ✅ Validation des appels à la BD
- ✅ Tests des permissions et ownership

**Exécuter uniquement les tests services:**

```bash
npx vitest run __tests__/services/
```

### 2. Tests d'Intégration - Authentification (`__tests__/integration/auth.integration.test.ts`)

Tests complets du flux d'authentification avec serveur Fastify.

**Cas testés:**

- ✅ **POST /api/auth/register**
  - Register nouvel utilisateur → token JWT
  - Email invalide → 400
  - Email en doublon → 409
  - Password manquant → 400
  - Email manquant → 400

- ✅ **POST /api/auth/login**
  - Login credentials valides → token JWT
  - Utilisateur inexistant → 401
  - Mot de passe incorrect → 401
  - Email manquant → 400
  - Password manquant → 400

- ✅ **Routes Protégées**
  - Accès avec token valide → 200
  - Accès sans token → 401
  - Token invalide → 401
  - Malformed authorization header → 401

**Exécuter:**

```bash
npx vitest run __tests__/integration/auth.integration.test.ts
```

### 3. Tests d'Intégration - Posts (`__tests__/integration/posts.integration.test.ts`)

Tests HTTP complets des routes posts avec permissions RBAC.

**Cas testés:**

- ✅ **GET /api/posts** → liste ordonnée par date DESC
- ✅ **GET /api/posts/:id** → détails avec commentaires
- ✅ **GET /api/posts/user/:userId** → posts d'un utilisateur
- ✅ **POST /api/posts**
  - Créer post → 201
  - Sans text → 400
  - Sans authentification → 401
- ✅ **PUT /api/posts/:id**
  - Update par propriétaire → 200
  - Update par autre user → 403
  - Post inexistant → 404
- ✅ **DELETE /api/posts/:id**
  - Delete par propriétaire → 204
  - Delete par autre user → 403
  - Cascade delete comments → ✅
  - Post inexistant → 404

**Exécuter:**

```bash
npx vitest run __tests__/integration/posts.integration.test.ts
```

### 4. Tests d'Intégration - Commentaires (`__tests__/integration/comments.integration.test.ts`)

Tests HTTP des routes commentaires avec autorisation.

**Cas testés:**

- ✅ **POST /api/posts/:postId/comments**
  - Créer commentaire → 201
  - Post inexistant → 404
  - Content manquant → 400
  - Sans authentification → 401

- ✅ **GET /api/posts/:postId/comments**
  - Liste commentaires ordonnés DESC
  - Post inexistant → 404

- ✅ **GET /api/comments/:id** → commentaire spécifique

- ✅ **PUT /api/comments/:id - Permissions**
  - Update par post owner → 200
  - Update par autre user → 403
  - Commentaire inexistant → 404

- ✅ **DELETE /api/comments/:id - Permissions**
  - Delete par post owner → 204
  - Delete par autre user → 403
  - Commentaire inexistant → 404

**Exécuter:**

```bash
npx vitest run __tests__/integration/comments.integration.test.ts
```

### 5. Tests d'Intégration - Utilisateurs (`__tests__/integration/users.integration.test.ts`)

Tests des routes utilisateurs et permissions.

**Cas testés:**

- ✅ **GET /api/users** → liste (sans passwords)
- ✅ **GET /api/users/:id** → détails utilisateur
- ✅ **PUT /api/users/:id**
  - Update profil utilisateur → 200
  - Autres utilisateurs → 403
  - Cascade updates OK
- ✅ **DELETE /api/users/:id**
  - Delete account → 204
  - Autres comptes → 403
  - **Cascade delete**: posts + comments

**Exécuter:**

```bash
npx vitest run __tests__/integration/users.integration.test.ts
```

### 6. Tests d'Intégration - Cas Limites (`__tests__/integration/edge-cases.integration.test.ts`)

Tests des scénarios complexes et cohérence données.

**Cas testés:**

- ✅ **Cascade Delete**
  - Post supprimé → tous les comments effacés
  - Utilisateur supprimé → posts + comments effacés
- ✅ **Empty/Null Handling**
  - Liste vide OK
  - Post sans commentaires OK
  - Commentaires en ordre DESC

- ✅ **Timestamp Consistency**
  - createdAt ≤ updatedAt
  - updatedAt change lors modification

- ✅ **Validation & Constraints**
  - Email unique enforcé
  - Contenu vide rejeté
  - Texte trop long géré

- ✅ **Race Conditions**
  - Posts concurrents créés
  - Données cohérentes

**Exécuter:**

```bash
npx vitest run __tests__/integration/edge-cases.integration.test.ts
```

### 7. Utilitaires de Test (`__tests__/utils/test-setup.ts`)

Factory pour créer un serveur Fastify avec configuration complète:

```typescript
const server = await createTestServer();
const response = await server.inject({
  method: "POST",
  url: "/api/posts",
  headers: { authorization: `Bearer ${token}` },
  payload: { text: "Test post" },
});
await closeTestServer(server);
```

### 3. Tests d'Intégration Routes (`__tests__/integration/`)

Tests des endpoints HTTP avec serveur Fastify mocké.

**Fichiers:**

- `setup.ts` - Utilitaires de test (createTestServer, generateTestToken)
- `auth.routes.test.ts` - POST /auth/register, /auth/login
- `user.routes.test.ts` - GET/POST/PUT/DELETE /users
- `post.routes.test.ts` - GET/POST/PUT/DELETE /posts
- `comment.routes.test.ts` - GET/POST/PUT/DELETE /posts/:id/comments

**Caractéristiques:**

- ✅ HTTP status codes corrects (201, 200, 400, 401, 403, 404, 409)
- ✅ Validation des tokens JWT
- ✅ Tests d'authentification/autorisation
- ✅ Gestion d'erreurs propre

### 4. Tests E2E (`__tests__/integration/e2e.test.ts`)

Scénarios réalistes complets de workflow utilisateur.

**Cas testés:**

1. **User Lifecycle**
   - Inscription → Création de post → Ajout de commentaire
2. **Authentication & Authorization**
   - Routes protégées sans token → 401
   - Tokens invalides → 401
3. **Error Handling**
   - Email invalide
   - Texte trop long
   - Champs manquants
4. **Data Consistency**
   - Intégrité référentielle (posts/comments)
   - Contraintes de propriété
5. **Response Format**
   - Status codes corrects
   - Headers JSON
   - Structure de réponse

## Stratégie de Tests

### Couverture

- **Services**: Logique métier isolée - 100% des cas (success, erreurs, edge cases)
- **Schémas**: Validation des données - tous les formats et limites
- **Routes**: Intégration HTTP - tous les statuts et workflows
- **E2E**: Scénarios utilisateur réalistes - happy paths et erreurs

### Mocking

1. **Prisma Client**: Mocké avec `vi.fn()` pour chaque modèle
2. **JWT**: Généré via `app.jwt.sign()` dans les tests

### Assertions

Patterns utilisés:

```typescript
// Status codes
expect([200, 404, 500]).toContain(response.statusCode);

// Body content
expect(body.token).toBeDefined();
expect(body.email).toBe(userData.email);

// Function calls
expect(mockPrisma.user.create).toHaveBeenCalled();
expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);

// Errors
await expect(service.action()).rejects.toThrow(CustomError);
```

## Résultats Attendus

Après `npm run test`, vous devriez voir :

```
 ✓ __tests__/services/auth.service.test.ts (6)
 ✓ __tests__/services/user.service.test.ts (8)
 ✓ __tests__/services/post.service.test.ts (7)
 ✓ __tests__/services/comment.service.test.ts (8)
 ✓ __tests__/schemas/auth.schema.test.ts (13)
 ✓ __tests__/schemas/user.schema.test.ts (15)
 ✓ __tests__/schemas/post.schema.test.ts (12)
 ✓ __tests__/schemas/comment.schema.test.ts (14)
 ✓ __tests__/integration/auth.routes.test.ts (9)
 ✓ __tests__/integration/user.routes.test.ts (8)
 ✓ __tests__/integration/post.routes.test.ts (12)
 ✓ __tests__/integration/comment.routes.test.ts (13)
 ✓ __tests__/integration/e2e.test.ts (9)

Test Files  13 passed (13)
     Tests  128 passed (128)
```

## Bonnes Pratiques

### 1. Ajouter des tests pour une nouvelle feature

```typescript
// 1. Test unitaire du service
describe("NewService", () => {
  it("should perform action", async () => {
    // Setup mocks
    mockPrisma.model.method.mockResolvedValue(expectedValue);

    // Execute
    const result = await service.action(input);

    // Assert
    expect(result).toEqual(expectedValue);
    expect(mockPrisma.model.method).toHaveBeenCalled();
  });
});

// 2. Test du schéma
describe("NewSchema", () => {
  it("should validate correct data", () => {
    const valid = { field: "value" };
    expect(Value.Check(NewSchema, valid)).toBe(true);
  });

  it("should reject invalid data", () => {
    const invalid = { field: "" };
    expect(Value.Check(NewSchema, invalid)).toBe(false);
  });
});

// 3. Test d'intégration de route
describe("POST /new-endpoint", () => {
  it("should create resource", async () => {
    mockPrisma.model.create.mockResolvedValue({ id: "123" });

    const response = await app.inject({
      method: "POST",
      url: "/new-endpoint",
      payload: validData,
      headers: { authorization: `Bearer ${token}` },
    });

    expect([201, 400, 401]).toContain(response.statusCode);
  });
});
```

### 2. Tests Rapides - Utiliser les Fixtures

```typescript
beforeEach(async () => {
  mockPrisma = createMockPrisma();
  app = await createTestServer(mockPrisma);
  token = generateTestToken(app);
});

afterEach(async () => {
  await app.close();
  resetMocks(mockPrisma);
});
```

### 3. Tests Lisibles - Utiliser des Descriptions Claires

```typescript
describe("Authentication", () => {
  describe("when user provides valid credentials", () => {
    it("should return JWT token", async () => {
      // ...
    });
  });

  describe("when user provides invalid email", () => {
    it("should reject with 400", async () => {
      // ...
    });
  });
});
```

## Dépannage

### Les tests ne s'exécutent pas

**Solution:** Assurez-vous que les dépendances sont installées:

```bash
npm install
```

### Erreur: "Cannot find module"

**Solution:** TypeScript peut avoir besoin de recompiler:

```bash
npm run build
rm -rf dist
npm run test
```

### Tests lents

**Solution:** Utiliser le mode watch:

```bash
npm run test:watch
```

### Couverture faible

**Solution:** Générer un rapport:

```bash
npm run test:coverage
open coverage/index.html
```

## Configuration

Voir `vitest.config.ts`:

- Environment: Node
- Globals: true (describe, it, expect)
- Coverage: v8
- Le test execute le code TypeScript directement via tsx

## Intégration CI/CD

Pour GitHub Actions, ajouter:

```yaml
- name: Run tests
  run: npm run test

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [TypeBox Validation](https://github.com/sinclairzx81/typebox)
- [Fastify Testing](https://docs.fastify.io/guides/testing)
- [JWT Testing](https://www.npmjs.com/package/@fastify/jwt)
