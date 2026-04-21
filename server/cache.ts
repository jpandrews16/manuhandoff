/**
 * Caching System for Agent Results
 * Optimizes repeated executions by caching tool results and LLM responses
 */

import crypto from "crypto";

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // Time to live in seconds
  hits: number;
}

export class AgentCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 1000;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Auto-cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key from input
   */
  private generateKey(prefix: string, input: any): string {
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   */
  get<T>(prefix: string, input: any): T | null {
    const key = this.generateKey(prefix, input);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    // Update hits
    entry.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(prefix: string, input: any, value: T, ttl: number = 3600): void {
    // Enforce max size (simple LRU: remove oldest entry)
    if (this.cache.size >= this.maxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      for (const [key, entry] of Array.from(this.cache.entries())) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const key = this.generateKey(prefix, input);
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
  }

  /**
   * Clear cache for specific prefix
   */
  clearPrefix(prefix: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    for (const [key] of Array.from(this.cache.entries())) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
        count++;
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0;
    let totalSize = 0;

    for (const entry of Array.from(this.cache.values())) {
      totalHits += entry.hits;
      totalSize += JSON.stringify(entry.value).length;
    }

    return {
      entries: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      utilization: `${((this.cache.size / this.maxSize) * 100).toFixed(2)}%`,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        keysToDelete.push(key);
        removed++;
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global cache instance
export const agentCache = new AgentCache();

// Cache prefixes
export const CACHE_PREFIXES = {
  TOOL_SEARCH: "tool:search",
  TOOL_ANALYSIS: "tool:analysis",
  TOOL_CALCULATION: "tool:calc",
  LLM_RESPONSE: "llm:response",
  PHASE_EXECUTION: "phase:exec",
  TASK_PLAN: "task:plan",
};
