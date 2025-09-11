import { Controller, Get, Render, Req } from "@nestjs/common";
import { AppService } from "./app.service";
import { Request } from "express";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from 'bull';
import process from "process";
import os from 'node:os'
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectQueue('myQueue') private readonly myQueue: Queue,
  ) {}

   @Get("")
  async get(@Req() req: Request) {
    console.trace("call stack")
    return { msg:"Hello world"};
  }

  @Get("csrf-token")
  @ApiTags("CSRF")
  @ApiOperation({
    description: "Generate CSRF Token",
    summary: "Generate CSRF Token to be used in Frontend Forms",
  })
  @ApiOkResponse({
    description: "Generate CSRF Token",
    example: {
      csrfToken: "MHP1Skkd-QJhgDlYvqFda4RIgocjDd4_gh3U",
    },
  })
  async getCSRFToken(@Req() req: Request) {
    return { csrfToken: req.csrfToken?.() };
  }
  @Get('system-info')
  @Render('system-info') // This renders 'views/system-info.ejs'
  getSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

    const cpuInfo = os.cpus();
    const avgLoad = os.loadavg();

    const cpuPercentages = cpuInfo.map((cpu, index) => {
      const times = cpu.times;
      const total = Object.values(times).reduce((acc, tv) => acc + tv, 0);
      const idle = times.idle;
      const usagePercent = (((total - idle) / total) * 100).toFixed(2);

      return {
        core: index,
        model: cpu.model,
        speedMHz: cpu.speed,
        usagePercent,
      };
    });

    const uptimeInSeconds = os.uptime();
    const uptimeDays = Math.floor(uptimeInSeconds / (24 * 60 * 60));
    const uptimeHours = Math.floor((uptimeInSeconds % (24 * 60 * 60)) / 3600);

    return {
      hostname: os.hostname(),
      uptime: {
      days: uptimeDays,
      hours: uptimeHours,
      raw: uptimeInSeconds
      },
      loadAverage: avgLoad,
      memory: {
      totalMB: (totalMem / (1024 * 1024)).toFixed(2),
      usedMB: (usedMem / (1024 * 1024)).toFixed(2),
      freeMB: (freeMem / (1024 * 1024)).toFixed(2),
      usagePercent: memoryUsagePercent,
      },
      networkInterfaces: os.networkInterfaces(),
      cpu: {
      cores: cpuInfo.length,
      details: cpuPercentages,
      },
    };
  }


    @Get('add-job')
  async addJob() {
    const job = await this.myQueue.add('job', { // 'job' is the job name
      message: 'This is the job data',  // Job data that you want to send to the processor
    });
    return `Job with ID ${job.id} has been added to the queue.`;
  }
}
