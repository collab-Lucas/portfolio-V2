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
  constructor() {
    // Déclaration globale pour permettre l'accès depuis d'autres services
    window.lightServiceInstance = this;
  }

  /**
   * Enregistre une scène pour une utilisation ultérieure
   */
  registerScene(scene: THREE.Scene, type: 'navbar' | 'background', renderer?: THREE.WebGLRenderer): void {
    // Vérifier si la scène existe déjà
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
   * Définir l'intensité d'une lumière par son nom
   */
  setLightIntensity(lightName: string, intensity: number): void {
    // Si l'intensité est 0, désactiver la lumière complètement
    const shouldDisable = intensity === 0;
    
    // Trouver la lumière dans notre liste
    const lightObj = this.simpleLights.find(l => l.name === lightName);
    if (!lightObj) return;
    
    // Mettre à jour SimpleLight
    lightObj.intensity = intensity;
    if (shouldDisable) {
      lightObj.enabled = false;
    }
    
    // Mettre à jour la lumière dans toutes les scènes qui la contiennent
    const relevantScenes = this.sceneRefs.filter(ref => ref.type === lightObj.scene);
    
    relevantScenes.forEach(({ scene }) => {
      const threeLight = scene.getObjectByName(lightName) as THREE.Light;
      if (threeLight && 'intensity' in threeLight) {
        (threeLight as any).intensity = intensity;
        if (shouldDisable) {
          threeLight.visible = false;
        }
      }
    });
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Définir la couleur d'une lumière par son nom
   */
  setLightColor(lightName: string, color: string): void {
    // Trouver la lumière dans notre liste
    const lightObj = this.simpleLights.find(l => l.name === lightName);
    if (!lightObj) return;
    
    // Mettre à jour SimpleLight
    lightObj.color = color;
    
    // Mettre à jour la lumière dans toutes les scènes qui la contiennent
    const relevantScenes = this.sceneRefs.filter(ref => ref.type === lightObj.scene);
    
    relevantScenes.forEach(({ scene }) => {
      const threeLight = scene.getObjectByName(lightName) as THREE.Light;
      if (threeLight && 'color' in threeLight) {
        (threeLight as any).color.set(color);
      }
    });
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Définir la visibilité d'une lumière par son nom
   */
  setLightVisibility(lightName: string, visible: boolean): void {
    // Trouver la lumière dans notre liste
    const lightObj = this.simpleLights.find(l => l.name === lightName);
    if (!lightObj) return;
    
    // Mettre à jour SimpleLight
    lightObj.enabled = visible;
    
    // Mettre à jour la lumière dans toutes les scènes qui la contiennent
    const relevantScenes = this.sceneRefs.filter(ref => ref.type === lightObj.scene);
    
    relevantScenes.forEach(({ scene }) => {
      const threeLight = scene.getObjectByName(lightName) as THREE.Light;
      if (threeLight) {
        threeLight.visible = visible;
      }
    });
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }
  
  /**
   * Définir si une lumière projette des ombres
   */
  setLightCastShadow(lightName: string, castShadow: boolean): void {
    // Trouver la lumière dans notre liste
    const lightObj = this.simpleLights.find(l => l.name === lightName);
    if (!lightObj) return;
    
    // Mettre à jour SimpleLight
    lightObj.castShadow = castShadow;
    
    // Mettre à jour la lumière dans toutes les scènes qui la contiennent
    const relevantScenes = this.sceneRefs.filter(ref => ref.type === lightObj.scene);
    
    relevantScenes.forEach(({ scene }) => {
      const threeLight = scene.getObjectByName(lightName) as THREE.Light;
      if (threeLight && 'castShadow' in threeLight) {
        (threeLight as any).castShadow = castShadow;
        
        // Configurer la qualité des ombres pour les lumières directionnelles et spot
        if ((threeLight instanceof THREE.DirectionalLight || threeLight instanceof THREE.SpotLight) && castShadow) {
          this.configureShadowsForLight(threeLight);
        }
      }
    });
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Met à jour les propriétés d'une lumière
   */
  updateLight(name: string, changes: Partial<SimpleLight>, scene?: THREE.Scene): void {
    // Trouver la lumière dans notre liste
    const idx = this.simpleLights.findIndex(l => l.name === name);
    if (idx === -1) return;
    
    const light = this.simpleLights[idx];
    
    // Mettre à jour l'objet SimpleLight
    Object.assign(light, changes);
    
    // Gérer le cas spécial où l'intensité est 0
    if (changes.intensity === 0 && changes.enabled !== false) {
      light.enabled = false;
      changes.enabled = false;
    }
    
    // Si une scène est fournie, mettre à jour la lumière Three.js
    if (scene) {
      const threeLight = scene.getObjectByName(name) as THREE.Light;
      if (threeLight) {
        // Mettre à jour l'intensité
        if (changes.intensity !== undefined && 'intensity' in threeLight) {
          (threeLight as any).intensity = changes.intensity;
        }
        
        // Mettre à jour la couleur
        if (changes.color !== undefined && 'color' in threeLight) {
          (threeLight as any).color.set(changes.color);
        }
        
        // Mettre à jour la visibilité
        if (changes.enabled !== undefined) {
          threeLight.visible = changes.enabled;
        }

        // Mettre à jour la position
        if (changes.position && 'position' in threeLight) {
          (threeLight as any).position.set(
            changes.position.x,
            changes.position.y,
            changes.position.z
          );
        }

        // Mettre à jour castShadow
        if (changes.castShadow !== undefined && 'castShadow' in threeLight) {
          (threeLight as any).castShadow = changes.castShadow;
          
          if (changes.castShadow) {
            this.configureShadowsForLight(threeLight);
          }
        }
      }
    }
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Configure les ombres pour une lumière
   */  
  configureShadowsForLight(light: THREE.Light): void {
    if (!light.shadow) return;
    
    // Configuration de base
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    
    // Configuration spécifique aux types de lumières
    if (light instanceof THREE.DirectionalLight) {
      // Accès typé sécurisé pour DirectionalLight
      const d = 15;
      (light.shadow.camera as THREE.OrthographicCamera).left = -d;
      (light.shadow.camera as THREE.OrthographicCamera).right = d;
      (light.shadow.camera as THREE.OrthographicCamera).top = d;
      (light.shadow.camera as THREE.OrthographicCamera).bottom = -d;
      (light.shadow.camera as THREE.OrthographicCamera).near = 0.5;
      (light.shadow.camera as THREE.OrthographicCamera).far = 50;
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.02;
      light.shadow.radius = 2;
    } else if (light instanceof THREE.SpotLight) {
      light.shadow.bias = -0.0003;
      (light.shadow.camera as THREE.PerspectiveCamera).near = 0.5;
      (light.shadow.camera as THREE.PerspectiveCamera).far = 25;
    } else if (light instanceof THREE.PointLight) {
      (light.shadow.camera as any).near = 0.5;
      (light.shadow.camera as any).far = 15;
      light.shadow.bias = -0.0005;
    }
    
    // Mettre à jour la caméra d'ombre avec type casting sécurisé
    try {
      // Vérifier quel type de caméra est utilisé
      if (light.shadow.camera instanceof THREE.PerspectiveCamera || 
          light.shadow.camera instanceof THREE.OrthographicCamera) {
        light.shadow.camera.updateProjectionMatrix();
      }
    } catch (error) {
      console.warn('Failed to update shadow camera matrix', error);
    }
  }

  /**
   * Configure la qualité des ombres pour toutes les lumières
   */
  configureShadowQuality(
    quality: 'low' | 'medium' | 'high' = 'medium',
    scenes?: { scene: THREE.Scene, renderer: THREE.WebGLRenderer }[]
  ): void {
    // Si aucune scène n'est fournie, utiliser les scènes enregistrées
    const scenesToUpdate = scenes || this.sceneRefs
      .filter(ref => ref.renderer)
      .map(ref => ({ scene: ref.scene, renderer: ref.renderer! }));
    
    // Configuration selon la qualité choisie
    let shadowMapSize: number;
    let type: THREE.ShadowMapType;
    
    switch (quality) {
      case 'low':
        shadowMapSize = 512;
        type = THREE.BasicShadowMap;
        break;
      case 'medium':
        shadowMapSize = 1024;
        type = THREE.PCFShadowMap;
        break;
      case 'high':
        shadowMapSize = 2048;
        type = THREE.PCFSoftShadowMap;
        break;
    }
    
    // Appliquer aux renderers
    scenesToUpdate.forEach(({ renderer }) => {
      if (renderer) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = type;
      }
    });
    
    // Mettre à jour les paramètres de qualité des ombres sur toutes les lumières
    scenesToUpdate.forEach(({ scene }) => {
      scene.traverse(obj => {
        if (obj instanceof THREE.Light && 'castShadow' in obj && obj.castShadow) {
          if (!obj.shadow) return;
          
          obj.shadow.mapSize.width = shadowMapSize;
          obj.shadow.mapSize.height = shadowMapSize;
          
          if (obj instanceof THREE.DirectionalLight) {
            const d = 15;
            (obj.shadow.camera as THREE.OrthographicCamera).left = -d;
            (obj.shadow.camera as THREE.OrthographicCamera).right = d;
            (obj.shadow.camera as THREE.OrthographicCamera).top = d;
            (obj.shadow.camera as THREE.OrthographicCamera).bottom = -d;
            (obj.shadow.camera as THREE.OrthographicCamera).near = 0.5;
            (obj.shadow.camera as THREE.OrthographicCamera).far = 50;
            obj.shadow.bias = -0.0005;
          } else if (obj instanceof THREE.PointLight) {
            (obj.shadow.camera as any).near = 0.5;
            (obj.shadow.camera as any).far = 25;
            obj.shadow.bias = -0.001;
          }
          
          // Mettre à jour la caméra d'ombre
          try {
            if (obj.shadow.camera && 
                (obj.shadow.camera instanceof THREE.PerspectiveCamera || 
                obj.shadow.camera instanceof THREE.OrthographicCamera)) {
              obj.shadow.camera.updateProjectionMatrix();
            }
          } catch (error) {
            console.warn('Failed to update shadow camera matrix', error);
          }
          
          // Forcer la mise à jour de la shadowMap
          if (obj.shadow.map) {
            obj.shadow.map.dispose();
            obj.shadow.map = null as any;
          }
        }
      });
    });
  }

  /**
   * Force la mise à jour des ombres pour toutes les lumières
   */
  forceUpdateShadows(scenes?: { scene: THREE.Scene, renderer: THREE.WebGLRenderer }[]): void {
    // Si aucune scène n'est fournie, utiliser les scènes enregistrées
    const scenesToUpdate = scenes || this.sceneRefs
      .filter(ref => ref.renderer)
      .map(ref => ({ scene: ref.scene, renderer: ref.renderer! }));
      
    // Forcer le rendu des ombres pour les renderers
    scenesToUpdate.forEach(({ renderer }) => {
      if (renderer) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.needsUpdate = true;
      }
    });
    
    // Forcer la mise à jour des shadow maps pour chaque lumière
    scenesToUpdate.forEach(({ scene }) => {
      scene.traverse(obj => {
        if (obj instanceof THREE.Light && obj.castShadow && obj.shadow) {
          obj.shadow.needsUpdate = true;
          
          // Force la mise à jour de la caméra d'ombre
          if (obj.shadow.camera) {
            obj.shadow.camera.updateProjectionMatrix();
          }
          
          // Forcer une nouvelle génération de la shadow map
          if (obj.shadow.map) {
            obj.shadow.map.dispose();
            obj.shadow.map = null as any;
          }
        }
      });
    });
  }

  /**
   * Initialise/rafraîchit la liste des lumières depuis les scènes
   */
  refreshLights(scenes?: { scene: THREE.Scene, type: 'navbar' | 'background' }[]): void {
    // Si aucune scène n'est fournie, utiliser les scènes enregistrées
    const scenesToRefresh = scenes || this.sceneRefs;
    
    // Sauvegarder les états actuels des lumières avant de vider la liste
    const lightStates = new Map<string, Partial<SimpleLight>>();
    this.simpleLights.forEach(light => {
      lightStates.set(light.name + '_' + light.scene, {
        intensity: light.intensity,
        color: light.color,
        enabled: light.enabled,
        castShadow: light.castShadow
      });
    });

    // Vider la liste
    this.simpleLights = [];

    // Parcourir toutes les scènes
    scenesToRefresh.forEach(({ scene, type }) => {
      if (scene) {
        scene.traverse(obj => {
          if (obj instanceof THREE.Light) {
            // Ajouter la lumière à notre liste
            this.addSimpleLight(obj, type);
            
            // Restaurer l'état précédent si disponible
            const savedState = lightStates.get(obj.name + '_' + type);
            if (savedState) {
              if (savedState.intensity !== undefined && 'intensity' in obj) {
                (obj as any).intensity = savedState.intensity;
              }
              
              if (savedState.color !== undefined && 'color' in obj) {
                (obj as any).color.set(savedState.color);
              }
              
              if (savedState.enabled !== undefined) {
                obj.visible = savedState.enabled;
              }
              
              if (savedState.castShadow !== undefined && 'castShadow' in obj) {
                (obj as any).castShadow = savedState.castShadow;
              }
              
              // Mettre à jour l'objet SimpleLight
              const idx = this.simpleLights.findIndex(l => l.name === obj.name && l.scene === type);
              if (idx !== -1) {
                Object.assign(this.simpleLights[idx], savedState);
              }
            }
          }
        });
      }
    });

    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Ajouter une lumière simplifiée à la liste
   */
  private addSimpleLight(light: THREE.Light, scene: 'navbar' | 'background'): void {
    // Vérifier si la lumière a un nom, sinon en créer un
    if (!light.name || light.name.trim() === '') {
      const type = this.getLightType(light);
      const sameTypeCount = this.simpleLights.filter(l => l.type === type && l.scene === scene).length + 1;
      light.name = `${type} ${sameTypeCount}`;
    }

    // Créer l'objet SimpleLight
    const simpleLight: SimpleLight = {
      name: light.name,
      type: this.getLightType(light),
      intensity: this.getLightIntensity(light),
      color: this.getLightColor(light),
      enabled: light.visible,
      position: this.getLightPosition(light),
      castShadow: this.getLightCastShadow(light),
      scene
    };

    // Ajouter à la liste (éviter les doublons)
    const existingIndex = this.simpleLights.findIndex(l => l.name === light.name && l.scene === scene);
    if (existingIndex >= 0) {
      this.simpleLights[existingIndex] = simpleLight;
    } else {
      this.simpleLights.push(simpleLight);
    }
  }

  /**
   * Fonctions d'assistance pour extraire les propriétés des lumières
   */
  private getLightType(light: THREE.Light): string {
    if (light instanceof THREE.AmbientLight) return 'AmbientLight';
    if (light instanceof THREE.DirectionalLight) return 'DirectionalLight';
    if (light instanceof THREE.PointLight) return 'PointLight';
    if (light instanceof THREE.SpotLight) return 'SpotLight';
    if (light instanceof THREE.HemisphereLight) return 'HemisphereLight';
    if (light instanceof THREE.RectAreaLight) return 'RectAreaLight';
    return 'Light';
  }

  private getLightIntensity(light: THREE.Light): number {
    if ('intensity' in light) {
      return (light as any).intensity;
    }
    return 1;
  }

  private getLightColor(light: THREE.Light): string {
    if ('color' in light && (light as any).color instanceof THREE.Color) {
      return '#' + (light as any).color.getHexString();
    }
    return '#ffffff';
  }

  private getLightPosition(light: THREE.Light): { x: number; y: number; z: number } | undefined {
    if ('position' in light) {
      return {
        x: (light as any).position.x,
        y: (light as any).position.y,
        z: (light as any).position.z
      };
    }
    return undefined;
  }

  private getLightCastShadow(light: THREE.Light): boolean {
    if ('castShadow' in light) {
      return (light as any).castShadow;
    }
    return false;
  }

  /**
   * Crée un ensemble standard de lumières pour une scène
   * @param scene La scène où ajouter les lumières
   * @param options Options de configuration des lumières
   * @returns Les objets de lumière créés
   */
  createStandardLightSet(scene: THREE.Scene, options: {
    sceneType: 'navbar' | 'background',
    color?: string,
    ambientIntensity?: number,
    directionalIntensity?: number,
    pointLightIntensity?: number,
    includeDirectional?: boolean,
    includePoint?: boolean,
    shadowQuality?: 'low' | 'medium' | 'high'
  }): {
    ambient: THREE.AmbientLight,
    directional?: THREE.DirectionalLight,
    point?: THREE.PointLight
  } {
    const color = options.color || '#ffffff';
    const result: {
      ambient: THREE.AmbientLight,
      directional?: THREE.DirectionalLight,
      point?: THREE.PointLight
    } = {
      ambient: new THREE.AmbientLight(0xffffff, options.ambientIntensity || 0.5)
    };
    
    // Configure ambient light
    result.ambient.name = options.sceneType === 'navbar' ? 'Lumière ambiante' : 'Ambiance de fond';
    scene.add(result.ambient);
    
    // Add directional light if requested
    if (options.includeDirectional !== false) {
      const directional = new THREE.DirectionalLight(color, options.directionalIntensity || 0.8);
      directional.position.set(-5, 15, 10);
      directional.castShadow = true;
      directional.name = options.sceneType === 'navbar' ? 'Lumière directionnelle' : 'Direction de fond';
      
      // Configure shadow quality
      this.configureShadowsForLight(directional);
      
      scene.add(directional);
      result.directional = directional;
    }
    
    // Add point light if requested
    if (options.includePoint !== false) {
      const point = new THREE.PointLight(color, options.pointLightIntensity || 0.8);
      point.position.set(0, 0, 2);
      point.castShadow = true;
      point.name = options.sceneType === 'navbar' ? 'Lumière ponctuelle' : 'Lumière de fond';
      
      // Configure shadow quality
      this.configureShadowsForLight(point);
      
      scene.add(point);
      result.point = point;
    }
    
    // Ajouter la scène à la liste des scènes à gérer
    this.registerScene(scene, options.sceneType);
    
    // Update lights in the service
    this.refreshLights([{
      scene,
      type: options.sceneType
    }]);
    
    return result;
  }
}
