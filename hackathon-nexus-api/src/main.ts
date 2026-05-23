import * as dotenv from "dotenv";
import "reflect-metadata";
dotenv.config();

import cors from "cors";
import express from "express";
import { createServer } from "http";
import { RoutingControllersOptions, useExpressServer } from "routing-controllers";
import swaggerUi from "swagger-ui-express";
import { AuthController } from "./controllers/AuthController";
import { ChatController } from "./controllers/ChatController";
import { HackathonController } from "./controllers/HackathonController";
import { NotificationController } from "./controllers/NotificationController";
import { TeamController } from "./controllers/TeamController";
import { AppDataSource } from "./data-source";
import { authorizationChecker, currentUserChecker } from "./middleware/authChecker";
import { ResponseWrapInterceptor } from "./middleware/ResponseWrapInterceptor";
import { createSocketServer } from "./socket";
import { generateSwaggerSpec } from "./swagger";

const routingControllersOptions: RoutingControllersOptions = {
  routePrefix: "/api",
  controllers: [
    AuthController,
    HackathonController,
    TeamController,
    NotificationController,
    ChatController,
  ],
  authorizationChecker,
  currentUserChecker,
  interceptors: [ResponseWrapInterceptor],
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

  const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));

  useExpressServer(app, routingControllersOptions);

  const spec = generateSwaggerSpec(routingControllersOptions);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

  createSocketServer(httpServer);

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/api`);
    console.log(`Swagger docs at http://localhost:${port}/docs`);
    console.log(`WebSocket server at ws://localhost:${port}/ws`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
