import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

// Define the schema for the CodenamesGames table
// const schema = a.schema({
//   GameSessions: a
//     .model({
//       GameID: a.string().required(), // Partition Key
//       CurrentTeam: a.string().required(), // Current team (red or blue)
//       RedCardsLeft: a.integer().required(), // Number of red cards left
//       BlueCardsLeft: a.integer().required(), // Number of blue cards left
//       TotalCardsLeft: a.integer().required(), // Number of total cards left
//       Categories: a.json().required(),  // Using JSON to represent the list of categories
//       Cards: a.json().required(),       // Using JSON to represent the list of card objects
//     })
//     .authorization((allow) => [
//       allow.publicApiKey(), // Allow API key-based access
//     ]),
// });

// // Export the schema type
// export type GameSessionsSchema = ClientSchema<typeof schema>;

// // Define and export the Amplify data configuration
// export const gameSessionsdata = defineData({
//   schema,
//   authorizationModes: {
//     defaultAuthorizationMode: "apiKey",
//     apiKeyAuthorizationMode: {
//       expiresInDays: 365, // API key expires after 1 year
//     },
//   },
// });

const schema = a.schema({
  Order: a
    .model({
      customerName: a.string().required(),
      customerEmail: a.string().required(),
      customerId: a.string().required(),
      totalAmount: a.float(),
      sku: a.string().required(), // Part SKU
      status: a.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']),
      shippingAddress: a.json().required(), // Shipping address details
      paymentDetails: a.json(), // Payment method and transaction details
    })
    .authorization((allow) => [
      allow.publicApiKey(), // Allow API key-based access
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});