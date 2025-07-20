import { Injectable } from '@angular/core';

interface ModuleCache {
  [key: string]: Promise<any>;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleLoaderService {
  private moduleCache: ModuleCache = {};
  private retryCount = 0;
  private maxRetries = 3;

  async loadModule<T>(moduleName: string, importFn: () => Promise<T>): Promise<T> {
    if (this.moduleCache[moduleName]) {
      return await this.moduleCache[moduleName];
    }

    this.moduleCache[moduleName] = this.loadWithRetry(importFn);
    return await this.moduleCache[moduleName];
  }

  private async loadWithRetry<T>(importFn: () => Promise<T>): Promise<T> {
    try {
      return await importFn();
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        await this.delay(1000 * this.retryCount);
        return this.loadWithRetry(importFn);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache(): void {
    this.moduleCache = {};
    this.retryCount = 0;
  }

  getCacheSize(): number {
    return Object.keys(this.moduleCache).length;
  }
}
