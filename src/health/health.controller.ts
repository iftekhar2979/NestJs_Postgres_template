import { Controller, Get, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { MetricsService } from "./matrics.service";

@Controller("health")
@ApiTags("Health Check")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dbSQL: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
    private readonly metricsService: MetricsService
  ) {}

  @Get("database")
  @HealthCheck()
  @ApiOperation({
    summary: "Check Database Connection",
    description: "Performs a health check to verify the database connection is active and responsive.",
  })
  checkDatabase() {
    return this.health.check([() => this.dbSQL.pingCheck(this.configService.get<string>("DATABASE"))]);
  }

  @Get("memory")
  @HealthCheck()
  @ApiOperation({
    summary: "Check Memory Usage",
    description:
      "Performs a health check to monitor memory usage, including heap memory and RSS (Resident Set Size).",
  })
  checkMemory() {
    const memSize = 150 * 1024 * 1024; // 150MB

    return this.health.check([
      () => this.memory.checkHeap("memory_heap", memSize),
      () => this.memory.checkRSS("memory_rss", memSize),
    ]);
  }

  @Get()
  async getMetrics(@Req() req: any, @Res() res: any) {
    // Track HTTP requests in the custom Prometheus counter
    res.on("finish", () => {
      this.metricsService.incrementHttpRequests(req.method, req.originalUrl, res.statusCode.toString());
    });

    // Set the content type for Prometheus metrics
    // res.set('Content-Type', promClient.register.contentType);
    res.set("Content-Type", "text/plain; version=0.0.4");
    // Return the metrics
    return res.end(await this.metricsService.getMetrics());
  }
}
