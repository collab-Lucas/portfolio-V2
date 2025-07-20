import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OptimizedThreeService {
  private threeModule: any = null;
  private isLoading = false;
  private loadPromise: Promise<any> | null = null;

  async loadThreeJS(): Promise<any> {
    // Si déjà chargé, retourner le module
    if (this.threeModule) {
      return this.threeModule;
    }

    // Si en cours de chargement, attendre
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Détecter si on a besoin de Three.js
    if (!this.shouldLoadThreeJS()) {
      console.log('Three.js loading skipped (mobile/low-performance device)');
      return null;
    }

    this.isLoading = true;
    
    this.loadPromise = this.performThreeJSLoad();
    
    try {
      this.threeModule = await this.loadPromise;
      return this.threeModule;
    } finally {
      this.isLoading = false;
    }
  }

  private shouldLoadThreeJS(): boolean {
    // Conditions pour charger Three.js
    const isMobile = window.innerWidth < 768;
    const isLowPerformance = navigator.hardwareConcurrency < 4;
    const isSlowConnection = (navigator as any).connection?.effectiveType === 'slow-2g' || 
                            (navigator as any).connection?.effectiveType === '2g';
    
    // Ne pas charger sur mobile ou connexions lentes
    if (isMobile || isLowPerformance || isSlowConnection) {
      return false;
    }

    return true;
  }

  private async performThreeJSLoad(): Promise<any> {
    console.log('Loading Three.js modules...');
    
    try {
      // Chargement en parallèle des modules essentiels seulement
      const [THREE, GLTFLoader] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js')
      ]);

      console.log('Three.js modules loaded successfully');
      
      return {
        THREE: THREE,
        GLTFLoader: GLTFLoader.GLTFLoader
      };
    } catch (error) {
      console.error('Failed to load Three.js:', error);
      return null;
    }
  }

  // Méthode pour précharger si nécessaire
  preloadThreeJS(): void {
    if (this.shouldLoadThreeJS() && !this.threeModule && !this.isLoading) {
      // Préchargement en arrière-plan après 2 secondes
      setTimeout(() => {
        this.loadThreeJS();
      }, 2000);
    }
  }

  // Nettoyage des ressources
  dispose(): void {
    if (this.threeModule) {
      // Nettoyer les ressources Three.js si nécessaire
      this.threeModule = null;
    }
    this.loadPromise = null;
    this.isLoading = false;
  }
}
