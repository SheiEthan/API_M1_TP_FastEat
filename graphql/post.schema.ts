//completer avec le schema GraphQL pour les posts
export const postSchema = `
  type Post {
    id: String!
    title: String!
    content: String!
  }

  type Query {
    posts: [Post!]!
    post(id: String!): Post
  }

  type Mutation {
    createPost(title: String!, content: String!): Post!
    deletePost(id: String!): Boolean!
  }
`;
