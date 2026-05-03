import * as dotenv from "dotenv";
import "reflect-metadata";
dotenv.config();

import express from "express";
import { RoutingControllersOptions, useExpressServer } from "routing-controllers";
import swaggerUi from "swagger-ui-express";
import { AuthController } from "./controllers/AuthController";
import { AppDataSource } from "./data-source";
import { authorizationChecker, currentUserChecker } from "./middleware/authChecker";
import { generateSwaggerSpec } from "./swagger";

const routingControllersOptions: RoutingControllersOptions = {
  routePrefix: "/api",
  controllers: [AuthController],
  authorizationChecker,
  currentUserChecker,
  validation: true,
  classTransformer: true,
  defaultErrorHandler: true,
};

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  console.log("Database connected");

  const app = express();

  useExpressServer(app, routingControllersOptions);

  const spec = generateSwaggerSpec(routingControllersOptions);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Swagger docs at http://localhost:${port}/docs`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
