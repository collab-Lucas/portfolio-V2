// filepath: c:\Users\Lucas\Documents\PROGRAMMATION\Projet portfolio\portfolio-V2\src\app\services\three.service.ts
import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BehaviorSubject, Observable } from 'rxjs';

// Interface optimisée pour la gestion des lumières
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

@Injectable({
  providedIn: 'root'
})
export class ThreeService {
  private currentColor = new BehaviorSubject<string>('#66ccff');

  // Scene properties
  private navbarScene!: THREE.Scene;
  private navbarCamera!: THREE.PerspectiveCamera;
  private navbarRenderer!: THREE.WebGLRenderer;
  private mixer: THREE.AnimationMixer | null = null;
  private mixers: THREE.AnimationMixer[] = []; // Pour gérer plusieurs animations
  private animations: THREE.AnimationClip[] = [];
  private clock = new THREE.Clock();

  private backgroundScene!: THREE.Scene;
  private backgroundCamera!: THREE.PerspectiveCamera;
  private backgroundRenderer!: THREE.WebGLRenderer;
  private backgroundObjects: THREE.Mesh[] = [];
  private light!: THREE.PointLight;

  // Lumières principales (pour la compatibilité)
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private pointLight!: THREE.PointLight;

  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentRotationX = 0;
  private currentRotationY = 0;

  private navbarElement: HTMLElement | null = null;
  
  // Performance optimization flags
  private lowQualityMode = true;
  private animationFrameRate = 30; // Frames per second for animation updates
  private lastAnimationTime = 0;

  // Nouveau système de gestion des lumières
  private simpleLights: SimpleLight[] = [];
  private simpleLightsSubject = new BehaviorSubject<SimpleLight[]>([]);
  private activeTab: 'navbar' | 'background' = 'navbar';

  constructor() {
    this.navbarElement = document.querySelector('.navbar');
  }

  // SYSTÈME DE GESTION DES LUMIÈRES

  // Observable pour l'UI - récupérer toutes les lumières
  getLights(): Observable<SimpleLight[]> {
    return this.simpleLightsSubject.asObservable();
  }

  // Récupérer toutes les lumières
  getAllLights(): SimpleLight[] {
    return [...this.simpleLights];
  }

  // Récupérer les lumières filtrées par scène
  getLightsByScene(sceneName: 'navbar' | 'background'): SimpleLight[] {
    return this.simpleLights.filter(light => light.scene === sceneName);
  }

  // Définir la scène active pour les contrôles
  setActiveTab(tab: 'navbar' | 'background'): void {
    this.activeTab = tab;
  }

  // Méthodes publiques pour l'UI
  
  // Définir l'intensité d'une lumière par son nom
  setLightIntensity(lightName: string, intensity: number): void {
    // Si l'intensité est 0, désactiver la lumière complètement
    const shouldDisable = intensity === 0;
    
    this.updateLight(lightName, { 
      intensity, 
      enabled: shouldDisable ? false : true 
    });
  }

  // Définir la couleur d'une lumière par son nom
  setLightColor(lightName: string, color: string): void {
    this.updateLight(lightName, { color });
  }

  // Définir la visibilité d'une lumière par son nom
  setLightVisibility(lightName: string, visible: boolean): void {
    this.updateLight(lightName, { enabled: visible });
  }
  
  // Définir si une lumière projette des ombres
  setLightCastShadow(lightName: string, castShadow: boolean): void {
    this.updateLight(lightName, { castShadow });
    
    // Mettre à jour directement l'objet Three.js
    const idx = this.simpleLights.findIndex(l => l.name === lightName);
    if (idx === -1) return;
    
    const light = this.simpleLights[idx];
    let threeLight: THREE.Light | undefined;
    
    if (light.scene === 'navbar' && this.navbarScene) {
      threeLight = this.navbarScene.getObjectByName(lightName) as THREE.Light;
    } else if (light.scene === 'background' && this.backgroundScene) {
      threeLight = this.backgroundScene.getObjectByName(lightName) as THREE.Light;
    }
    
    if (threeLight && 'castShadow' in threeLight) {
      (threeLight as any).castShadow = castShadow;
      
      // Configurer la qualité des ombres pour les lumières directionnelles et spot
      if ((threeLight instanceof THREE.DirectionalLight || threeLight instanceof THREE.SpotLight) && castShadow) {
        threeLight.shadow.mapSize.width = 1024;
        threeLight.shadow.mapSize.height = 1024;
        threeLight.shadow.camera.near = 0.5;
        threeLight.shadow.camera.far = 50;
        
        // Paramètres spécifiques aux lumières directionnelles
        if (threeLight instanceof THREE.DirectionalLight) {
          threeLight.shadow.camera.left = -10;
          threeLight.shadow.camera.right = 10;
          threeLight.shadow.camera.top = 10;
          threeLight.shadow.camera.bottom = -10;
        }
        threeLight.shadow.bias = -0.0001;
      }
    }
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

  // Ajouter une lumière à la liste
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
  
  // Initialiser/rafraîchir la liste des lumières
  refreshLights(): void {
    // Sauvegarder les états actuels des lumières avant de vider la liste
    const lightStates = new Map<string, Partial<SimpleLight>>();
    this.simpleLights.forEach(light => {
      lightStates.set(light.name + '_' + light.scene, {
        intensity: light.intensity,
        color: light.color,
        enabled: light.enabled
      });
    });

    // Vider la liste
    this.simpleLights = [];

    // Parcourir la scène navbar
    if (this.navbarScene) {
      this.navbarScene.traverse(obj => {
        if (obj instanceof THREE.Light) {
          // Donner un nom spécial aux lumières principales pour la compatibilité avec l'UI existante
          if (obj instanceof THREE.AmbientLight && !obj.name) obj.name = 'Lumière ambiante';
          if (obj instanceof THREE.DirectionalLight && !obj.name) obj.name = 'Lumière directionnelle';
          if (obj instanceof THREE.PointLight && obj !== this.light && !obj.name) obj.name = 'Lumière ponctuelle';
          
          this.addSimpleLight(obj, 'navbar');
          
          // Restaurer l'état précédent si disponible
          const savedState = lightStates.get(obj.name + '_navbar');
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
            
            // Mettre à jour l'objet SimpleLight
            const idx = this.simpleLights.findIndex(l => l.name === obj.name && l.scene === 'navbar');
            if (idx !== -1) {
              Object.assign(this.simpleLights[idx], savedState);
            }
          }
        }
      });
    }

    // Parcourir la scène background
    if (this.backgroundScene) {
      this.backgroundScene.traverse(obj => {
        if (obj instanceof THREE.Light) {
          // Si c'est la lumière principale du fond, lui donner un nom spécial
          if (obj === this.light && !obj.name) obj.name = 'Lumière de fond';
          
          this.addSimpleLight(obj, 'background');
          
          // Restaurer l'état précédent si disponible
          const savedState = lightStates.get(obj.name + '_background');
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
            
            // Mettre à jour l'objet SimpleLight
            const idx = this.simpleLights.findIndex(l => l.name === obj.name && l.scene === 'background');
            if (idx !== -1) {
              Object.assign(this.simpleLights[idx], savedState);
            }
          }
        }
      });
    }

    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }
  
  // Mettre à jour les propriétés d'une lumière
  updateLight(name: string, changes: Partial<SimpleLight>): void {
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
    
    // Trouver et mettre à jour l'objet THREE.Light correspondant
    let threeLight: THREE.Light | undefined;
    if (light.scene === 'navbar' && this.navbarScene) {
      threeLight = this.navbarScene.getObjectByName(name) as THREE.Light;
    } else if (light.scene === 'background' && this.backgroundScene) {
      threeLight = this.backgroundScene.getObjectByName(name) as THREE.Light;
    }
    
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
    }
    
    // Mettre à jour les lumières principales (pour la compatibilité)
    this.updateMainLights(name, changes);
    
    // Notifier les abonnés
    this.simpleLightsSubject.next([...this.simpleLights]);
  }

  // Fonctions d'assistance pour extraire les propriétés des lumières
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

  // Mettre à jour les références aux lumières principales pour la compatibilité
  private updateMainLights(name: string, changes: Partial<SimpleLight>): void {
    switch (name) {
      case 'Lumière ambiante':
        if (this.ambientLight) {
          if (changes.intensity !== undefined) this.ambientLight.intensity = changes.intensity;
          if (changes.color !== undefined) this.ambientLight.color.set(changes.color);
          if (changes.enabled !== undefined) this.ambientLight.visible = changes.enabled;
        }
        break;
      case 'Lumière directionnelle':
        if (this.directionalLight) {
          if (changes.intensity !== undefined) this.directionalLight.intensity = changes.intensity;
          if (changes.color !== undefined) this.directionalLight.color.set(changes.color);
          if (changes.enabled !== undefined) this.directionalLight.visible = changes.enabled;
        }
        break;
      case 'Lumière ponctuelle':
        if (this.pointLight) {
          if (changes.intensity !== undefined) this.pointLight.intensity = changes.intensity;
          if (changes.color !== undefined) this.pointLight.color.set(changes.color);
          if (changes.enabled !== undefined) this.pointLight.visible = changes.enabled;
        }
        break;
      case 'Lumière de fond':
        if (this.light) {
          if (changes.intensity !== undefined) this.light.intensity = changes.intensity;
          if (changes.color !== undefined) this.light.color.set(changes.color);
          if (changes.enabled !== undefined) this.light.visible = changes.enabled;
        }
        break;
    }
  }

  // MÉTHODES UTILITAIRES

  // Récupérer la couleur courante (pour le thème)
  getCurrentColor(): Observable<string> {
    return this.currentColor.asObservable();
  }

  // Définir la couleur courante (pour le thème)
  setCurrentColor(color: string): void {
    this.currentColor.next(color);
    if (this.light) {
      this.light.color.set(color);
    }
    // Mettre à jour la couleur des objets de fond
    this.backgroundObjects.forEach(obj => {
      if (obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.color.set(color);
      }
    });
  }

  // INITIALISATION DES SCÈNES
  initNavbar(canvas: HTMLCanvasElement) {
    this.navbarScene = new THREE.Scene();
    this.navbarScene.background = null;

    const CANVAS_HEIGHT = window.innerHeight;
    
    // Initialisation du renderer avec support des ombres
    this.navbarRenderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      alpha: true,
      antialias: !this.lowQualityMode,
      precision: this.lowQualityMode ? 'lowp' : 'mediump',
      powerPreference: 'low-power'
    });
    this.navbarRenderer.setSize(window.innerWidth, CANVAS_HEIGHT);
    this.navbarRenderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    
    // Configuration avancée des ombres
    this.navbarRenderer.shadowMap.enabled = true;
    this.navbarRenderer.shadowMap.type = this.lowQualityMode ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.navbarRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.navbarRenderer.toneMappingExposure = 1;
    
    // Lumières de base
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.ambientLight.name = 'Lumière ambiante';
    this.navbarScene.add(this.ambientLight);

    // Lumière directionnelle avec configuration d'ombres de haute qualité
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(-5, 10, 7);
    this.directionalLight.castShadow = true;
    
    // Configuration détaillée des ombres
    const shadowQuality = this.lowQualityMode ? 1024 : 2048;
    this.directionalLight.shadow.mapSize.width = shadowQuality;
    this.directionalLight.shadow.mapSize.height = shadowQuality;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02; // Corrige les artéfacts d'ombre
    this.directionalLight.shadow.radius = 1.5; // Adoucit légèrement les ombres (PCFSoftShadowMap)
    this.directionalLight.name = 'Lumière directionnelle';
    this.navbarScene.add(this.directionalLight);

    const loader = new GLTFLoader();
    
    // Load navbar_ico
    loader.load(
      'assets/models/navbar_ico.glb',
      (gltf: GLTF) => {
        // Configurer l'objet chargé pour le support des ombres
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Utiliser la méthode dédiée pour configurer les ombres
            this.configureShadowsForObject(child, true, true);
          }
        });

        if (gltf.animations && gltf.animations.length > 0) {
          const icoMixer = new THREE.AnimationMixer(gltf.scene);
          this.mixers.push(icoMixer);
          const icoAction = icoMixer.clipAction(gltf.animations[0]);
          icoAction.play();
        }

        this.navbarScene.add(gltf.scene);
      },
      undefined,
      (err: unknown) => {
        console.error('Error loading navbar_ico:', err);
      }
    );
    
    // Load navbar_torus
    loader.load(
      'assets/models/navbar_torus.glb',
      (gltf: GLTF) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Certains objets comme le torus sont plus décoratifs et n'ont pas besoin d'ombres
            // Configurer pour ne pas projeter ni recevoir d'ombres pour des raisons de performance
            this.configureShadowsForObject(child, false, false);
            
            // Optimisation des matériaux pour un meilleur rendu
            if (child.material instanceof THREE.MeshStandardMaterial || 
                child.material instanceof THREE.MeshPhysicalMaterial) {
              child.material.envMapIntensity = 0.8;
              child.material.needsUpdate = true;
            }
          }
        });

        if (gltf.animations && gltf.animations.length > 0) {
          const torusMixer = new THREE.AnimationMixer(gltf.scene);
          this.mixers.push(torusMixer);
          const torusAction = torusMixer.clipAction(gltf.animations[0]);
          torusAction.play();
        }

        this.navbarScene.add(gltf.scene);
      },
      undefined,
      (err: unknown) => {
        console.error('Error loading navbar_torus:', err);
      }
    );
    
    // Load navbar_scene
    loader.load(
      'assets/models/navbar_scene.glb',
      (gltf: GLTF) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Les objets de la scène principale doivent recevoir des ombres mais ne pas forcément en projeter
            this.configureShadowsForObject(child, false, true);
            
            // Améliorer les matériaux pour un meilleur rendu des ombres
            if (child.material instanceof THREE.MeshStandardMaterial || 
                child.material instanceof THREE.MeshPhysicalMaterial) {
              child.material.envMapIntensity = 1.0;
              // Augmenter légèrement la rugosité pour des ombres plus réalistes
              child.material.roughness = Math.max(0.3, child.material.roughness);
              // Réduire la métallicité pour des ombres plus prononcées
              if (child.material.metalness > 0.7) {
                child.material.metalness = 0.7;
              }
              child.material.needsUpdate = true;
            }
          }
          if (child instanceof THREE.Camera) {
            this.navbarCamera = child as THREE.PerspectiveCamera;
            this.navbarCamera.aspect = window.innerWidth / CANVAS_HEIGHT;
            this.navbarCamera.updateProjectionMatrix();
          }
          // Récupérer les lumières importées
          if (child instanceof THREE.Light) {
            // Donner un nom basé sur le type si aucun nom n'est défini
            if (!child.name || child.name.trim() === '') {
              const type = this.getLightType(child);
              const count = this.navbarScene.children.filter(
                c => c instanceof THREE.Light && this.getLightType(c as THREE.Light) === type
              ).length;
              child.name = `${type} ${count + 1}`;
            }
            
            // Activer les ombres pour les lumières qui peuvent en projeter
            if ((child instanceof THREE.DirectionalLight || 
                child instanceof THREE.SpotLight || 
                child instanceof THREE.PointLight) && 
               (!('castShadow' in child) || !child.castShadow)) {
              child.castShadow = true;
              
              // Configurer les paramètres d'ombre selon le type
              if (child instanceof THREE.DirectionalLight) {
                const shadowQuality = this.lowQualityMode ? 1024 : 2048;
                child.shadow.mapSize.width = shadowQuality;
                child.shadow.mapSize.height = shadowQuality;
                child.shadow.camera.near = 0.5;
                child.shadow.camera.far = 50;
                child.shadow.camera.left = -15;
                child.shadow.camera.right = 15;
                child.shadow.camera.top = 15;
                child.shadow.camera.bottom = -15;
                child.shadow.bias = -0.0005;
                child.shadow.normalBias = 0.02;
              } else if (child instanceof THREE.SpotLight) {
                child.shadow.mapSize.width = 1024;
                child.shadow.mapSize.height = 1024;
                child.shadow.camera.near = 0.5;
                child.shadow.camera.far = 25;
                child.shadow.bias = -0.0003;
              } else if (child instanceof THREE.PointLight) {
                child.shadow.mapSize.width = 512;
                child.shadow.mapSize.height = 512;
                child.shadow.camera.near = 0.5;
                child.shadow.camera.far = 15;
                child.shadow.bias = -0.0005;
              }
            }
          }
        });

        if (gltf.animations && gltf.animations.length > 0) {
          const sceneMixer = new THREE.AnimationMixer(gltf.scene);
          this.mixers.push(sceneMixer);
          const sceneAction = sceneMixer.clipAction(gltf.animations[0]);
          sceneAction.play();
        }

        this.navbarScene.add(gltf.scene);
        
        // Initialiser les lumières après avoir ajouté tous les objets
        this.refreshLights();
      },
      undefined,
      (err: unknown) => {
        console.error('Error loading navbar_scene:', err);
      }
    );
  }

  initBackground(canvas: HTMLCanvasElement) {
    this.backgroundScene = new THREE.Scene();
    this.backgroundCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    
    this.backgroundCamera.position.set(0, 0, 5);

    // Configuration du renderer avec support basique des ombres
    this.backgroundRenderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      alpha: true,
      antialias: false,
      precision: 'lowp',
      powerPreference: 'low-power'
    });
    this.backgroundRenderer.setSize(window.innerWidth, window.innerHeight);
    this.backgroundRenderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    
    // Activer les ombres pour le renderer de fond, mais utiliser un type plus léger pour la performance
    this.backgroundRenderer.shadowMap.enabled = true;
    this.backgroundRenderer.shadowMap.type = THREE.BasicShadowMap; // Utiliser la méthode la plus légère
    this.backgroundRenderer.toneMapping = THREE.NoToneMapping;

    // Créer les objets de fond avec support des ombres
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({ // Passer à StandardMaterial pour un meilleur rendu des ombres
      color: this.currentColor.value, 
      transparent: true,
      opacity: 0.6,
      roughness: 0.7,
      metalness: 0.2
    });

    const numObjects = this.lowQualityMode ? 5 : 10;
    for (let i = 0; i < numObjects; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      // Configurer les ombres pour les objets flottants
      // Les objets plus proches projettent des ombres, les autres non (pour la performance)
      const isCloseObject = Math.abs(mesh.position.z) < 10;
      this.configureShadowsForObject(mesh, isCloseObject, true);
      
      this.backgroundScene.add(mesh);
      this.backgroundObjects.push(mesh);
    }

    // Ajouter une lumière principale avec support des ombres
    this.light = new THREE.PointLight(this.currentColor.value, 1.0);
    this.light.position.set(5, 5, 5);
    this.light.name = 'Lumière de fond';
    
    // Configurer la projection d'ombres pour la lumière principale du fond
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 512; // Qualité modérée
    this.light.shadow.mapSize.height = 512;
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 20;
    this.light.shadow.bias = -0.001;
    
    this.backgroundScene.add(this.light);

    // Ajouter une lumière ambiante
    const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
    ambientLight.name = 'Ambiance de fond';
    this.backgroundScene.add(ambientLight);

    // Initialiser les lumières
    this.refreshLights();
  }

  // ANIMATION ET RENDU

  updateMousePosition(mouseX: number, mouseY: number) {
    if (this.navbarScene) {
      const navbar = document.querySelector('.navbar') as HTMLElement;
      const isLarge = navbar && !navbar.classList.contains('shrink-navbar');
      
      if (isLarge) {
        // Réduire la sensibilité de rotation
        this.targetRotationY = mouseX * 0.2;
        this.targetRotationX = mouseY * 0.1;
      } else {
        this.targetRotationX = 0;
        this.targetRotationY = 0;
      }
    }
  }

  animate(time: number = 0) {
    requestAnimationFrame(this.animate.bind(this));

    // Limiter la fréquence de mise à jour des animations
    const currentTime = performance.now();
    const timeDiff = currentTime - this.lastAnimationTime;
    const frameInterval = 1000 / this.animationFrameRate;
    
    if (timeDiff > frameInterval) {
      this.lastAnimationTime = currentTime - (timeDiff % frameInterval);
      
      const delta = this.clock.getDelta();
      
      // Mise à jour de toutes les animations
      this.mixers.forEach(mixer => {
        if (mixer) mixer.update(delta);
      });

      if (this.navbarScene && this.navbarCamera && this.navbarRenderer) {
        this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.03;
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.03;

        const isLarge = this.navbarElement && !this.navbarElement.classList.contains('shrink-navbar');

        if (isLarge) {
          const timeSec = currentTime * 0.001;
          this.navbarScene.rotation.x = this.currentRotationX;
          this.navbarScene.rotation.y = this.currentRotationY;
          this.navbarScene.position.y = Math.sin(timeSec * 0.3) * 0.1;
          
          // Activer le rendu des ombres lorsque la navbar est étendue et visible
          if (this.navbarRenderer.shadowMap.enabled !== true) {
            this.navbarRenderer.shadowMap.enabled = true;
            // Forcer un rafraîchissement des ombres
            this.navbarScene.traverse(obj => {
              if (obj instanceof THREE.Light && obj.shadow && obj.shadow.map) {
                obj.shadow.needsUpdate = true;
              }
            });
          }
        } else {
          this.navbarScene.position.y = THREE.MathUtils.lerp(this.navbarScene.position.y, 0, 0.05);
          this.navbarScene.rotation.x = THREE.MathUtils.lerp(this.navbarScene.rotation.x, 0, 0.05);
          this.navbarScene.rotation.y = THREE.MathUtils.lerp(this.navbarScene.rotation.y, 0, 0.05);
          
          // Désactiver temporairement les ombres dans la navbar réduite pour économiser des performances
          if (this.lowQualityMode && this.navbarRenderer.shadowMap.enabled !== false) {
            this.navbarRenderer.shadowMap.enabled = false;
          }
        }

        this.navbarRenderer.render(this.navbarScene, this.navbarCamera);
      }

      if (this.backgroundRenderer && this.backgroundScene && this.backgroundCamera) {
        const timeSec = currentTime * 0.001;
        const animationSpeed = 0.005;
        
        for (let i = 0; i < this.backgroundObjects.length; i++) {
          if (this.lowQualityMode && i % 2 !== 0) continue;
          
          const obj = this.backgroundObjects[i];
          const offset = i * 0.1;
          obj.rotation.x += animationSpeed;
          obj.rotation.y += animationSpeed;
          obj.position.y = Math.sin(timeSec * 0.3 + offset) * 0.3;
          obj.position.x = Math.cos(timeSec * 0.3 + offset) * 0.3;
        }

        // Optimisation: Désactiver temporairement les ombres dans les scènes de fond
        // en mode basse qualité pour améliorer les performances
        if (this.lowQualityMode) {
          this.backgroundRenderer.shadowMap.enabled = false;
        }

        this.backgroundRenderer.render(this.backgroundScene, this.backgroundCamera);
      }
    }
  }

  // GESTION DU REDIMENSIONNEMENT

  onResize() {
    if (this.navbarCamera && this.navbarRenderer) {
      const CANVAS_HEIGHT = window.innerHeight;
      this.navbarCamera.aspect = window.innerWidth / CANVAS_HEIGHT;
      this.navbarCamera.updateProjectionMatrix();
      this.navbarRenderer.setSize(window.innerWidth, CANVAS_HEIGHT);
    }

    if (this.backgroundCamera && this.backgroundRenderer) {
      this.backgroundCamera.aspect = window.innerWidth / window.innerHeight;
      this.backgroundCamera.updateProjectionMatrix();
      this.backgroundRenderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // NETTOYAGE DES RESSOURCES

  dispose() {
    this.backgroundObjects.forEach(obj => {
      obj.geometry.dispose();
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    });
    
    if (this.navbarRenderer) {
      this.navbarRenderer.dispose();
    }
    if (this.backgroundRenderer) {
      this.backgroundRenderer.dispose();
    }
  }

  // PERFORMANCE

  setLowQualityMode(enabled: boolean) {
    this.lowQualityMode = enabled;
    
    // Ajuster la densité de pixels des renderers
    if (this.navbarRenderer) {
      this.navbarRenderer.setPixelRatio(enabled ? 1.0 : Math.min(1.5, window.devicePixelRatio));
      
      // Ajuster la qualité des ombres
      if (enabled) {
        this.navbarRenderer.shadowMap.type = THREE.BasicShadowMap;
      } else {
        this.navbarRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    }
    
    if (this.backgroundRenderer) {
      this.backgroundRenderer.setPixelRatio(enabled ? 1.0 : Math.min(1.5, window.devicePixelRatio));
      
      // En basse qualité, désactiver complètement les ombres pour la scène de fond
      this.backgroundRenderer.shadowMap.enabled = !enabled;
    }
    
    // Ajuster le taux de rafraîchissement des animations
    this.animationFrameRate = enabled ? 24 : 30;
    
    // Gérer la visibilité des objets de fond
    if (this.backgroundObjects.length > 5) {
      for (let i = 5; i < this.backgroundObjects.length; i++) {
        this.backgroundObjects[i].visible = !enabled;
      }
    }
    
    // Mettre à jour la qualité des ombres des lumières
    this.configureShadowQuality(enabled ? 'low' : 'medium');
  }

  // Configurer les ombres pour un objet (mesh)
  configureShadowsForObject(object: THREE.Object3D, castShadow: boolean = true, receiveShadow: boolean = true): void {
    if (object instanceof THREE.Mesh) {
      object.castShadow = castShadow;
      object.receiveShadow = receiveShadow;
      
      // Optimiser les matériaux pour un meilleur rendu des ombres
      if (object.material instanceof THREE.MeshStandardMaterial || 
          object.material instanceof THREE.MeshPhysicalMaterial) {
        // Ajuster légèrement la rugosité pour un meilleur rendu des ombres
        object.material.roughness = Math.max(0.2, object.material.roughness);
        object.material.needsUpdate = true;
      }
    }
    
    // Appliquer récursivement aux enfants
    object.children.forEach(child => {
      this.configureShadowsForObject(child, castShadow, receiveShadow);
    });
  }
  
  // Configurer la qualité des ombres pour le renderer
  configureShadowQuality(quality: 'low' | 'medium' | 'high' = 'medium'): void {
    if (!this.navbarRenderer && !this.backgroundRenderer) return;
    
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
    if (this.navbarRenderer) {
      this.navbarRenderer.shadowMap.enabled = true;
      this.navbarRenderer.shadowMap.type = type;
    }
    
    if (this.backgroundRenderer) {
      this.backgroundRenderer.shadowMap.enabled = true;
      this.backgroundRenderer.shadowMap.type = type;
    }
    
    // Mettre à jour les paramètres de qualité des ombres sur toutes les lumières
    this.refreshLightShadowsQuality(shadowMapSize);
  }
  
  // Rafraîchir la qualité des ombres pour toutes les lumières
  private refreshLightShadowsQuality(shadowMapSize: number): void {
    const updateLight = (light: THREE.Light) => {
      if ((light instanceof THREE.DirectionalLight || 
           light instanceof THREE.SpotLight || 
           light instanceof THREE.PointLight) && 
          light.castShadow) {
        light.shadow.mapSize.width = shadowMapSize;
        light.shadow.mapSize.height = shadowMapSize;
        
        // Paramètres spécifiques aux lumières directionnelles
        if (light instanceof THREE.DirectionalLight) {
          // Améliorer la qualité et la précision de la caméra d'ombre
          const d = 15;
          light.shadow.camera.left = -d;
          light.shadow.camera.right = d;
          light.shadow.camera.top = d;
          light.shadow.camera.bottom = -d;
          light.shadow.camera.near = 0.5;
          light.shadow.camera.far = 50;
          light.shadow.bias = -0.0005;
        }
        
        // Paramètres pour les point lights
        if (light instanceof THREE.PointLight) {
          light.shadow.camera.near = 0.5;
          light.shadow.camera.far = 25;
          light.shadow.bias = -0.001;
        }
        
        // Mettre à jour la caméra d'ombre
        if (light.shadow.camera instanceof THREE.PerspectiveCamera || 
            light.shadow.camera instanceof THREE.OrthographicCamera) {
          light.shadow.camera.updateProjectionMatrix();
        }
        
        // Forcer la mise à jour de la shadowMap
        if (light.shadow.map) {
          light.shadow.map.dispose();
          light.shadow.map = null as any;
        }
      }
    };
    
    // Parcourir toutes les lumières des deux scènes
    if (this.navbarScene) {
      this.navbarScene.traverse(obj => {
        if (obj instanceof THREE.Light) updateLight(obj);
      });
    }
    
    if (this.backgroundScene) {
      this.backgroundScene.traverse(obj => {
        if (obj instanceof THREE.Light) updateLight(obj);
      });
    }
  }
}
