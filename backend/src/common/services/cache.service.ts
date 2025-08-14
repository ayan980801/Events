import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Simple in-memory cache fallback when Redis is not available
class MemoryCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  set(key: string, value: any, ttl: number): void {
    const expiry = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  exists(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  increment(key: string, increment: number = 1): number {
    const current = this.get(key) || 0;
    const newValue = current + increment;
    this.set(key, newValue, 3600); // Default 1 hour TTL for increments
    return newValue;
  }
}

@Injectable()
export class CacheService {
  private memoryCache: MemoryCache;

  constructor(private configService: ConfigService) {
    // For now, use in-memory cache as Redis is not installed
    this.memoryCache = new MemoryCache();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = this.memoryCache.get(key);
      return value || null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      this.memoryCache.set(key, value, ttl);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      this.memoryCache.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async clear(pattern?: string): Promise<boolean> {
    try {
      // For memory cache, clear all (patterns not supported in this simple implementation)
      this.memoryCache.clear();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return this.memoryCache.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string, increment: number = 1): Promise<number> {
    try {
      return this.memoryCache.increment(key, increment);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      if (keys.length === 0) {
        return {};
      }

      const result: Record<string, T | null> = {};
      keys.forEach((key) => {
        result[key] = this.memoryCache.get(key) || null;
      });

      return result;
    } catch (error) {
      console.error('Cache getMultiple error:', error);
      return {};
    }
  }

  async setMultiple(data: Record<string, any>, ttl: number = 3600): Promise<boolean> {
    try {
      Object.entries(data).forEach(([key, value]) => {
        this.memoryCache.set(key, value, ttl);
      });

      return true;
    } catch (error) {
      console.error('Cache setMultiple error:', error);
      return false;
    }
  }
}