import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class LayoutShiftPrevention {
  private isBrowser: boolean;
  private observer: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private preloadQueue: string[] = [];

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initializePreventionMeasures();
    }
  }

  private initializePreventionMeasures(): void {
    // 1. Prévenir les shifts des images
    this.preventImageShifts();
    
    // 2. Stabiliser les fonts
    this.optimizeFontLoading();
    
    // 3. Précharger les ressources critiques
    this.preloadCriticalResources();
    
    // 4. Observer les changements DOM
    this.setupMutationObserver();
  }

  private preventImageShifts(): void {
    // CSS automatique pour toutes les images
    const style = document.createElement('style');
    style.textContent = `
      /* Prévention automatique des layout shifts */
      img:not([width]):not([height]):not([style*="aspect-ratio"]):not([style*="height"]) {
        aspect-ratio: 16/9;
        object-fit: cover;
        background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%),
                    linear-gradient(45deg, #f8f9fa 25%, #e9ecef 25%, #e9ecef 75%, #f8f9fa 75%);
        background-size: 20px 20px;
        background-position: 0 0, 10px 10px;
      }

      /* Containers d'images avec dimensions fixes */
      .img-container {
        position: relative;
        overflow: hidden;
        background: #f8f9fa;
      }

      .img-container::before {
        content: '';
        display: block;
        width: 100%;
        height: 0;
        padding-bottom: 56.25%; /* 16:9 par défaut */
      }

      .img-container img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Skeleton loaders */
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
      }

      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Prévention shifts pour le contenu dynamique */
      [data-dynamic-content] {
        min-height: 100px;
        transition: all 0.3s ease;
      }

      /* Stabilisation des dimensions de Three.js canvas */
      canvas {
        display: block;
        max-width: 100%;
        height: auto;
        aspect-ratio: 16/9;
      }

      /* Prévention shifts pour Bootstrap components */
      .modal, .dropdown-menu, .tooltip, .popover {
        contain: layout style;
      }
    `;
    document.head.appendChild(style);

    // Observer les nouvelles images
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.stabilizeImage(img);
        }
      });
    }, { rootMargin: '50px' });

    // Observer les images existantes
    document.querySelectorAll('img').forEach(img => {
      this.observer?.observe(img);
    });
  }

  private stabilizeImage(img: HTMLImageElement): void {
    // Si l'image n'a pas de dimensions définies
    if (!img.width && !img.height && !img.style.aspectRatio) {
      // Calculer les dimensions basées sur le container parent
      const rect = img.getBoundingClientRect();
      if (rect.width > 0) {
        img.style.aspectRatio = '16/9';
        img.style.width = '100%';
        img.style.height = 'auto';
      }
    }

    // Ajouter un placeholder pendant le chargement
    if (!img.complete) {
      img.style.backgroundColor = '#f8f9fa';
      img.style.backgroundImage = `
        linear-gradient(45deg, #f8f9fa 25%, transparent 25%), 
        linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #f8f9fa 75%), 
        linear-gradient(-45deg, transparent 75%, #f8f9fa 75%)
      `;
      img.style.backgroundSize = '20px 20px';
      img.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';

      img.onload = () => {
        img.style.backgroundColor = '';
        img.style.backgroundImage = '';
      };
    }
  }

  private optimizeFontLoading(): void {
    // Preload des fonts critiques
    const criticalFonts = [
      '/assets/fonts/fontawesome-webfont.woff2'
    ];

    criticalFonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // CSS pour stabiliser le texte pendant le chargement
    const fontStyle = document.createElement('style');
    fontStyle.textContent = `
      /* Prévention du FOUT (Flash of Unstyled Text) */
      @font-face {
        font-family: 'FontAwesome';
        src: url('/assets/fonts/fontawesome-webfont.woff2') format('woff2');
        font-display: swap;
        font-weight: normal;
        font-style: normal;
      }

      /* Fallback system fonts pour éviter les shifts */
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                     'Helvetica Neue', Arial, sans-serif;
      }

      /* Stabilisation des icônes */
      .fa, .fas, .far, .fab {
        width: 1em;
        height: 1em;
        display: inline-block;
        vertical-align: -0.125em;
      }
    `;
    document.head.appendChild(fontStyle);
  }

  private preloadCriticalResources(): void {
    const criticalResources = [
      { href: '/assets/css/animations.css', as: 'style' },
      { href: '/assets/bootstrap/css/bootstrap.min.css', as: 'style' },
      { href: '/favicon.ico', as: 'image' }
    ];

    // Précharger en fonction de la bande passante
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
        // Réduire le préchargement sur connexions lentes
        return;
      }
    }

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.as === 'style') {
        link.onload = () => {
          const styleLink = document.createElement('link');
          styleLink.rel = 'stylesheet';
          styleLink.href = resource.href;
          document.head.appendChild(styleLink);
        };
      }
      document.head.appendChild(link);
    });
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Nouvelles images
              if (element.tagName === 'IMG') {
                this.observer?.observe(element);
                this.stabilizeImage(element as HTMLImageElement);
              }
              
              // Images dans les nouveaux éléments
              element.querySelectorAll('img').forEach(img => {
                this.observer?.observe(img);
                this.stabilizeImage(img);
              });
            }
          });
        }
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Méthode publique pour stabiliser manuellement un élément
  stabilizeElement(element: HTMLElement, dimensions?: { width?: string; height?: string; aspectRatio?: string }): void {
    if (!this.isBrowser) return;

    if (dimensions) {
      if (dimensions.width) element.style.width = dimensions.width;
      if (dimensions.height) element.style.height = dimensions.height;
      if (dimensions.aspectRatio) element.style.aspectRatio = dimensions.aspectRatio;
    }

    // Ajouter contain pour optimiser le rendu
    element.style.contain = 'layout style';
  }

  // Précharger des ressources additionnelles
  preloadResource(url: string, type: 'script' | 'style' | 'image' | 'font'): void {
    if (!this.isBrowser) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    
    if (type === 'font') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }

  // Nettoyage
  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.mutationObserver?.disconnect();
  }
}
