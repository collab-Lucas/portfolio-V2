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
    this.backgroundService.initBackground(canvas);
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
    this.backgroundService.updateMousePosition(mouseX, mouseY);
  }

  /**
   * Met à jour la position de défilement
   */
  updateScrollPosition(scrollY: number) {
    this.backgroundService.updateScrollPosition(scrollY);
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
    this.backgroundService.setCurrentColor(color);
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
    this.backgroundService.setLowQualityMode(enabled);
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
   * Obtient toutes les lumières
   */
  getLights(): Observable<SimpleLight[]> {
    return this.lightService.getLights();
  }

  /**
   * Obtient toutes les lumières
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
   * Définit l'intensité d'une lumière
   */
  setLightIntensity(lightName: string, intensity: number): void {
    this.lightService.setLightIntensity(lightName, intensity);
  }

  /**
   * Définit la couleur d'une lumière
   */
  setLightColor(lightName: string, color: string): void {
    this.lightService.setLightColor(lightName, color);
  }

  /**
   * Définit la visibilité d'une lumière
   */
  setLightVisibility(lightName: string, visible: boolean): void {
    this.lightService.setLightVisibility(lightName, visible);
  }

  /**
   * Définit si une lumière projette des ombres
   */
  setLightCastShadow(lightName: string, castShadow: boolean): void {
    this.lightService.setLightCastShadow(lightName, castShadow);
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
   * Cette méthode ne fait rien car l'animation est gérée dans les services spécialisés
   * mais est fournie pour la compatibilité avec l'ancienne API
   */
  animate(): void {
    // L'animation est maintenant gérée directement dans NavbarThreeService et BackgroundThreeService
    // Cette méthode est fournie pour la compatibilité avec l'ancienne API
  }
}