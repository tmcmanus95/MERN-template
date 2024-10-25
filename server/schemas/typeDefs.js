const typeDefs = `
  type User {
    _id: ID
    email: String
    password: String
    isVerified: Boolean
    emailVerificationToken: String
    passwordResetToken: String
    passwordResetExpires: String
  }
  
  type Auth {
    token: ID
    user: User
  }

  type Query {
    users: [User]
    user(userId: ID!): User
    me: User
  }

  type Mutation {
    addUser(username: String!, email: String!, password: String!): AuthPayload
    removeUser(userId: ID!): User
    login(email: String!, password: String!): Auth
    verifyEmail(token: String!, userId: ID!): AuthPayload
    forgotPassword(email: String!): Boolean
    resendEmailVerification(email: String!): Boolean
    resetPassword(token: String!, email: String!, newPassword: String!): AuthPayload
  }
`;

module.exports = typeDefs;
