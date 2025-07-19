import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as THREE from 'three';

import { NavbarThreeService } from '../features/three/navbar-three.service';
import { BackgroundThreeService } from '../features/three/background-three.service';
import { LightService, SimpleLight } from '../features/three/light.service';

/**
 * Service principal Three.js qui sert de façade pour orchestrer les différents services spécialisés
 */
@Injectable({
  providedIn: 'root'
})
export class ThreeService {
  private activeTab: 'navbar' | 'background' = 'navbar';
  private navbarRetracted = false;

  constructor(
    private navbarService: NavbarThreeService,
    private backgroundService: BackgroundThreeService,
    private lightService: LightService
  ) {}

  /**
   * Initialise la scène de la navbar
   */
  initNavbar(canvas: HTMLCanvasElement, initialLightValues?: { [lightName: string]: number }) {
    this.navbarService.initNavbar(canvas, initialLightValues);
  }

  /**
   * Initialise la scène d'arrière-plan
   */
  initBackground(canvas: HTMLCanvasElement) {
    this.backgroundService.init(canvas);
  }

  /**
   * Définit la scène active pour les contrôles
   */
  setActiveTab(tab: 'navbar' | 'background'): void {
    this.activeTab = tab;
  }

  /**
   * Met à jour la position de la souris
   */
  updateMousePosition(mouseX: number, mouseY: number) {
    this.navbarService.updateMousePosition(mouseX, mouseY);
  }

  /**
   * Met à jour la position de défilement
   */
  updateScrollPosition(scrollY: number) {

  }

  /**
   * Gère le redimensionnement de la fenêtre
   */
  onResize() {
    this.navbarService.onResize();
    this.backgroundService.onResize();
  }

  /**
   * Définit la couleur actuelle
   */
  setCurrentColor(color: string): void {
    this.navbarService.setCurrentColor(color);
  }

  /**
   * Obtient la couleur actuelle
   */
  getCurrentColor(): Observable<string> {
    return this.navbarService.getCurrentColor();
  }

  /**
   * Active le mode basse qualité
   */
  setLowQualityMode(enabled: boolean) {
    this.navbarService.setLowQualityMode(enabled);
  }

  /**
   * Libère les ressources Three.js
   */
  dispose(): void {
    this.navbarService.dispose();
    this.backgroundService.dispose();
  }

  /**
   * Detects navbar retraction and initializes the background scene
   */
  handleNavbarRetract(): void {
    if (!this.navbarRetracted) {
      this.navbarRetracted = true;
      const canvas = document.querySelector('#backgroundCanvas') as HTMLCanvasElement;
      if (canvas) {
        this.initBackground(canvas);
      } else {
        console.error('Background canvas not found during navbar retraction');
      }
    }
  }

  // MÉTHODES DE GESTION DES LUMIÈRES (façade vers LightService)
  /**
   * Obtient toutes les lumières (observable)
   */
  getLights(): Observable<SimpleLight[]> {
    return this.lightService.getLights();
  }

  /**
   * Obtient toutes les lumières (liste directe)
   */
  getAllLights(): SimpleLight[] {
    return this.lightService.getAllLights();
  }

  /**
   * Obtient les lumières filtrées par scène
   */
  getLightsByScene(sceneName: 'navbar' | 'background'): SimpleLight[] {
    return this.lightService.getLightsByScene(sceneName);
  }

  /**
   * Méthode unifiée pour définir les propriétés des lumières
   */
  setLightProperty(lightName: string, property: 'intensity' | 'color' | 'visibility' | 'castShadow', value: any): void {
    this.lightService.setLightProperty(lightName, property, value);
  }

  /**
   * Définit l'intensité d'une lumière
   */
  setLightIntensity(lightName: string, intensity: number): void {
    this.setLightProperty(lightName, 'intensity', intensity);
  }

  /**
   * Définit la couleur d'une lumière
   */
  setLightColor(lightName: string, color: string): void {
    this.setLightProperty(lightName, 'color', color);
  }

  /**
   * Définit la visibilité d'une lumière
   */
  setLightVisibility(lightName: string, visible: boolean): void {
    this.setLightProperty(lightName, 'visibility', visible);
  }

  /**
   * Définit si une lumière projette des ombres
   */
  setLightCastShadow(lightName: string, castShadow: boolean): void {
    this.setLightProperty(lightName, 'castShadow', castShadow);
  }

  /**
   * Crée un ensemble complet de lumières optimisées pour la navbar
   * Remplace les lumières importées par des lumières générées en code avec intensités normalisées
   */
  createOptimizedNavbarLights(scene: THREE.Scene) {
    return this.lightService.createOptimizedNavbarLights(scene);
  }

  /**
   * Désactive complètement toutes les lumières (visible = false et intensity = 0)
   */
  disableAllLights(): void {
    this.lightService.disableAllLights();
  }

  /**
   * Réactive toutes les lumières avec leurs intensités originales
   */
  enableAllLights(): void {
    this.lightService.enableAllLights();
  }
}