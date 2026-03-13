import { Inject } from '@nestjs/common';
import { RedisService } from '../redis.service';

export interface CacheOptions {
  key?: string | ((...args: any[]) => string);
  ttl?: number; // in seconds
}

/**
 * Decorator to cache method results in Redis.
 * Only applied to methods that return a Promise.
 */
export function Cacheable(options: CacheOptions = {}) {
  const injectRedisService = Inject(RedisService);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Inject RedisService into the class if not already present
    injectRedisService(target, 'redisService');

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const redisService: RedisService = this.redisService;
      
      if (!redisService) {
        console.warn(`RedisService not found on ${target.constructor.name}. Make sure it is injected.`);
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      let cacheKey: string;
      if (typeof options.key === 'function') {
        cacheKey = options.key(...args);
      } else if (typeof options.key === 'string') {
        cacheKey = options.key;
      } else {
        // Default key: className:methodName:JSON.stringify(args)
        cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      }
console.log("Cache Key",cacheKey)
      // Try to get from cache
      try {
        const cachedValue = await redisService.get(cacheKey);
    console.log("Cache Values",cachedValue)
        if (cachedValue !== null) {
          return cachedValue;
        }
      } catch (error) {
        console.error(`Cache get error for key ${cacheKey}:`, error);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
console.log("Result",result)
      // Store in cache
      try {
        await redisService.setCacheWithTTL(cacheKey, result, options.ttl);
      } catch (error) {
        console.error(`Cache set error for key ${cacheKey}:`, error);
      }

      return result;
    };

    return descriptor;
  };
}
