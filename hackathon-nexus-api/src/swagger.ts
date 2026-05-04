import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { getMetadataArgsStorage, RoutingControllersOptions } from "routing-controllers";
import { routingControllersToSpec } from "routing-controllers-openapi";

export function generateSwaggerSpec(options: RoutingControllersOptions) {
  const storage = getMetadataArgsStorage();
  const schemas = validationMetadatasToSchemas({
    refPointerPrefix: "#/components/schemas/",
  });

  return routingControllersToSpec(storage, options, {
    info: {
      title: "Hackathon Nexus API",
      version: "1.0.0",
      description: "JWT-based authentication API for the Hackathon Nexus platform",
    },
    components: {
      schemas: {
        ...schemas,
        RegisterDto: {
          type: "object",
          required: ["firstName", "lastName", "email", "password"],
          properties: {
            firstName: { type: "string", example: "John" },
            lastName: { type: "string", example: "Doe" },
            email: { type: "string", format: "email", example: "john.doe@example.com" },
            password: { type: "string", minLength: 8, example: "secret123" },
          },
        },
        LoginDto: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "john.doe@example.com" },
            password: { type: "string", example: "secret123" },
          },
        },
        UserDto: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string", format: "email" },
            isAdmin: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            user: { $ref: "#/components/schemas/UserDto" },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  });
}
