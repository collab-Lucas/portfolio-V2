import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BootstrapLoaderService {
  private bootstrapLoaded = false;

  async loadBootstrapJS(): Promise<void> {
    if (this.bootstrapLoaded) return;

    try {
      // Charger Bootstrap JS seulement si nécessaire
      const hasInteractiveComponents = document.querySelector('.navbar-toggler, .modal, .dropdown, .collapse');
      
      if (hasInteractiveComponents) {
        await import('bootstrap');
        this.bootstrapLoaded = true;
        console.log('Bootstrap JS loaded');
      }
    } catch (error) {
      console.error('Failed to load Bootstrap JS:', error);
    }
  }

  // Charger Bootstrap seulement pour les composants interactifs
  async loadConditionally(): Promise<void> {
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      await new Promise<void>(resolve => {
        document.addEventListener('DOMContentLoaded', () => resolve());
      });
    }

    // Vérifier si on a besoin de Bootstrap JS
    const needsBootstrap = this.checkBootstrapNeeded();
    
    if (needsBootstrap) {
      await this.loadBootstrapJS();
    }
  }

  private checkBootstrapNeeded(): boolean {
    const interactiveSelectors = [
      '.navbar-toggler',
      '.modal',
      '.dropdown',
      '.collapse',
      '.carousel',
      '.tab-pane',
      '.accordion'
    ];

    return interactiveSelectors.some(selector => 
      document.querySelector(selector) !== null
    );
  }

  // Initialiser Bootstrap sur un élément spécifique
  initializeComponent(selector: string): void {
    if (!this.bootstrapLoaded) {
      console.warn('Bootstrap JS not loaded. Call loadBootstrapJS() first.');
      return;
    }

    const element = document.querySelector(selector);
    if (element) {
      // Initialiser les composants Bootstrap selon le type
      if (element.classList.contains('dropdown-toggle')) {
        // @ts-ignore
        new bootstrap.Dropdown(element);
      } else if (element.classList.contains('modal')) {
        // @ts-ignore
        new bootstrap.Modal(element);
      } else if (element.classList.contains('collapse')) {
        // @ts-ignore
        new bootstrap.Collapse(element);
      }
    }
  }
}
