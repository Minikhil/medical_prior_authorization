import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  PriorAuthorizations: a
    .model({
      employeeId: a.string(),
      patientName: a.string().required(),
      patientDateOfBirth: a.date().required(),
      status: a.enum(['PENDING', 'COMPLETED', 'SUBMITTED', 'REJECTED', 'CANCELLED']),
      cptCodes: a.json(), // Procedure codes
      icdCodes: a.json(), // Diagnosis codes
      cptCodesExplanation: a.string(),
      isOverride: a.boolean(),
      overrideExplanation: a.string(),
      medicalPlan: a.string(),
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