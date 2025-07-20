import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UltraLazyService } from './ultra-lazy.service';
import { LayoutShiftPrevention } from './layout-shift-prevention.service';

@Injectable({
  providedIn: 'root'
})
export class PerformanceOrchestrator {
  private isBrowser: boolean;
  private initialized = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private ultraLazy: UltraLazyService,
    private layoutShift: LayoutShiftPrevention
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initializePerformanceOptimizations();
    }
  }

  private async initializePerformanceOptimizations(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    console.log('🚀 Initializing Ultra Performance Mode...');

    // 1. Enregistrer tous les modules lazy
    this.registerLazyModules();

    // 2. Configuration intelligente basée sur l'appareil
    this.configureDeviceSpecificOptimizations();

    // 3. Précharger les ressources critiques conditionnellement
    await this.conditionalPreloading();

    // 4. Optimiser les images dynamiquement
    this.optimizeImages();

    // 5. Surveiller les Core Web Vitals
    this.monitorWebVitals();

    console.log('✅ Ultra Performance Mode activated!');
  }

  private registerLazyModules(): void {
    // Three.js avec chargement ultra-conditionnel
    this.ultraLazy.registerModule('three-core', async () => {
      const { ThreeService } = await import('../services/three.service');
      return ThreeService;
    }, 1);

    // Bootstrap components seulement si nécessaire
    this.ultraLazy.registerModule('bootstrap-interactive', async () => {
      const bootstrap = await import('bootstrap');
      return bootstrap;
    }, 3);

    // AOS (Animate On Scroll) seulement si les éléments sont présents
    this.ultraLazy.registerModule('aos', async () => {
      // Charger AOS CSS via link
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/assets/css/aos-custom.css';
      document.head.appendChild(link);
      return Promise.resolve();
    }, 5);

    // Font Awesome seulement si utilisé
    this.ultraLazy.registerModule('font-awesome', async () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/assets/fonts/font-awesome.min.css';
      document.head.appendChild(link);
      return Promise.resolve();
    }, 4);
  }

  private configureDeviceSpecificOptimizations(): void {
    const deviceInfo = this.getDeviceCapabilities();

    // Configuration pour appareils low-end
    if (deviceInfo.isLowEnd) {
      console.log('📱 Low-end device detected - Ultra conservative loading');
      
      // Désactiver Three.js complètement
      this.disableThreeJS();
      
      // Réduire la qualité des images
      this.setImageQuality('low');
      
      // Limiter les animations
      this.limitAnimations();
    }
    // Configuration pour mobile
    else if (deviceInfo.isMobile) {
      console.log('📱 Mobile device - Optimized loading');
      
      // Three.js limité
      this.ultraLazy.loadIfNeeded('three-core', {
        skipOnMobile: true,
        minMemory: 3
      });
      
      // Images responsives
      this.setImageQuality('medium');
    }
    // Configuration pour desktop
    else {
      console.log('🖥️ Desktop device - Full experience');
      
      // Préchargement agressif
      this.ultraLazy.preloadByPriority();
      
      // Qualité maximale
      this.setImageQuality('high');
    }
  }

  private async conditionalPreloading(): Promise<void> {
    // Précharger seulement sur connexions rapides
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (['slow-2g', '2g'].includes(connection?.effectiveType)) {
        console.log('🐌 Slow connection - Minimal preloading');
        return;
      }
    }

    // Précharger les ressources critiques
    const criticalResources = [
      '/assets/css/animations.css',
      '/assets/img/optimized/responsive/placeholder.webp'
    ];

    criticalResources.forEach(resource => {
      this.layoutShift.preloadResource(resource, 'style');
    });

    // Précharger Three.js seulement si des éléments canvas sont détectés
    if (document.querySelector('[data-three-scene]')) {
      await this.ultraLazy.loadIfNeeded('three-core', {
        element: '[data-three-scene]',
        minMemory: 2
      });
    }
  }

  private optimizeImages(): void {
    // Intersection Observer pour les images
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.loadOptimalImage(img);
          imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: '50px' });

    // Observer toutes les images lazy
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    // Observer les nouvelles images
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            element.querySelectorAll('img[data-src]').forEach(img => {
              imageObserver.observe(img);
            });
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private loadOptimalImage(img: HTMLImageElement): void {
    const dataSrc = img.dataset['src'];
    if (!dataSrc) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const containerWidth = img.getBoundingClientRect().width;
    const targetWidth = Math.ceil(containerWidth * devicePixelRatio);

    // Choisir la taille optimale
    const breakpoints = [320, 640, 768, 1024, 1366, 1920];
    const optimalWidth = breakpoints.find(bp => bp >= targetWidth) || 1920;

    // Choisir le format optimal
    const supportsAvif = this.supportsImageFormat('avif');
    const supportsWebp = this.supportsImageFormat('webp');
    
    let format = 'jpg';
    if (supportsAvif) format = 'avif';
    else if (supportsWebp) format = 'webp';

    // Construire l'URL optimale
    const optimizedSrc = dataSrc
      .replace(/\.(jpg|jpeg|png)$/, `-${optimalWidth}w.${format}`)
      .replace('/img/', '/img/optimized/responsive/');

    // Chargement progressif avec placeholder
    const placeholderSrc = dataSrc
      .replace(/\.(jpg|jpeg|png)$/, '-placeholder.webp')
      .replace('/img/', '/img/optimized/responsive/');

    // Charger placeholder d'abord
    img.src = placeholderSrc;
    img.classList.add('img-lazy');

    // Puis charger l'image optimale
    const optimalImg = new Image();
    optimalImg.onload = () => {
      img.src = optimizedSrc;
      img.classList.remove('img-lazy');
      img.classList.add('loaded');
      img.dataset['loaded'] = 'true';
    };
    optimalImg.src = optimizedSrc;
  }

  private supportsImageFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
    } catch {
      return false;
    }
  }

  private monitorWebVitals(): void {
    // LCP (Largest Contentful Paint)
    this.observeLCP();
    
    // FID (First Input Delay)
    this.observeFID();
    
    // CLS (Cumulative Layout Shift)
    this.observeCLS();
  }

  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`📊 LCP: ${Math.round(lastEntry.startTime)}ms`);
        
        // Envoyer métriques (optionnel)
        this.reportMetric('LCP', lastEntry.startTime);
      });
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observation not supported');
      }
    }
  }

  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const fidEntry = entry as any; // FID entries have custom properties
          const fidValue = fidEntry.processingStart ? 
            fidEntry.processingStart - fidEntry.startTime : 
            fidEntry.duration || 0;
          console.log(`📊 FID: ${Math.round(fidValue)}ms`);
          this.reportMetric('FID', fidValue);
        });
      });
      
      try {
        observer.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observation not supported');
      }
    }
  }

  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        console.log(`📊 CLS: ${clsValue.toFixed(4)}`);
        this.reportMetric('CLS', clsValue);
      });
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observation not supported');
      }
    }
  }

  private reportMetric(name: string, value: number): void {
    // Ici on pourrait envoyer les métriques à un service d'analytics
    if ('gtag' in window) {
      (window as any).gtag('event', name, {
        value: Math.round(value),
        metric_id: name.toLowerCase()
      });
    }
  }

  private getDeviceCapabilities(): any {
    const nav = navigator as any;
    const width = window.innerWidth;
    const memory = nav.deviceMemory || 4;
    
    return {
      isLowEnd: memory <= 2 || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2),
      isMobile: width < 768 || /Mobi|Android/i.test(navigator.userAgent),
      memory,
      cores: nav.hardwareConcurrency || 4
    };
  }

  private disableThreeJS(): void {
    // Masquer tous les éléments Three.js
    document.querySelectorAll('[data-three-scene]').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
  }

  private setImageQuality(quality: 'low' | 'medium' | 'high'): void {
    const qualityClass = `img-quality-${quality}`;
    document.documentElement.classList.add(qualityClass);
  }

  private limitAnimations(): void {
    // Réduire les animations sur appareils low-end
    const style = document.createElement('style');
    style.textContent = `
      * {
        animation-duration: 0.1s !important;
        animation-delay: 0s !important;
        transition-duration: 0.1s !important;
      }
    `;
    document.head.appendChild(style);
  }

  // API publique pour monitoring
  public getPerformanceMetrics(): any {
    return {
      ...this.ultraLazy.getLoadingStats(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    };
  }
}
