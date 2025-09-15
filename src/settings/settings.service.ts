// src/settings/settings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entity/settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepo: Repository<Setting>,
  ) {}

  async getSettingByKey(key: string): Promise<Setting> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`);
    return setting;
  }

  async updateSetting(key: string, content: string): Promise<Setting> {
    let setting = await this.settingsRepo.findOne({ where: { key } });

    if (!setting) {
      setting = this.settingsRepo.create({ key, content });
    } else {
      setting.content = content;
    }

    return this.settingsRepo.save(setting);
  }

  async getAll(): Promise<Setting[]> {
    return this.settingsRepo.find();
  }
}
