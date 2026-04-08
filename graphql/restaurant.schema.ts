// Schéma GraphQL pour Restaurant, Dish, Order, OrderItem
export const restaurantSchema = `
  type User {
    id: String!
    email: String!
    role: String!
  }

  type Restaurant {
    id: String!
    name: String!
    address: String!
    city: String!
    userId: String!
    dishes: [Dish!]!
  }

  type Dish {
    id: String!
    name: String!
    price: Float!
    category: String!
    description: String!
    restaurantId: String!
  }

  type OrderItem {
    id: String!
    orderId: String!
    dishId: String!
    quantity: Int!
    unitPrice: Float!
    subtotal: Float!
  }

  type Order {
    id: String!
    totalPrice: Float!
    status: String!
    deliveryAddress: String!
    deliveryCity: String!
    userId: String!
    restaurantId: String!
    items: [OrderItem!]!
    createdAt: String!
  }

  type Query {
    restaurants: [Restaurant!]!
    restaurant(id: String!): Restaurant
    dishes(restaurantId: String!): [Dish!]!
    orders: [Order!]!
    order(id: String!): Order
  }
`;
