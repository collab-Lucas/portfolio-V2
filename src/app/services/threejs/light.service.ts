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
 * Cette interface est nécessaire pour le cast typé de propriétés Three.js
 */


// Les autres interfaces redondantes ont été supprimées car Three.js
// inclut déjà ces propriétés dans ses types

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
  // Nombre maximal de lumières pouvant projeter des ombres simultanément pour optimisation
  private readonly MAX_SHADOW_CASTING_LIGHTS = 3;
  private shadowCastingLights: Map<string, THREE.Light[]> = new Map(); // key: sceneType
  
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
   * Méthode unifiée pour modifier n'importe quelle propriété d'une lumière
   * Remplace setLightIntensity, setLightColor, setLightVisibility
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
                // Si on active les ombres, gérer la limitation du nombre de lumières avec ombre
                if (value) {
                  this.manageShadowCastingLights(obj, lightObj.scene);
                } else {
                  // Si on désactive les ombres, mettre à jour notre registre
                  this.updateShadowCastingLights(obj, lightObj.scene, false);
                }
                
                if (value && (obj instanceof THREE.DirectionalLight || obj instanceof THREE.SpotLight)) {
                  this.configureShadowsForLight(obj);
                }
              }
              break;
          }
        }
      });
    });

    this.simpleLightsSubject.next([...this.simpleLights]);
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
   * Définir l'intensité d'une lumière par son nom
   */

  
  /**
   * Définir si une lumière projette des ombres
   */
  setLightCastShadow(lightName: string, castShadow: boolean): void {
    this.setLightProperty(lightName, 'castShadow', castShadow);
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
          
          // Pour une désactivation complète, mettre aussi l'intensité à 0
          if (!changes.enabled && 'intensity' in threeLight) {
            // Sauvegarder l'intensité originale
            if (light.intensity > 0) {
              (light as any).originalIntensity = light.intensity;
            }
            (threeLight as any).intensity = 0;
          } else if (changes.enabled && 'intensity' in threeLight) {
            // Restaurer l'intensité originale ou utiliser celle spécifiée
            const intensityToRestore = changes.intensity !== undefined 
              ? changes.intensity 
              : ((light as any).originalIntensity || light.intensity);
            (threeLight as any).intensity = intensityToRestore;
          }
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
   * Gère la limitation du nombre de lumières projetant des ombres
   * Si le maximum est atteint, désactive la projection d'ombres pour la lumière la moins importante
   */
  private manageShadowCastingLights(light: THREE.Light, sceneType: 'navbar' | 'background'): void {
    // Initialiser la liste des lumières pour cette scène si nécessaire
    if (!this.shadowCastingLights.has(sceneType)) {
      this.shadowCastingLights.set(sceneType, []);
    }
    
    const sceneLights = this.shadowCastingLights.get(sceneType)!;
    
    // Si la lumière est déjà dans la liste, rien à faire
    if (sceneLights.includes(light)) {
      return;
    }
    
    // Si le nombre maximum de lumières avec ombres n'est pas atteint, ajouter simplement la lumière
    if (sceneLights.length < this.MAX_SHADOW_CASTING_LIGHTS) {
      sceneLights.push(light);
      (light as any).castShadow = true;
      return;
    }
    
    // Sinon, désactiver les ombres pour la lumière la moins "importante"
    // Priorité: DirectionalLight > SpotLight > PointLight
    // Et en cas d'égalité, désactiver la plus ancienne
    
    // Trier les lumières par type (priorité décroissante) puis par ancienneté (les plus récentes en premier)
    const getLightPriority = (l: THREE.Light): number => {
      if (l instanceof THREE.DirectionalLight) return 3;
      if (l instanceof THREE.SpotLight) return 2;
      if (l instanceof THREE.PointLight) return 1;
      return 0;
    };
    
    // Ajouter la nouvelle lumière à la liste temporaire pour le tri
    const allLights = [...sceneLights, light];
    allLights.sort((a, b) => {
      const priorityA = getLightPriority(a);
      const priorityB = getLightPriority(b);
      
      // Si les priorités sont différentes, trier par priorité
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Sinon, trier par position dans le tableau (les plus anciens en premier)
      const indexA = sceneLights.indexOf(a);
      const indexB = sceneLights.indexOf(b);
      
      // La nouvelle lumière doit avoir une priorité plus élevée
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
    
    // Prendre la lumière avec la priorité la plus basse
    const lightToDisable = allLights[0];
    
              // Si c'est la nouvelle lumière, ne pas l'ajouter et ne pas activer ses ombres
    if (lightToDisable === light) {
      (light as any).castShadow = false;
      return;
    }
    
    // Sinon, désactiver les ombres pour la lumière existante et ajouter la nouvelle
    (lightToDisable as any).castShadow = false;
    // Limitation des ombres: désactivation pour ${lightToDisable.name} et activation pour ${light.name}
    const lightObj = this.simpleLights.find(l => l.name === lightToDisable.name && l.scene === sceneType);
    if (lightObj) {
      lightObj.castShadow = false;
    }
    
    // Mettre à jour la liste
    const index = sceneLights.indexOf(lightToDisable);
    if (index !== -1) {
      sceneLights.splice(index, 1);
    }
    sceneLights.push(light);
    
    // Activer les ombres pour la nouvelle lumière
    (light as any).castShadow = true;
  }

  /**
   * Met à jour la liste des lumières projetant des ombres
   */
  private updateShadowCastingLights(light: THREE.Light, sceneType: 'navbar' | 'background', castShadow: boolean): void {
    // S'assurer que la liste pour cette scène existe
    if (!this.shadowCastingLights.has(sceneType)) {
      this.shadowCastingLights.set(sceneType, []);
    }
    
    const sceneLights = this.shadowCastingLights.get(sceneType)!;
    const index = sceneLights.indexOf(light);
    
    // Si on active les ombres et que la lumière n'est pas déjà dans la liste
    if (castShadow && index === -1) {
      // Gérer via manageShadowCastingLights pour respecter la limite
      this.manageShadowCastingLights(light, sceneType);
    } 
    // Si on désactive les ombres et que la lumière est dans la liste
    else if (!castShadow && index !== -1) {
      // Retirer la lumière de la liste
      sceneLights.splice(index, 1);
    }
  }
  
  /**
   * Configure les ombres pour une lumière
   */  
  configureShadowsForLight(light: THREE.Light): void {
    if (!light.shadow) return;
    
    // Configuration de base optimisée (résolution plus petite pour les performances)
    light.shadow.mapSize.width = 512; // Réduit de 1024 à 512 pour de meilleures performances
    light.shadow.mapSize.height = 512;
    
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
      light.shadow.radius = 1; // Réduit de 2 à 1
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
        shadowMapSize = 256; // Réduit davantage pour de meilleures performances
        type = THREE.BasicShadowMap; // Le plus rapide
        break;
      case 'medium':
        shadowMapSize = 512; // Réduit de 1024 à 512
        type = THREE.PCFShadowMap;
        break;
      case 'high':
        shadowMapSize = 1024; // Réduit de 2048 à 1024
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

    // Réinitialiser le suivi des lumières projetant des ombres
    this.shadowCastingLights.clear();
    
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

    // Appliquer la limitation des ombres
    this.enforceShadowLimits();
    
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
      directional.name = options.sceneType === 'navbar' ? 'Lumière directionnelle' : 'Direction de fond';
      
      // Activer les ombres avec gestion de la limitation
      directional.castShadow = true;
      
      // Configure shadow quality
      this.configureShadowsForLight(directional);
      
      scene.add(directional);
      result.directional = directional;
      
      // Gérer la limitation des ombres
      this.manageShadowCastingLights(directional, options.sceneType);
    }
    
    // Add point light if requested
    if (options.includePoint !== false) {
      const point = new THREE.PointLight(color, options.pointLightIntensity || 0.8);
      point.position.set(0, 0, 2);
      point.name = options.sceneType === 'navbar' ? 'Lumière ponctuelle' : 'Lumière de fond';
      
      // Activer les ombres avec gestion de la limitation
      point.castShadow = true;
      
      // Configure shadow quality
      this.configureShadowsForLight(point);
      
      scene.add(point);
      result.point = point;
      
      // Gérer la limitation des ombres
      this.manageShadowCastingLights(point, options.sceneType);
    }
    
    // Ajouter la scène à la liste des scènes à gérer
    this.registerScene(scene, options.sceneType);
    
    // Optimisation: configurer la qualité des ombres selon les options ou à 'medium' par défaut
    if (options.shadowQuality) {
      this.configureShadowQuality(options.shadowQuality, [{ 
        scene, 
        renderer: this.sceneRefs.find(ref => ref.scene === scene && ref.renderer)?.renderer! 
      }]);
    }
    
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
    // Suppression des logs redondants et inutiles
    // === LOG DÉTAILLÉ DE TOUTES LES LUMIÈRES ===
    
    this.sceneRefs.forEach(({ scene, type }) => {
      // 🎬 SCÈNE: ${type.toUpperCase()}

      let lightCount = 0;
      scene.traverse(obj => {
        if (obj instanceof THREE.Light) {
          lightCount++;

          // Informations de base
          // 💡 Lumière #${lightCount}: ${obj.name || 'Sans nom'}
          //    Type: ${this.getLightType(obj)}
          //    Intensité: ${this.getLightIntensity(obj)}
          //    Couleur: ${this.getLightColor(obj)}
          //    Visible: ${obj.visible}

          // Position (pour les lumières qui en ont une)
          if ('position' in obj) {
            const pos = (obj as any).position;
            //    Position: x=${pos.x.toFixed(3)}, y=${pos.y.toFixed(3)}, z=${pos.z.toFixed(3)}
          }

          // Propriétés spécifiques selon le type
          if (obj instanceof THREE.DirectionalLight) {
            const target = obj.target;
            //    Target position: x=${target.position.x.toFixed(3)}, y=${target.position.y.toFixed(3)}, z=${target.position.z.toFixed(3)}
          }

          // Informations sur les ombres
          if (obj.castShadow && obj.shadow) {
            //    Shadow map size: ${obj.shadow.mapSize.width}x${obj.shadow.mapSize.height}
            //    Shadow bias: ${obj.shadow.bias}
          }
        }
      });

      if (lightCount === 0) {
        //    Aucune lumière trouvée dans cette scène
      } else {
        //    Total: ${lightCount} lumière(s) dans la scène ${type}
      }
    });
    
    // === FIN DU LOG DES LUMIÈRES ===
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
   * @param scene La scène où ajouter les lumières
   * @param initialValues Valeurs d'initialisation des intensités (optionnel)
   * @returns Les objets de lumière créés
   */
  createOptimizedNavbarLights(
    scene: THREE.Scene, 
    initialValues?: { [lightName: string]: number }
  ): {
    ambient: THREE.AmbientLight,
    directional: THREE.DirectionalLight,
    point: THREE.PointLight,
    spotBD: THREE.SpotLight,
    spotHD: THREE.SpotLight,
    spotPrincipal: THREE.SpotLight,
    spotRouge: THREE.SpotLight,
    sun: THREE.DirectionalLight
  } {
    // VALEURS D'INITIALISATION UNIFIÉES - Source unique de vérité
    const defaultValues = {
      'Lumière ambiante': 0.0,
      'Lumière directionnelle': 0.15,
      'Lumière ponctuelle': 0.0,
      'SpotBD': 0.0,
      'SpotHD': 0.0,
      'Spotprincipal': 0.0,
      'Spotrouge': 0.0,
      'Sun': 0.0
    };
    
    // Utiliser les valeurs passées en paramètre ou les valeurs par défaut
    const targetValues = initialValues || defaultValues;
    
    // 🔥 CRÉATION DES LUMIÈRES AVEC ANIMATION VERS: targetValues

    // ÉTAPE 1: Supprimer toutes les lumières existantes importées depuis les modèles GLTF
    const lightsToRemove: THREE.Light[] = [];
    scene.traverse(obj => {
      if (obj instanceof THREE.Light) {
        lightsToRemove.push(obj);
      }
    });

    lightsToRemove.forEach(light => {
      scene.remove(light);
    });

    // ÉTAPE 2: Créer les nouvelles lumières optimisées à intensité 0

    // Création des lumières optimisées avec intensité 0
    const ambient = new THREE.AmbientLight('#ffffff', 0);
    ambient.name = 'Lumière ambiante';
    scene.add(ambient);
    // ✅ Ambiante créée avec intensité: ambient.intensity

    // Réinitialiser le suivi des lumières projetant des ombres pour cette scène
    this.shadowCastingLights.set('navbar', []);
    
    // Création des lumières par ordre de priorité pour les ombres
    const directional = new THREE.DirectionalLight('#ffffff', 0);
    directional.position.set(-5.000, 15.000, 10.000);
    directional.target.position.set(0.000, 0.000, 0.000);
    directional.castShadow = true;
    directional.name = 'Lumière directionnelle';
    this.configureShadowsForLight(directional);
    scene.add(directional);
    this.manageShadowCastingLights(directional, 'navbar');
    // ✅ Directionnelle créée avec intensité: directional.intensity

    const sun = new THREE.DirectionalLight('#ffffff', 0);
    sun.position.set(0.000, 20.903, 0.000);
    sun.target.position.set(0.000, 0.000, -1.000);
    sun.castShadow = true;
    sun.name = 'Sun';
    this.configureShadowsForLight(sun);
    scene.add(sun);
    this.manageShadowCastingLights(sun, 'navbar');
    // ✅ Sun créée avec intensité: sun.intensity

    const spotPrincipal = new THREE.SpotLight('#fff8f2', 0, 99.98999786376953, 1.571, 1, 2);
    spotPrincipal.position.set(1.642, 12.590, -8.854);
    spotPrincipal.target.position.set(0.000, 0.000, -1.000);
    spotPrincipal.castShadow = true;
    spotPrincipal.name = 'Spotprincipal';
    this.configureShadowsForLight(spotPrincipal);
    scene.add(spotPrincipal);
    this.manageShadowCastingLights(spotPrincipal, 'navbar');
    // ✅ SpotPrincipal créée avec intensité: spotPrincipal.intensity

    // Lumières avec potentiellement pas d'ombres selon les limites
    const spotBD = new THREE.SpotLight('#fff8f2', 0, 99.98999786376953, 1.571, 0.7889447212219238, 2);
    spotBD.position.set(-79.931, 12.193, 5.648);
    spotBD.target.position.set(0.000, 0.000, -1.000);
    spotBD.castShadow = true;
    spotBD.name = 'SpotBD';
    this.configureShadowsForLight(spotBD);
    scene.add(spotBD);
    this.manageShadowCastingLights(spotBD, 'navbar');
    // ✅ SpotBD créée avec intensité: spotBD.intensity

    const spotHD = new THREE.SpotLight('#fff8f2', 0, 99.98999786376953, 1.571, 0.7889447212219238, 2);
    spotHD.position.set(-61.144, 12.193, 46.533);
    spotHD.target.position.set(0.000, 0.000, -1.000);
    spotHD.castShadow = true;
    spotHD.name = 'SpotHD';
    this.configureShadowsForLight(spotHD);
    scene.add(spotHD);
    this.manageShadowCastingLights(spotHD, 'navbar');
    // ...removed console.log for optimization...
    
    const spotRouge = new THREE.SpotLight('#ff0009', 0, 99.98999786376953, 1.571, 0.7889447212219238, 2);
    spotRouge.position.set(20.210, 12.193, 5.512);
    spotRouge.target.position.set(0.000, 0.000, -1.000);
    spotRouge.castShadow = true;
    spotRouge.name = 'Spotrouge';
    this.configureShadowsForLight(spotRouge);
    scene.add(spotRouge);
    this.manageShadowCastingLights(spotRouge, 'navbar');
    // ...removed console.log for optimization...

    const point = new THREE.PointLight('#ffffff', 0, 0, 2);
    point.position.set(0.000, 0.000, 2.000);
    point.castShadow = true;
    point.name = 'Lumière ponctuelle';
    this.configureShadowsForLight(point);
    scene.add(point);
    this.manageShadowCastingLights(point, 'navbar');
    // ...removed console.log for optimization...

    // ÉTAPE 3: Enregistrer la scène et actualiser la liste
    this.registerScene(scene, 'navbar');

    // Actualiser la liste des lumières
    this.refreshLights([{ scene, type: 'navbar' }]);
    
    // Appliquer la limitation des ombres
    this.enforceShadowLimits();

    // ÉTAPE 4: Lancer l'animation des intensités
    setTimeout(() => {
      this.animateLightsIntensity(targetValues);
    }, 100); // Petit délai pour s'assurer que tout est initialisé

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

  /**
   * Désactive complètement toutes les lumières (visible = false et intensity = 0)
   * Utile pour tester le rendu sans aucune lumière
   */
  disableAllLights(): void {
    this.simpleLights.forEach(light => {
      // Sauvegarder l'intensité originale avant de la désactiver
      if (light.intensity > 0) {
        (light as any).originalIntensity = light.intensity;
      }
      
      // Mettre à jour le SimpleLight
      light.enabled = false;
      light.intensity = 0;
      
      // Mettre à jour la lumière Three.js dans toutes les scènes
      const relevantScenes = this.sceneRefs.filter(ref => ref.type === light.scene);
      
      relevantScenes.forEach(({ scene }) => {
        const threeLight = scene.getObjectByName(light.name) as THREE.Light;
        if (threeLight) {
          threeLight.visible = false;
          if ('intensity' in threeLight) {
            (threeLight as any).intensity = 0;
          }
        }
      });
    });
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Réactive toutes les lumières avec leurs intensités originales
   */
  enableAllLights(): void {
    this.simpleLights.forEach(light => {
      // Restaurer l'intensité originale
      const originalIntensity = (light as any).originalIntensity || 1.0;
      
      // Mettre à jour le SimpleLight
      light.enabled = true;
      light.intensity = originalIntensity;
      
      // Mettre à jour la lumière Three.js dans toutes les scènes
      const relevantScenes = this.sceneRefs.filter(ref => ref.type === light.scene);
      
      relevantScenes.forEach(({ scene }) => {
        const threeLight = scene.getObjectByName(light.name) as THREE.Light;
        if (threeLight) {
          threeLight.visible = true;
          if ('intensity' in threeLight) {
            (threeLight as any).intensity = originalIntensity;
          }
        }
      });
    });
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Applique la limitation des ombres à toutes les lumières existantes
   * Utile après le chargement de modèles GLTF qui peuvent contenir des lumières avec ombres
   */
  enforceShadowLimits(): void {
    // Réinitialiser le suivi des lumières avec ombres
    this.shadowCastingLights.clear();
    
    // Pour chaque scène, appliquer les limites
    this.sceneRefs.forEach(({ scene, type }) => {
      // Liste pour cette scène
      const sceneLights: THREE.Light[] = [];
      this.shadowCastingLights.set(type, sceneLights);
      
      // Récupérer toutes les lumières avec ombres
      const lightsWithShadow: THREE.Light[] = [];
      scene.traverse(obj => {
        if (obj instanceof THREE.Light && obj.castShadow) {
          lightsWithShadow.push(obj);
        }
      });
      
      // Trier les lumières par type (priorité décroissante)
      lightsWithShadow.sort((a, b) => {
        const getPriority = (l: THREE.Light): number => {
          if (l instanceof THREE.DirectionalLight) return 3;
          if (l instanceof THREE.SpotLight) return 2;
          if (l instanceof THREE.PointLight) return 1;
          return 0;
        };
        return getPriority(b) - getPriority(a);
      });
      
      // Désactiver les ombres pour toutes les lumières au-delà de la limite
      lightsWithShadow.forEach((light, index) => {
        if (index < this.MAX_SHADOW_CASTING_LIGHTS) {
          // Garder les ombres activées
          sceneLights.push(light);
        } else {
          // Désactiver les ombres
          light.castShadow = false;
          
          // Mettre à jour l'interface SimpleLight correspondante
          const lightObj = this.simpleLights.find(l => l.name === light.name && l.scene === type);
          if (lightObj) {
            lightObj.castShadow = false;
          }
        }
      });
      
      // ...removed console.log for optimization...
    });
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  /**
   * Méthodes de debugging simplifiées
   */
  debugLightDisabling(lightName: string): void {
    const lightObj = this.simpleLights.find(l => l.name === lightName);
    // ...removed console.log for optimization...
  }

  forceDisableLight(lightName: string): void {
    this.setLightProperty(lightName, 'intensity', 0);
    this.setLightProperty(lightName, 'visibility', false);
  }



  syncAllLightsEnabledState(): void {
    let hasChanges = false;
    
    this.simpleLights.forEach(light => {
      const oldEnabled = light.enabled;
      light.enabled = light.intensity > 0;
      if (oldEnabled !== light.enabled) hasChanges = true;
    });
    
    if (hasChanges) {
      this.simpleLightsSubject.next([...this.simpleLights]);
    }
  }

  /**
   * Anime l'intensité des lumières de 0 à leur valeur cible sur une durée donnée
   * @param targetValues Valeurs d'intensité cibles pour chaque lumière
   * @param duration Durée de l'animation en secondes (défaut: 2 secondes)
   */
  animateLightsIntensity(targetValues: { [lightName: string]: number }, duration: number = 2): void {
    // Démarrer toutes les lumières à 0
    Object.keys(targetValues).forEach(lightName => {
      this.setLightProperty(lightName, 'intensity', 0);
    });

    // Calculer les valeurs d'incrémentation par frame
    const fps = 60;  // Frames par seconde cible
    const totalFrames = Math.floor(fps * duration);
    const increments: { [lightName: string]: number } = {};

    Object.keys(targetValues).forEach(lightName => {
      increments[lightName] = targetValues[lightName] / totalFrames;
    });

    // Animation frame par frame
    let frame = 0;
    const animate = () => {
      // Incrémenter toutes les lumières
      Object.keys(targetValues).forEach(lightName => {
        const currentLight = this.simpleLights.find(l => l.name === lightName);
        if (!currentLight) return;

        // Calculer la nouvelle intensité
        const newIntensity = Math.min(
          currentLight.intensity + increments[lightName],
          targetValues[lightName]
        );
        
        // Mettre à jour l'intensité
        this.setLightProperty(lightName, 'intensity', newIntensity);
      });

      // Continuer l'animation si nécessaire
      frame++;
      if (frame < totalFrames) {
        requestAnimationFrame(animate);
      }
    };

    // Démarrer l'animation
    requestAnimationFrame(animate);
  }
  
}
