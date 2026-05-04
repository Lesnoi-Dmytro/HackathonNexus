import * as dotenv from "dotenv";
import "reflect-metadata";
dotenv.config();

import cors from "cors";
import express from "express";
import { createServer } from "http";
import { RoutingControllersOptions, useExpressServer } from "routing-controllers";
import swaggerUi from "swagger-ui-express";
import { AuthController } from "./controllers/AuthController";
import { HackathonController } from "./controllers/HackathonController";
import { NotificationController } from "./controllers/NotificationController";
import { TeamController } from "./controllers/TeamController";
import { AppDataSource } from "./data-source";
import { authorizationChecker, currentUserChecker } from "./middleware/authChecker";
import { createSocketServer } from "./socket";
import { generateSwaggerSpec } from "./swagger";

const routingControllersOptions: RoutingControllersOptions = {
  routePrefix: "/api",
  controllers: [AuthController, HackathonController, TeamController, NotificationController],
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
  const httpServer = createServer(app);

  const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  useExpressServer(app, routingControllersOptions);

  const spec = generateSwaggerSpec(routingControllersOptions);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

  createSocketServer(httpServer);

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Swagger docs at http://localhost:${port}/docs`);
    console.log(`WebSocket server at ws://localhost:${port}/ws`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
