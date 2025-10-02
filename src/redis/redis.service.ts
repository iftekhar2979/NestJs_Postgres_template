// src/redis/redis.service.ts

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Cache } from "cache-manager";
import Redis from "ioredis";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";

@Injectable()
export class RedisService implements OnModuleInit {
  private redis: Redis;
  constructor(
    @Inject(CACHE_MANAGER) private _cacheManager: Cache, // Inject CacheManager
    @InjectLogger() private readonly _logger: Logger
  ) {}
  onModuleInit() {
    console.log("Redis Intiazed");
    // this.redis = new Redis({
    //   host: "127.0.0.1",
    //   port: 6379,
    // });

    // this.redis.monitor((err, monitor) => {
    //   if (err) {
    //     console.error("Monitor error", err);
    //     return;
    //   }
    //   console.log("Redis MONITOR mode started");
    //   monitor.on("monitor", (time, args, source, db) => {
    //     console.log(`[DB${db}] ${source}:`, args);
    //   });
    // });
  }

  // Set a value in the Redis cache
  async setCache(key: string, value: string): Promise<void> {
    await this._cacheManager.set(key, value);
  }

  // Get a value from the Redis cache
  async getCache(key: string): Promise<string | undefined> {
    return await this._cacheManager.get(key);
  }

  // Delete a key from the Redis cache
  async delCache(key: string): Promise<void> {
    await this._cacheManager.del(key);
  }
  async invalidCacheList(keys: string[]): Promise<void> {
    this._logger.log("Cache Invalided", keys);
    for (const key of keys) {
      await this._cacheManager.del(key);
    }
  }
  // Set a value with TTL (in seconds)
  async setCacheWithTTL(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this._cacheManager.set(key, value, ttlSeconds);
    this._logger.debug(`Set key "${key}" with TTL ${ttlSeconds}s`);
  }
  async exists(key: string): Promise<boolean> {
    const val = await this._cacheManager.get(key);
    return val !== undefined && val !== null;
  }

  // ⚠️ Requires direct Redis client (not available by default in cache-manager)
  async deleteByPattern(pattern: string): Promise<void> {
    const redis = (this._cacheManager as any).store.getClient();
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await redis.del(keys);
      this._logger.debug(`Invalidated keys matching pattern: ${pattern}`);
    }
  }
}
