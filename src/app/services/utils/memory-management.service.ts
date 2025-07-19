import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

/**
 * Service utilitaire pour la gestion centralisée de la mémoire
 * Aide à éviter les fuites mémoire en centralisant le nettoyage des ressources
 */
@Injectable({
  providedIn: 'root'
})
export class MemoryManagementService implements OnDestroy {
  private subscriptions: Subscription[] = [];
  private eventListeners: Array<{
    element: EventTarget;
    event: string;
    listener: EventListener;
  }> = [];
  private animationFrames: number[] = [];
  private intervals: number[] = [];
  private timeouts: number[] = [];

  /**
   * Ajoute une subscription à la liste de nettoyage automatique
   */
  addSubscription(subscription: Subscription): void {
    this.subscriptions.push(subscription);
  }

  /**
   * Ajoute un event listener à la liste de nettoyage automatique
   */
  addEventListener(element: EventTarget, event: string, listener: EventListener): void {
    element.addEventListener(event, listener);
    this.eventListeners.push({ element, event, listener });
  }

  /**
   * Ajoute un requestAnimationFrame à la liste de nettoyage automatique
   */
  addAnimationFrame(id: number): void {
    this.animationFrames.push(id);
  }

  /**
   * Ajoute un setInterval à la liste de nettoyage automatique
   */
  addInterval(id: number): void {
    this.intervals.push(id);
  }

  /**
   * Ajoute un setTimeout à la liste de nettoyage automatique
   */
  addTimeout(id: number): void {
    this.timeouts.push(id);
  }

  /**
   * Nettoie toutes les ressources enregistrées
   */
  dispose(): void {
    // Nettoyer les subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];

    // Nettoyer les event listeners
    this.eventListeners.forEach(({ element, event, listener }) => {
      element.removeEventListener(event, listener);
    });
    this.eventListeners = [];

    // Nettoyer les animation frames
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
    this.animationFrames = [];

    // Nettoyer les intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];

    // Nettoyer les timeouts
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts = [];
  }

  /**
   * Nettoie une subscription spécifique
   */
  removeSubscription(subscription: Subscription): void {
    const index = this.subscriptions.indexOf(subscription);
    if (index > -1) {
      this.subscriptions.splice(index, 1);
      if (!subscription.closed) {
        subscription.unsubscribe();
      }
    }
  }

  /**
   * Nettoie un event listener spécifique
   */
  removeEventListener(element: EventTarget, event: string, listener: EventListener): void {
    const index = this.eventListeners.findIndex(
      item => item.element === element && item.event === event && item.listener === listener
    );
    if (index > -1) {
      element.removeEventListener(event, listener);
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Retourne le nombre de ressources actuellement trackées
   */
  getResourceCount(): {
    subscriptions: number;
    eventListeners: number;
    animationFrames: number;
    intervals: number;
    timeouts: number;
  } {
    return {
      subscriptions: this.subscriptions.length,
      eventListeners: this.eventListeners.length,
      animationFrames: this.animationFrames.length,
      intervals: this.intervals.length,
      timeouts: this.timeouts.length
    };
  }

  ngOnDestroy(): void {
    this.dispose();
  }
}
