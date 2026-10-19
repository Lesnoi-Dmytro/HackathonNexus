import { Get, JsonController } from "routing-controllers";

@JsonController("/health")
export class HealthController {
  @Get("/")
  check(): { status: string; uptime: number; timestamp: string } {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
