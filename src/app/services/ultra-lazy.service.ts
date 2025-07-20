import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface LazyModule {
  load: () => Promise<any>;
  loaded: boolean;
  loading: boolean;
  priority: number;
}

@Injectable({
  providedIn: 'root'
})
export class UltraLazyService {
  private modules = new Map<string, LazyModule>();
  private loadQueue: string[] = [];
  private maxConcurrent = 2;
  private currentLoading = 0;
  private isBrowser: boolean;
  private deviceCapabilities: {
    isLowEnd: boolean;
    isMobile: boolean;
    connectionSpeed: string;
    memoryGB: number;
  };

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.deviceCapabilities = this.analyzeDevice();
    
    if (this.isBrowser) {
      this.setupIntersectionObserver();
      this.setupIdleCallback();
    }
  }

  private analyzeDevice() {
    if (!this.isBrowser) {
      return { isLowEnd: false, isMobile: false, connectionSpeed: 'fast', memoryGB: 8 };
    }

    const nav = navigator as any;
    const width = window.innerWidth;
    const memory = nav.deviceMemory || 4;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    return {
      isLowEnd: memory <= 2 || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2),
      isMobile: width < 768 || /Mobi|Android/i.test(navigator.userAgent),
      connectionSpeed: connection?.effectiveType || 'unknown',
      memoryGB: memory
    };
  }

  // Enregistrer un module avec priorité
  registerModule(name: string, loader: () => Promise<any>, priority: number = 5): void {
    this.modules.set(name, {
      load: loader,
      loaded: false,
      loading: false,
      priority
    });
  }

  // Chargement conditionnel intelligent
  async loadIfNeeded(moduleName: string, conditions?: {
    element?: string;
    minWidth?: number;
    maxWidth?: number;
    minMemory?: number;
    skipOnMobile?: boolean;
    skipOnSlowConnection?: boolean;
  }): Promise<any> {
    const module = this.modules.get(moduleName);
    if (!module || module.loaded) {
      return module?.loaded ? Promise.resolve() : Promise.reject(`Module ${moduleName} not found`);
    }

    // Vérifications conditionnelles
    if (conditions) {
      if (conditions.skipOnMobile && this.deviceCapabilities.isMobile) {
        console.log(`🚫 Skipping ${moduleName} on mobile`);
        return Promise.resolve();
      }

      if (conditions.skipOnSlowConnection && 
          ['slow-2g', '2g'].includes(this.deviceCapabilities.connectionSpeed)) {
        console.log(`🚫 Skipping ${moduleName} on slow connection`);
        return Promise.resolve();
      }

      if (conditions.minMemory && this.deviceCapabilities.memoryGB < conditions.minMemory) {
        console.log(`🚫 Skipping ${moduleName} - insufficient memory`);
        return Promise.resolve();
      }

      if (conditions.minWidth && window.innerWidth < conditions.minWidth) {
        console.log(`🚫 Skipping ${moduleName} - screen too small`);
        return Promise.resolve();
      }

      if (conditions.maxWidth && window.innerWidth > conditions.maxWidth) {
        console.log(`🚫 Skipping ${moduleName} - screen too large`);
        return Promise.resolve();
      }

      // Vérification de présence d'élément
      if (conditions.element && !document.querySelector(conditions.element)) {
        console.log(`🚫 Skipping ${moduleName} - element ${conditions.element} not found`);
        return Promise.resolve();
      }
    }

    return this.loadModule(moduleName);
  }

  private async loadModule(name: string): Promise<any> {
    const module = this.modules.get(name);
    if (!module || module.loaded || module.loading) {
      return Promise.resolve();
    }

    module.loading = true;
    console.log(`⏳ Loading module: ${name}`);

    try {
      const startTime = performance.now();
      await module.load();
      module.loaded = true;
      module.loading = false;
      
      const loadTime = Math.round(performance.now() - startTime);
      console.log(`✅ Module ${name} loaded in ${loadTime}ms`);
      
      // Métrique de performance
      this.trackLoadTime(name, loadTime);
      
      return Promise.resolve();
    } catch (error) {
      module.loading = false;
      console.error(`❌ Failed to load module ${name}:`, error);
      return Promise.reject(error);
    }
  }

  // Chargement avec observer d'intersection
  loadOnVisible(moduleName: string, selector: string): void {
    if (!this.isBrowser) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadModule(moduleName);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '50px' });

    const element = document.querySelector(selector);
    if (element) {
      observer.observe(element);
    }
  }

  // Préchargement intelligent pendant les temps morts
  private setupIdleCallback(): void {
    if ('requestIdleCallback' in window) {
      const idleCallback = (deadline: IdleDeadline) => {
        while (deadline.timeRemaining() > 10 && this.loadQueue.length > 0) {
          const moduleName = this.loadQueue.shift()!;
          this.loadModule(moduleName);
        }

        if (this.loadQueue.length > 0) {
          requestIdleCallback(idleCallback);
        }
      };

      requestIdleCallback(idleCallback);
    }
  }

  // Préchargement par priorité
  preloadByPriority(): void {
    const sortedModules = Array.from(this.modules.entries())
      .filter(([_, module]) => !module.loaded && !module.loading)
      .sort(([, a], [, b]) => a.priority - b.priority);

    sortedModules.slice(0, 3).forEach(([name, _]) => {
      if (!this.deviceCapabilities.isLowEnd) {
        this.loadQueue.push(name);
      }
    });
  }

  // Chargement sur interaction utilisateur
  loadOnUserInteraction(moduleName: string, events: string[] = ['click', 'scroll', 'keydown']): void {
    if (!this.isBrowser) return;

    const loadHandler = () => {
      this.loadModule(moduleName);
      events.forEach(event => {
        document.removeEventListener(event, loadHandler);
      });
    };

    events.forEach(event => {
      document.addEventListener(event, loadHandler, { once: true, passive: true });
    });
  }

  private setupIntersectionObserver(): void {
    // Observer global pour détecter les éléments Three.js
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          if (element.dataset['threeScene']) {
            this.loadIfNeeded('three-core', {
              skipOnMobile: true,
              minMemory: 2,
              skipOnSlowConnection: true
            });
          }
        }
      });
    }, { rootMargin: '100px' });

    // Observer les éléments avec attribut data-three-scene
    setTimeout(() => {
      document.querySelectorAll('[data-three-scene]').forEach(el => {
        observer.observe(el);
      });
    }, 1000);
  }

  private trackLoadTime(moduleName: string, time: number): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`module-${moduleName}-loaded`);
      performance.measure(`module-${moduleName}-load-time`, 
        `module-${moduleName}-start`, 
        `module-${moduleName}-loaded`);
    }
  }

  // Nettoyage des modules non utilisés
  unloadUnusedModules(): void {
    this.modules.forEach((module, name) => {
      if (module.loaded && !this.isModuleInUse(name)) {
        // Marquer pour déchargement futur
        console.log(`🗑️ Module ${name} marked for cleanup`);
      }
    });
  }

  private isModuleInUse(moduleName: string): boolean {
    // Logique de détection d'utilisation
    switch (moduleName) {
      case 'three-core':
        return document.querySelector('canvas') !== null;
      case 'bootstrap-components':
        return document.querySelector('.modal, .dropdown, .collapse') !== null;
      default:
        return true;
    }
  }

  // Métriques de performance
  getLoadingStats(): any {
    const stats = {
      totalModules: this.modules.size,
      loadedModules: 0,
      loadingModules: 0,
      queuedModules: this.loadQueue.length,
      deviceInfo: this.deviceCapabilities
    };

    this.modules.forEach(module => {
      if (module.loaded) stats.loadedModules++;
      if (module.loading) stats.loadingModules++;
    });

    return stats;
  }
}
