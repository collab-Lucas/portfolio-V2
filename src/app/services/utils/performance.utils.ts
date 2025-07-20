import { Injectable } from '@angular/core';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceUtils {
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    fps: 0
  };

  private frameCount = 0;
  private lastTime = 0;
  private isMonitoring = false;

  startPerformanceMonitoring(): void {
    this.isMonitoring = true;
    this.trackFPS();
    this.trackMemoryUsage();
  }

  stopPerformanceMonitoring(): void {
    this.isMonitoring = false;
  }

  measureLoadTime(startTime: number): number {
    const loadTime = performance.now() - startTime;
    this.metrics.loadTime = loadTime;
    return loadTime;
  }

  measureRenderTime(callback: () => void): number {
    const startTime = performance.now();
    callback();
    const renderTime = performance.now() - startTime;
    this.metrics.renderTime = renderTime;
    return renderTime;
  }

  private trackFPS(): void {
    if (!this.isMonitoring) return;

    const animate = (currentTime: number) => {
      if (this.lastTime === 0) {
        this.lastTime = currentTime;
      }

      this.frameCount++;
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime >= 1000) {
        this.metrics.fps = (this.frameCount * 1000) / deltaTime;
        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      if (this.isMonitoring) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private trackMemoryUsage(): void {
    if (!this.isMonitoring) return;

    setInterval(() => {
      if (!this.isMonitoring) return;
      
      // @ts-ignore
      if (performance.memory) {
        // @ts-ignore
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
      }
    }, 5000);
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  logMetrics(): void {
    console.group('🚀 Performance Metrics');
    console.log('Load Time:', this.metrics.loadTime.toFixed(2), 'ms');
    console.log('Render Time:', this.metrics.renderTime.toFixed(2), 'ms');
    console.log('Memory Usage:', this.metrics.memoryUsage.toFixed(2), 'MB');
    console.log('FPS:', this.metrics.fps.toFixed(1));
    console.groupEnd();
  }

  // Optimisation automatique
  optimizeBasedOnMetrics(): void {
    const metrics = this.getMetrics();
    
    if (metrics.fps < 30) {
      console.warn('⚠️ Low FPS detected. Consider reducing visual effects.');
    }
    
    if (metrics.memoryUsage > 100) {
      console.warn('⚠️ High memory usage detected. Consider lazy loading.');
    }
    
    if (metrics.loadTime > 3000) {
      console.warn('⚠️ Slow load time detected. Consider code splitting.');
    }
  }

  // Debounce utility
  debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
    let timeoutId: any;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    }) as T;
  }

  // Throttle utility
  throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
    let lastCall = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    }) as T;
  }
}
