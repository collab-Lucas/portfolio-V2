import * as THREE from 'three';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Interface pour une représentation simplifiée des lumières
 * utilisée pour la gestion des lumières via l'UI
 */
export interface SimpleLight {
  name: string;
  type: string;
  intensity: number;
  color: string;
  enabled: boolean;
  position?: { x: number; y: number; z: number };
  castShadow?: boolean;
  scene: 'navbar' | 'background';
}

interface SceneReference {
  scene: THREE.Scene;
  type: 'navbar' | 'background';
  renderer?: THREE.WebGLRenderer;
}

/**
 * Service pour gérer les lumières dans Three.js
 * Centralise toutes les opérations relatives aux lumières
 */
@Injectable({ providedIn: 'root' })
export class LightService {
  private simpleLights: SimpleLight[] = [];
  private simpleLightsSubject = new BehaviorSubject<SimpleLight[]>([]);
  private sceneRefs: SceneReference[] = [];
  private readonly MAX_SHADOW_CASTING_LIGHTS = 3;
  private shadowCastingLights: Map<string, THREE.Light[]> = new Map();
  
  constructor() {
    // Déclaration globale pour permettre l'accès depuis d'autres services
    (window as any).lightServiceInstance = this;
  }

  /**
   * Enregistre une scène pour une utilisation ultérieure
   */
  registerScene(scene: THREE.Scene, type: 'navbar' | 'background', renderer?: THREE.WebGLRenderer): void {
    const exists = this.sceneRefs.some(ref => ref.scene === scene && ref.type === type);
    if (!exists) {
      this.sceneRefs.push({ scene, type, renderer });
    }
  }

  /**
   * Récupère toutes les lumières sous forme observable
   */
  getLights(): Observable<SimpleLight[]> {
    return this.simpleLightsSubject.asObservable();
  }

  /**
   * Récupère toutes les lumières
   */
  getAllLights(): SimpleLight[] {
    return [...this.simpleLights];
  }

  /**
   * Récupère les lumières filtrées par scène
   */
  getLightsByScene(sceneName: 'navbar' | 'background'): SimpleLight[] {
    return this.simpleLights.filter(light => light.scene === sceneName);
  }

  /**
   * Méthode unifiée pour modifier n'importe quelle propriété d'une lumière
   */
  setLightProperty(lightName: string, property: 'intensity' | 'color' | 'visibility' | 'castShadow', value: any): void {
    const lightObj = this.simpleLights.find(l => l.name === lightName);
    if (!lightObj) return;

    // Mettre à jour SimpleLight selon la propriété
    switch (property) {
      case 'intensity':
        lightObj.intensity = value;
        lightObj.enabled = value > 0;
        break;
      case 'color':
        lightObj.color = value;
        break;
      case 'visibility':
        lightObj.enabled = value;
        if (!value && lightObj.intensity > 0) {
          (lightObj as any).originalIntensity = lightObj.intensity;
        }
        break;
      case 'castShadow':
        lightObj.castShadow = value;
        break;
    }

    // Mettre à jour la lumière Three.js dans toutes les scènes
    this.sceneRefs.forEach(({ scene }) => {
      scene.traverse(obj => {
        if (obj instanceof THREE.Light && obj.name === lightName) {
          this.updateThreeLightProperty(obj, property, value, lightObj);
        }
      });
    });

    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  private updateThreeLightProperty(obj: THREE.Light, property: string, value: any, lightObj: SimpleLight): void {
    switch (property) {
      case 'intensity':
        if ('intensity' in obj) {
          (obj as any).intensity = value;
          obj.visible = value > 0;
        }
        break;
      case 'color':
        if ('color' in obj) {
          (obj as any).color.set(value);
        }
        break;
      case 'visibility':
        obj.visible = value;
        if (!value && 'intensity' in obj) {
          (obj as any).intensity = 0;
        } else if (value && 'intensity' in obj) {
          const intensityToRestore = (lightObj as any).originalIntensity || lightObj.intensity;
          (obj as any).intensity = intensityToRestore;
        }
        break;
      case 'castShadow':
        if ('castShadow' in obj) {
          if (value) {
            this.manageShadowCastingLights(obj, lightObj.scene);
          } else {
            this.updateShadowCastingLights(obj, lightObj.scene, false);
          }
          
          if (value && (obj instanceof THREE.DirectionalLight || obj instanceof THREE.SpotLight)) {
            this.configureShadowsForLight(obj);
          }
        }
        break;
    }
  }

  /**
   * Définir la couleur d'une lumière par son nom
   */
  setLightColor(lightName: string, color: string): void {
    this.setLightProperty(lightName, 'color', color);
  }

  /**
   * Définir la visibilité d'une lumière par son nom
   */
  setLightVisibility(lightName: string, visible: boolean): void {
    this.setLightProperty(lightName, 'visibility', visible);
  }

  /**
   * Définir si une lumière projette des ombres
   */
  setLightCastShadow(lightName: string, castShadow: boolean): void {
    this.setLightProperty(lightName, 'castShadow', castShadow);
  }

  /**
   * Configure les ombres pour une lumière
   */
  private configureShadowsForLight(light: THREE.Light): void {
    if (light instanceof THREE.DirectionalLight) {
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 500;
      light.shadow.camera.left = -100;
      light.shadow.camera.right = 100;
      light.shadow.camera.top = 100;
      light.shadow.camera.bottom = -100;
      light.shadow.bias = -0.0001;
    } else if (light instanceof THREE.SpotLight) {
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 500;
      light.shadow.bias = -0.0001;
    }
  }

  /**
   * Gère la limitation du nombre de lumières projetant des ombres
   */
  private manageShadowCastingLights(light: THREE.Light, sceneType: 'navbar' | 'background'): void {
    if (!this.shadowCastingLights.has(sceneType)) {
      this.shadowCastingLights.set(sceneType, []);
    }
    
    const sceneLights = this.shadowCastingLights.get(sceneType)!;
    
    if (sceneLights.includes(light)) {
      return;
    }
    
    if (sceneLights.length < this.MAX_SHADOW_CASTING_LIGHTS) {
      sceneLights.push(light);
      (light as any).castShadow = true;
      return;
    }
    
    // Désactiver la lumière la moins importante
    const lightToDisable = sceneLights[0];
    (lightToDisable as any).castShadow = false;
    
    const lightObj = this.simpleLights.find(l => l.name === lightToDisable.name && l.scene === sceneType);
    if (lightObj) {
      lightObj.castShadow = false;
    }
    
    sceneLights.splice(0, 1);
    sceneLights.push(light);
    (light as any).castShadow = true;
  }

  /**
   * Met à jour la liste des lumières projetant des ombres
   */
  private updateShadowCastingLights(light: THREE.Light, sceneType: 'navbar' | 'background', isEnabled: boolean): void {
    if (!this.shadowCastingLights.has(sceneType)) {
      this.shadowCastingLights.set(sceneType, []);
    }
    
    const sceneLights = this.shadowCastingLights.get(sceneType)!;
    const index = sceneLights.indexOf(light);
    
    if (isEnabled && index === -1) {
      sceneLights.push(light);
    } else if (!isEnabled && index !== -1) {
      sceneLights.splice(index, 1);
    }
  }

  /**
   * Ajoute une lumière à la liste de gestion
   */
  addLight(light: SimpleLight): void {
    const existingIndex = this.simpleLights.findIndex(l => l.name === light.name && l.scene === light.scene);
    
    if (existingIndex !== -1) {
      this.simpleLights[existingIndex] = light;
    } else {
      this.simpleLights.push(light);
    }
    
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Supprime une lumière de la liste de gestion
   */
  removeLight(lightName: string, scene?: 'navbar' | 'background'): void {
    const index = this.simpleLights.findIndex(l => 
      l.name === lightName && (scene ? l.scene === scene : true)
    );
    
    if (index !== -1) {
      this.simpleLights.splice(index, 1);
      this.simpleLightsSubject.next([...this.simpleLights]);
    }
  }

  /**
   * Nettoyage des ressources
   */
  dispose(): void {
    this.simpleLights = [];
    this.sceneRefs = [];
    this.shadowCastingLights.clear();
    this.simpleLightsSubject.complete();
  }
}
