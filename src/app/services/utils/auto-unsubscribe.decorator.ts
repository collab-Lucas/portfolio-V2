import { Injectable, Directive } from '@angular/core';
import { Subscription } from 'rxjs';

/**
 * Décorateur pour automatiser le nettoyage des subscriptions
 * Utilisation : @AutoUnsubscribe() au-dessus de la classe
 */
export function AutoUnsubscribe() {
  return function (constructor: any) {
    const original = constructor.prototype.ngOnDestroy;

    constructor.prototype.ngOnDestroy = function () {
      // Parcourir toutes les propriétés de l'instance
      for (const prop in this) {
        const property = this[prop];
        
        // Si c'est une subscription, la nettoyer
        if (property && typeof property.unsubscribe === 'function') {
          property.unsubscribe();
        }
        
        // Si c'est un tableau de subscriptions, les nettoyer toutes
        if (Array.isArray(property)) {
          property.forEach((item: any) => {
            if (item && typeof item.unsubscribe === 'function') {
              item.unsubscribe();
            }
          });
        }
      }

      // Appeler la méthode ngOnDestroy originale si elle existe
      if (original && typeof original === 'function') {
        original.apply(this, arguments);
      }
    };
  };
}

/**
 * Interface pour les composants qui utilisent des subscriptions
 */
export interface Unsubscribable {
  ngOnDestroy(): void;
}

/**
 * Classe de base pour les composants avec gestion automatique des subscriptions
 */
@Directive()
export abstract class BaseComponent implements Unsubscribable {
  protected subscriptions: Subscription[] = [];

  /**
   * Ajoute une subscription à la liste de nettoyage
   */
  protected addSubscription(subscription: Subscription): void {
    this.subscriptions.push(subscription);
  }

  /**
   * Nettoie toutes les subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
  }
}

/**
 * Classe de base pour les services avec gestion automatique des ressources
 */
@Injectable()
export abstract class BaseService implements Unsubscribable {
  protected subscriptions: Subscription[] = [];
  protected eventListeners: Array<{
    element: EventTarget;
    event: string;
    listener: EventListener;
  }> = [];

  /**
   * Ajoute une subscription à la liste de nettoyage
   */
  protected addSubscription(subscription: Subscription): void {
    this.subscriptions.push(subscription);
  }

  /**
   * Ajoute un event listener à la liste de nettoyage
   */
  protected addEventListener(element: EventTarget, event: string, listener: EventListener): void {
    element.addEventListener(event, listener);
    this.eventListeners.push({ element, event, listener });
  }

  /**
   * Nettoie toutes les ressources
   */
  ngOnDestroy(): void {
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
  }
}
