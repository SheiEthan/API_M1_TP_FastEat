# FastEat API

API REST pour le frontend de mon projet scolaire **FastEat M1**.

## 🚀 Stack

- **Framework**: Fastify 5.6 + TypeScript
- **Database**: Prisma ORM + MySQL 8.0
- **Auth**: JWT + bcryptjs
- **Validation**: TypeBox schemas
- **Runtime**: Node.js (ES modules)

## 📦 Lancer le projet

```bash
npm install
cp .env.example .env     # Configurer DATABASE_URL
npx prisma migrate dev
npx prisma generate
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## 🌐 Routes API

| Préfixe                       | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `/api/auth`                   | Register, login, me                              |
| `/api/users/me`               | Profil utilisateur (GET, PATCH, DELETE)          |
| `/api/restaurants`            | CRUD restaurants + list avec pagination          |
| `/api/restaurants/:id/dishes` | Plats par restaurant (list, filters, pagination) |
| `/api/orders`                 | Commandes (création, list, statuts)              |

## 📊 Architecture

```
├── index.ts                 # Entrée principale
├── common/
│   ├── exceptions.ts        # Classes d'erreurs RFC 7807
│   └── pagination.ts        # Helpers pagination
├── prisma/
│   └── schema.prisma        # Schéma ORM
├── routes/                  # Endpoints API
│   ├── auth/
│   ├── restaurants/
│   ├── dishes/
│   ├── orders/
│   └── users/
├── schemas/                 # Validation TypeBox
├── services/                # Business logic
└── types/                   # Types TypeScript
```

## ✨ Features

✅ **Authentification & Authorization**

- JWT tokens
- Roles (USER, RESTAURANT, ADMIN)
- Ownership verification

✅ **Restaurants & Dishes**

- CRUD complet
- Pagination
- Filtres (prix, catégorie)

✅ **Orders**

- Création avec calcul prix
- Status transitions (PENDING → CONFIRMED → READY...)
- Pagination & filtres

✅ **Validation & Erreurs**

- TypeBox schemas
- RFC 7807 error format
- Input validation

## 🧪 Exemples

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"Pass123!",
    "firstName":"John",
    "lastName":"Doe",
    "role":"USER"
  }'
```

### List Restaurants (pagination)

```bash
curl -X GET "http://localhost:3000/api/restaurants?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List Dishes (filtres)

```bash
curl -X GET "http://localhost:3000/api/restaurants/resto-id/dishes?minPrice=10&maxPrice=50&name=pizza" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId":"resto-id",
    "items":[{"dishId":"dish-id","quantity":2}],
    "deliveryAddress":"123 Main St",
    "deliveryCity":"Paris"
  }'
```

## 📝 Base de données

### Models

- **User** (id, email, password, firstName, lastName, role)
- **Restaurant** (id, name, address, city, userId)
- **Dish** (id, name, price, category, restaurantId)
- **Order** (id, status, totalPrice, userId, restaurantId)
- **OrderItem** (dishId, quantity, unitPrice, specialInstructions)

### Enums

- **UserRole**: USER | RESTAURANT | ADMIN
- **OrderStatus**: PENDING | CONFIRMED | PREPARING | READY | DELIVERED | CANCELLED
- **DishCategory**: APPETIZER | MAIN_COURSE | DESSERT | BEVERAGE | SIDE_DISH

## 🛠️ Développement

```bash
npm run dev           # Start with hot reload
npm run build         # Build TypeScript
npm run test          # Run tests
npm run lint          # Lint code
```

---

**FastEat M1** - Projet scolaire 2026
