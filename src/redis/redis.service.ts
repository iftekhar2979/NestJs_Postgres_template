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
    
  }
  async get(key:string){
  
    return await this.redis.get(key)
  }
  async set(key:string,value,ttl?:number){
    return await this.redis.set(key,value)
  }
  async del(key:string){
    return await this.redis.del(key)
  }
  async exists(key:string){
    return await this.redis.exists(key)
  }
  async ttl(key:string){
    return await this.redis.ttl(key)
  }
  async hashGet(key:string,field:string){
    return await this.redis.hget(key,field)
  }
  async hashSet(key:string,field:string,value:string){
    return await this.redis.hset(key,field,value)
  }
  async hashDel(key:string,field:string){
    return await this.redis.hdel(key,field)
  }
  async hashExists(key:string,field:string){
    return await this.redis.hexists(key,field)
  }
  async hashGetAll(key:string){
    return await this.redis.hgetall(key)
  }

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
