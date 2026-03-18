// src/redis/redis.service.ts

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import Redis from "ioredis";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";

@Injectable()
export class RedisService implements OnModuleInit {
  public client: Redis;
  public publisher: Redis;
  public subscriber: Redis;

  constructor(
    @Inject(CACHE_MANAGER) private _cacheManager: Cache,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _configService: ConfigService
  ) {
    const redisConfig = {
      host: this._configService.get<string>("REDIS_HOST") || process.env.REDIS_IP || "localhost",
      port: this._configService.get<number>("REDIS_PORT") || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    };

    this.client = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
  }

  async onModuleInit() {
    this._logger.log("Initializing ioredis connections (Main, Pub, Sub)...", RedisService.name);
    
    this.client.on("connect", () => this._logger.log("Redis Main Client connected.", RedisService.name));
    this.publisher.on("connect", () => this._logger.log("Redis Publisher connected.", RedisService.name));
    this.subscriber.on("connect", () => this._logger.log("Redis Subscriber connected.", RedisService.name));

    this.client.on("error", (err) => this._logger.error("Redis Main Client error:", err));
    this.publisher.on("error", (err) => this._logger.error("Redis Publisher error:", err));
    this.subscriber.on("error", (err) => this._logger.error("Redis Subscriber error:", err));
  }

  async onModuleDestroy() {
    this._logger.info("Gracefully shutting down Redis connections...");
    await Promise.all([
      this.client.quit(),
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: any): Promise<number> {
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    return this.publisher.publish(channel, payload);
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (chan, message) => {
      if (chan === channel) {
        callback(message);
      }
    });
  }
  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to store (will be JSON stringified if not a string)
   * @param ttl Time to live in seconds
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    if (ttl) {
      await this.client.set(key, stringValue, "EX", ttl);
    } else {
      await this.client.set(key, stringValue);
    }
  }

  async deleteByPatterns(pattern: string) {
  const stream = this.client.scanStream({
    match: pattern,
    count: 100,
  });

  const pipeline = this.client.pipeline();

  return new Promise((resolve, reject) => {
    stream.on("data", (keys: string[]) => {
      if (keys.length) {
        keys.forEach((key) => pipeline.del(key));
      }
    });

    stream.on("end", async () => {
      await pipeline.exec();
      resolve(true);
    });

    stream.on("error", (err) => reject(err));
  });
}

  /**
   * Get a value from cache
   * @param key Cache key
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    console.log("Value",value,key)
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * Delete a key from cache
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    await this._cacheManager.del(key);
  }
  async exists(key:string){
    return await this.client.exists(key)
  }
  async ttl(key:string){
    return await this.client.ttl(key)
  }
  async hashGet(key:string,field:string){
    return await this.client.hget(key,field)
  }
  async hashSet(key:string,field:string,value:string){
    return await this.client.hset(key,field,value)
  }
  async hashDel(key:string,field:string){
    return await this.client.hdel(key,field)
  }
  async hashExists(key:string,field:string){
    return await this.client.hexists(key,field)
  }
  async hashGetAll(key:string){
    return await this.client.hgetall(key)
  }

  async setCache(key: string, value: string): Promise<void> {
    await this._cacheManager.set(key, value);
  }

  // Get a value from the Redis cache
  async getCache(key: string): Promise<string | undefined> {
    return await this.client.get(key);
  }

  // Delete a key from the Redis cache
  async delCache(key: string): Promise<void> {
    await this.client.del(key);
  }
  async invalidCacheList(keys: string[]): Promise<void> {
    this._logger.log("Cache Invalided", keys);
    for (const key of keys) {
      await this.client.del(key);
    }
  }
  // Set a value with TTL (in seconds)
  async setCacheWithTTL(key: string, value: unknown, ttlSeconds: number): Promise<void> {
try{
  await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    this._logger.debug(`Set key "${key}" with TTL ${ttlSeconds}s`);
  
}catch(error){
  console.log(error)
}
  }
 
  // ⚠️ Safe pattern-based deletion using SCAN
  async deleteByPattern(pattern: string): Promise<void> {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== "0");
    this._logger.debug(`Invalidated keys matching pattern: ${pattern}`);
  }

  /**
   * Global Online Status Helpers
   */
  private readonly ONLINE_USERS_KEY = "online_users";

  async setUserOnline(userId: string): Promise<void> {
    await this.client.hset(this.ONLINE_USERS_KEY, userId, Date.now().toString());
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.client.hdel(this.ONLINE_USERS_KEY, userId);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const exists = await this.client.hexists(this.ONLINE_USERS_KEY, userId);
    return exists === 1;
  }
}
