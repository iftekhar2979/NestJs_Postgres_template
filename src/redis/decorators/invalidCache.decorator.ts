import { Inject } from "@nestjs/common";
import { RedisService } from "../redis.service";

export interface CacheInvalidateOptions {
  pattern: string | ((...args: any[]) => string);
}

export function InvalidateCache(options: CacheInvalidateOptions) {
  const injectRedisService = Inject(RedisService);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    injectRedisService(target, "redisService");

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const redisService: RedisService = this.redisService;

      // Run original method first
      const result = await originalMethod.apply(this, args);

      if (!redisService) {
        console.warn("RedisService not available for cache invalidation");
        return result;
      }

      let pattern: string;

      if (typeof options.pattern === "function") {
        pattern = options.pattern(...args);
      } else {
        pattern = options.pattern;
      }

      try {
        console.log("Invalidating cache pattern:", pattern);
        await redisService.deleteByPattern(pattern);
      } catch (error) {
        console.error("Cache invalidation failed:", error);
      }

      return result;
    };

    return descriptor;
  };
}