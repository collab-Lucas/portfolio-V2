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

/**
 * Interface pour les lumières Three.js avec intensité
 */
export interface LightWithIntensity extends THREE.Light {
  intensity: number;
}

/**
 * Interface pour les lumières Three.js avec position
 */
export interface LightWithPosition extends THREE.Light {
  position: THREE.Vector3;
}

/**
 * Interface pour les lumières Three.js avec casting shadow
 */
export interface LightWithShadow extends THREE.Light {
  castShadow: boolean;
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
    
    relevantScenes.forEach(({ scene }) => {      const threeLight = scene.getObjectByName(lightName) as THREE.Light;
      if (threeLight && 'intensity' in threeLight) {
        (threeLight as LightWithIntensity).intensity = intensity;
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
    
    relevantScenes.forEach(({ scene }) => {      const threeLight = scene.getObjectByName(lightName) as THREE.Light;
      if (threeLight && 'color' in threeLight) {
        (threeLight as THREE.Light & { color: THREE.Color }).color.set(color);
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
      // Gérer le cas spécial où l'intensity est 0
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
      // Failed to update shadow camera matrix
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
            }            } catch (error) {
              // Failed to update shadow camera matrix
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
    includeSpotBD?: boolean,
    includeSpotHD?: boolean,
    includeSpotRouge?: boolean,
    includeSun?: boolean,
    shadowQuality?: 'low' | 'medium' | 'high'
  }): {
    ambient: THREE.AmbientLight,
    directional?: THREE.DirectionalLight,
    point?: THREE.PointLight,
    spotBD?: THREE.SpotLight,
    spotHD?: THREE.SpotLight,
    spotRouge?: THREE.SpotLight,
    sun?: THREE.DirectionalLight
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

  /**
   * Crée une lumière directionnelle avec des options de configuration avancées
   * @param options Options de configuration de la lumière directionnelle
   * @returns La lumière directionnelle créée
   */
  createDirectionalLight(options: {
    color?: number;
    intensity?: number;
    position?: { x: number; y: number; z: number };
    castShadow?: boolean;
    shadowConfig?: {
      mapSize?: { width: number; height: number };
      camera?: { near: number; far: number; left: number; right: number; top: number; bottom: number };
      bias?: number;
    };
  } = {}): THREE.DirectionalLight {
    const {
      color = 0xffffff,
      intensity = 1,
      position = { x: 5, y: 5, z: 5 },
      castShadow = false,
      shadowConfig
    } = options;
    
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(position.x, position.y, position.z);
    light.castShadow = castShadow;
    
    if (castShadow && shadowConfig) {
      if (shadowConfig.mapSize) {
        light.shadow.mapSize.width = shadowConfig.mapSize.width;
        light.shadow.mapSize.height = shadowConfig.mapSize.height;
      }
      
      if (shadowConfig.camera) {
        const { near, far, left, right, top, bottom } = shadowConfig.camera;
        light.shadow.camera.near = near !== undefined ? near : light.shadow.camera.near;
        light.shadow.camera.far = far !== undefined ? far : light.shadow.camera.far;
        light.shadow.camera.left = left !== undefined ? left : light.shadow.camera.left;
        light.shadow.camera.right = right !== undefined ? right : light.shadow.camera.right;
        light.shadow.camera.top = top !== undefined ? top : light.shadow.camera.top;
        light.shadow.camera.bottom = bottom !== undefined ? bottom : light.shadow.camera.bottom;
      }
      
      if (shadowConfig.bias !== undefined) {
        light.shadow.bias = shadowConfig.bias;
      }
    }
    
    return light;
  }

  /**
   * Crée une lumière ponctuelle avec des options de configuration avancées
   * @param options Options de configuration de la lumière ponctuelle
   * @returns La lumière ponctuelle créée
   */
  createPointLight(options: {
    color?: number;
    intensity?: number;
    position?: { x: number; y: number; z: number };
    distance?: number;
    decay?: number;
    castShadow?: boolean;
    shadowConfig?: {
      mapSize?: { width: number; height: number };
      camera?: { near: number; far: number };
      bias?: number;
    };
  } = {}): THREE.PointLight {
    const {
      color = 0xffffff,
      intensity = 1,
      position = { x: 0, y: 0, z: 0 },
      distance = 0,
      decay = 2,
      castShadow = false,
      shadowConfig
    } = options;
    
    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.position.set(position.x, position.y, position.z);
    light.castShadow = castShadow;
    
    if (castShadow && shadowConfig) {
      if (shadowConfig.mapSize) {
        light.shadow.mapSize.width = shadowConfig.mapSize.width;
        light.shadow.mapSize.height = shadowConfig.mapSize.height;
      }
      
      if (shadowConfig.camera) {
        light.shadow.camera.near = shadowConfig.camera.near || light.shadow.camera.near;
        light.shadow.camera.far = shadowConfig.camera.far || light.shadow.camera.far;
      }
      
      if (shadowConfig.bias !== undefined) {
        light.shadow.bias = shadowConfig.bias;
      }
    }
    
    return light;
  }

  /**
   * Crée une lumière ambiante avec des options de configuration simples
   * @param options Options de configuration de la lumière ambiante
   * @returns La lumière ambiante créée
   */
  createAmbientLight(options: {
    color?: number;
    intensity?: number;
  } = {}): THREE.AmbientLight {
    const { color = 0xffffff, intensity = 1 } = options;
    return new THREE.AmbientLight(color, intensity);
  }

  /**
   * Log détaillé de toutes les lumières dans toutes les scènes enregistrées
   * Affiche toutes les propriétés utiles pour recréer les lumières en code
   */
  logAllLightsDetailed(): void {
    console.log('=== LOG DÉTAILLÉ DE TOUTES LES LUMIÈRES ===');
    
    this.sceneRefs.forEach(({ scene, type }) => {
      console.log(`\n🎬 SCÈNE: ${type.toUpperCase()}`);
      console.log('─'.repeat(50));
      
      let lightCount = 0;
      scene.traverse(obj => {
        if (obj instanceof THREE.Light) {
          lightCount++;
          
          // Informations de base
          console.log(`\n💡 Lumière #${lightCount}: ${obj.name || 'Sans nom'}`);
          console.log(`   Type: ${this.getLightType(obj)}`);
          console.log(`   Intensité: ${this.getLightIntensity(obj)}`);
          console.log(`   Couleur: ${this.getLightColor(obj)}`);
          console.log(`   Visible: ${obj.visible}`);
          console.log(`   Cast Shadow: ${this.getLightCastShadow(obj)}`);
          
          // Position (pour les lumières qui en ont une)
          if ('position' in obj) {
            const pos = (obj as any).position;
            console.log(`   Position: x=${pos.x.toFixed(3)}, y=${pos.y.toFixed(3)}, z=${pos.z.toFixed(3)}`);
          }
          
          // Rotation (pour les lumières qui en ont une)
          if ('rotation' in obj) {
            const rot = (obj as any).rotation;
            console.log(`   Rotation: x=${rot.x.toFixed(3)}, y=${rot.y.toFixed(3)}, z=${rot.z.toFixed(3)}`);
          }
          
          // Propriétés spécifiques selon le type
          if (obj instanceof THREE.DirectionalLight) {
            const target = obj.target;
            console.log(`   Target position: x=${target.position.x.toFixed(3)}, y=${target.position.y.toFixed(3)}, z=${target.position.z.toFixed(3)}`);
          } else if (obj instanceof THREE.PointLight) {
            console.log(`   Distance: ${obj.distance}`);
            console.log(`   Decay: ${obj.decay}`);
          } else if (obj instanceof THREE.SpotLight) {
            console.log(`   Distance: ${obj.distance}`);
            console.log(`   Angle: ${obj.angle.toFixed(3)} rad (${(obj.angle * 180 / Math.PI).toFixed(1)}°)`);
            console.log(`   Penumbra: ${obj.penumbra}`);
            console.log(`   Decay: ${obj.decay}`);
            const target = obj.target;
            console.log(`   Target position: x=${target.position.x.toFixed(3)}, y=${target.position.y.toFixed(3)}, z=${target.position.z.toFixed(3)}`);
          }
          
          // Informations sur les ombres
          if (obj.castShadow && obj.shadow) {
            console.log(`   Shadow map size: ${obj.shadow.mapSize.width}x${obj.shadow.mapSize.height}`);
            if (obj.shadow.camera) {
              if (obj.shadow.camera instanceof THREE.OrthographicCamera) {
                const cam = obj.shadow.camera;
                console.log(`   Shadow camera (ortho): left=${cam.left}, right=${cam.right}, top=${cam.top}, bottom=${cam.bottom}, near=${cam.near}, far=${cam.far}`);
              } else if (obj.shadow.camera instanceof THREE.PerspectiveCamera) {
                const cam = obj.shadow.camera;
                console.log(`   Shadow camera (persp): fov=${cam.fov}, near=${cam.near}, far=${cam.far}`);
              }
            }
            console.log(`   Shadow bias: ${obj.shadow.bias}`);
          }
          
          // Code pour recréer cette lumière
          console.log(`   📝 CODE POUR RECRÉER:`);
          console.log(this.generateLightCreationCode(obj, type));
          console.log('   ' + '─'.repeat(40));
        }
      });
      
      if (lightCount === 0) {
        console.log('   Aucune lumière trouvée dans cette scène');
      } else {
        console.log(`\n   Total: ${lightCount} lumière(s) dans la scène ${type}`);
      }
    });
    
    console.log('\n=== FIN DU LOG DES LUMIÈRES ===');
  }

  /**
   * Génère le code TypeScript pour recréer une lumière
   */
  private generateLightCreationCode(light: THREE.Light, sceneType: string): string {
    const intensity = this.getLightIntensity(light);
    const color = this.getLightColor(light);
    const name = light.name || 'unnamed_light';
    
    let code = '';
    
    if (light instanceof THREE.AmbientLight) {
      code = `const ${name.replace(/\s+/g, '_').toLowerCase()} = new THREE.AmbientLight('${color}', ${intensity});`;
    } else if (light instanceof THREE.DirectionalLight) {
      const pos = light.position;
      const target = light.target.position;
      code = `const ${name.replace(/\s+/g, '_').toLowerCase()} = new THREE.DirectionalLight('${color}', ${intensity});
      ${name.replace(/\s+/g, '_').toLowerCase()}.position.set(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)});
      ${name.replace(/\s+/g, '_').toLowerCase()}.target.position.set(${target.x.toFixed(3)}, ${target.y.toFixed(3)}, ${target.z.toFixed(3)});`;
    } else if (light instanceof THREE.PointLight) {
      const pos = light.position;
      code = `const ${name.replace(/\s+/g, '_').toLowerCase()} = new THREE.PointLight('${color}', ${intensity}, ${light.distance}, ${light.decay});
      ${name.replace(/\s+/g, '_').toLowerCase()}.position.set(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)});`;
    } else if (light instanceof THREE.SpotLight) {
      const pos = light.position;
      const target = light.target.position;
      code = `const ${name.replace(/\s+/g, '_').toLowerCase()} = new THREE.SpotLight('${color}', ${intensity}, ${light.distance}, ${light.angle.toFixed(3)}, ${light.penumbra}, ${light.decay});
      ${name.replace(/\s+/g, '_').toLowerCase()}.position.set(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)});
      ${name.replace(/\s+/g, '_').toLowerCase()}.target.position.set(${target.x.toFixed(3)}, ${target.y.toFixed(3)}, ${target.z.toFixed(3)});`;
    }
    
    if (light.castShadow) {
      code += `\n      ${name.replace(/\s+/g, '_').toLowerCase()}.castShadow = true;`;
    }
    
    code += `\n      ${name.replace(/\s+/g, '_').toLowerCase()}.name = '${name}';`;
    code += `\n      scene.add(${name.replace(/\s+/g, '_').toLowerCase()});`;
    
    return code;
  }

  /**
   * Crée un ensemble complet de lumières optimisées pour la navbar
   * Basé sur l'analyse des lumières importées mais avec intensités normalisées à 1.0
   * @param scene La scène où ajouter les lumières
   * @returns Les objets de lumière créés
   */
  createOptimizedNavbarLights(scene: THREE.Scene): {
    ambient: THREE.AmbientLight,
    directional: THREE.DirectionalLight,
    point: THREE.PointLight,
    spotBD: THREE.SpotLight,
    spotHD: THREE.SpotLight,
    spotPrincipal: THREE.SpotLight,
    spotRouge: THREE.SpotLight,
    sun: THREE.DirectionalLight
  } {
    console.log('🔧 Création des lumières optimisées pour la navbar...');

    // ÉTAPE 1: Supprimer toutes les lumières existantes importées depuis les modèles GLTF
    console.log('🗑️ Suppression des lumières importées existantes...');
    const lightsToRemove: THREE.Light[] = [];
    scene.traverse(obj => {
      if (obj instanceof THREE.Light) {
        lightsToRemove.push(obj);
      }
    });

    lightsToRemove.forEach(light => {
      console.log(`   Suppression de: ${light.name || 'Lumière sans nom'} (${light.type})`);
      scene.remove(light);
    });

    console.log(`✅ ${lightsToRemove.length} lumières importées supprimées`);

    // ÉTAPE 2: Créer les nouvelles lumières optimisées avec intensités normalisées
    console.log('🔧 Création des nouvelles lumières optimisées...');

    // Création des lumières optimisées
    const ambient = new THREE.AmbientLight('#ffffff', 1.0);
    ambient.name = 'Lumière ambiante';
    scene.add(ambient);

    const directional = new THREE.DirectionalLight('#ffffff', 1.0);
    directional.position.set(-5.000, 15.000, 10.000);
    directional.target.position.set(0.000, 0.000, 0.000);
    directional.castShadow = true;
    directional.name = 'Lumière directionnelle';
    this.configureShadowsForLight(directional);
    scene.add(directional);

    const point = new THREE.PointLight('#ffffff', 1.0, 0, 2);
    point.position.set(0.000, 0.000, 2.000);
    point.castShadow = true;
    point.name = 'Lumière ponctuelle';
    this.configureShadowsForLight(point);
    scene.add(point);

    const spotBD = new THREE.SpotLight('#fff8f2', 1.0, 99.98999786376953, 1.571, 0.7889447212219238, 2);
    spotBD.position.set(-79.931, 12.193, 5.648);
    spotBD.target.position.set(0.000, 0.000, -1.000);
    spotBD.castShadow = true;
    spotBD.name = 'SpotBD';
    this.configureShadowsForLight(spotBD);
    scene.add(spotBD);

    const spotHD = new THREE.SpotLight('#fff8f2', 1.0, 99.98999786376953, 1.571, 0.7889447212219238, 2);
    spotHD.position.set(-61.144, 12.193, 46.533);
    spotHD.target.position.set(0.000, 0.000, -1.000);
    spotHD.castShadow = true;
    spotHD.name = 'SpotHD';
    this.configureShadowsForLight(spotHD);
    scene.add(spotHD);

    const spotPrincipal = new THREE.SpotLight('#fff8f2', 1.0, 99.98999786376953, 1.571, 1, 2);
    spotPrincipal.position.set(1.642, 12.590, -8.854);
    spotPrincipal.target.position.set(0.000, 0.000, -1.000);
    spotPrincipal.castShadow = true;
    spotPrincipal.name = 'Spotprincipal';
    this.configureShadowsForLight(spotPrincipal);
    scene.add(spotPrincipal);

    const spotRouge = new THREE.SpotLight('#ff0009', 1.0, 99.98999786376953, 1.571, 0.7889447212219238, 2);
    spotRouge.position.set(20.210, 12.193, 5.512);
    spotRouge.target.position.set(0.000, 0.000, -1.000);
    spotRouge.castShadow = true;
    spotRouge.name = 'Spotrouge';
    this.configureShadowsForLight(spotRouge);
    scene.add(spotRouge);

    const sun = new THREE.DirectionalLight('#ffffff', 1.0);
    sun.position.set(0.000, 20.903, 0.000);
    sun.target.position.set(0.000, 0.000, -1.000);
    sun.castShadow = true;
    sun.name = 'Sun';
    this.configureShadowsForLight(sun);
    scene.add(sun);

    console.log('✅ 8 nouvelles lumières optimisées créées avec succès !');

    // ÉTAPE 3: Enregistrer la scène et actualiser la liste
    this.registerScene(scene, 'navbar');

    // Actualiser la liste des lumières
    this.refreshLights([{ scene, type: 'navbar' }]);

    console.log('🎯 Système de lumières optimisé finalisé - Plus besoin de charger navbar_scene.glb !');

    // Retourner uniquement les lumières créées
    return {
      ambient,
      directional,
      point,
      spotBD,
      spotHD,
      spotPrincipal,
      spotRouge,
      sun
    };
  }
  
}
