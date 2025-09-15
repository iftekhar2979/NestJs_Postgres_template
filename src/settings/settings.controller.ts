// src/settings/settings.controller.ts
import { Controller, Get, Param, Put, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Get(':key')
  getByKey(@Param('key') key: string) {
    return this.settingsService.getSettingByKey(key);
  }

  @Put(':key')
  updateSetting(
    @Param('key') key: string,
    @Body('content') content: string,
  ) {
    return this.settingsService.updateSetting(key, content);
  }
}
