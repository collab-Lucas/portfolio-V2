import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as THREE from 'three';

import { NavbarThreeService } from './navbar-three.service';
import { BackgroundThreeService } from './background-three.service';
import { LightService, SimpleLight } from './threejs/light.service';

/**
 * Service principal Three.js qui sert de façade pour orchestrer les différents services spécialisés
 */
@Injectable({
  providedIn: 'root'
})
export class ThreeService {
  private activeTab: 'navbar' | 'background' = 'navbar';

  constructor(
    private navbarService: NavbarThreeService,
    private backgroundService: BackgroundThreeService,
    private lightService: LightService
  ) {}

  /**
   * Initialise la scène de la navbar
   */
  initNavbar(canvas: HTMLCanvasElement) {
    this.navbarService.initNavbar(canvas);
  }

  /**
   * Initialise la scène d'arrière-plan
   */
  initBackground(canvas: HTMLCanvasElement) {
    if (canvas) {
      this.backgroundService.init(canvas);
    } else {
      console.error('ThreeService: Tentative d\'initialiser le background avec un canvas null');
    }
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
    // Redimensionner à la fois la navbar et le background
    this.navbarService.onResize();
    
    // Appeler notre nouvelle méthode onResize sur le BackgroundThreeService
    if (this.backgroundService) {
      this.backgroundService.onResize();
    }
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
   * Log détaillé de toutes les lumières avec leurs propriétés complètes
   * Utile pour analyser les lumières importées et leurs valeurs problématiques
   */
  logAllLightsDetailed(): void {
    this.lightService.logAllLightsDetailed();
  }

  // Méthodes de compatibilité pour l'ancienne API
  
  setAmbientLightIntensity(intensity: number): void {
    this.setLightIntensity('Lumière ambiante', intensity);
  }

  setDirectionalLightIntensity(intensity: number): void {
    this.setLightIntensity('Lumière directionnelle', intensity);
  }

  setPointLightIntensity(intensity: number): void {
    this.setLightIntensity('Lumière ponctuelle', intensity);
  }
  
  setBackgroundLightIntensity(intensity: number): void {
    this.setLightIntensity('Lumière de fond', intensity);
  }

  setAmbientLightColor(color: string): void {
    this.setLightColor('Lumière ambiante', color);
  }

  setDirectionalLightColor(color: string): void {
    this.setLightColor('Lumière directionnelle', color);
  }

  setPointLightColor(color: string): void {
    this.setLightColor('Lumière ponctuelle', color);
  }
  
  setBackgroundLightColor(color: string): void {
    this.setLightColor('Lumière de fond', color);
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

  /**
   * Méthode de débogage pour diagnostiquer les problèmes de désactivation des lumières
   */
  debugLightDisabling(lightName: string): void {
    this.lightService.debugLightDisabling(lightName);
  }

  /**
   * Force la désactivation complète d'une lumière récalcitrante
   */
  forceDisableLight(lightName: string): void {
    this.lightService.forceDisableLight(lightName);
  }

  /**
   * Synchronise l'état enabled d'une lumière avec son intensité
   */
  syncLightEnabledState(lightName: string): void {
    this.lightService.syncLightEnabledState(lightName);
  }

  /**
   * Synchronise l'état de toutes les lumières
   */
  syncAllLightsEnabledState(): void {
    this.lightService.syncAllLightsEnabledState();
  }

  /**
   * Cette méthode ne fait rien car l'animation est gérée dans les services spécialisés
   * mais est fournie pour la compatibilité avec l'ancienne API
   */
  animate(): void {
    // L'animation est maintenant gérée directement dans NavbarThreeService et BackgroundThreeService
    // Cette méthode est fournie pour la compatibilité avec l'ancienne API
  }

  /**
   * Ajuste la caméra en fonction de l'état de la navbar
   * @param isShrunk True si la navbar est repliée, false sinon
   */
  adjustCameraForNavbarState(isShrunk: boolean): void {
    this.navbarService.adjustCameraForNavbarState(isShrunk);
  }
}