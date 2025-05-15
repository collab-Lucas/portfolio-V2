import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BehaviorSubject, Observable } from 'rxjs';

// Interface pour la gestion des lumières
export interface LightInfo {
  light: THREE.Light;
  name: string;
  type: string;
  scene: 'navbar' | 'background';
}

@Injectable({
  providedIn: 'root'
})
export class ThreeService {
  private currentColor = new BehaviorSubject<string>('#66ccff');
  
  // Liste de toutes les lumières dans les scènes
  private lights: LightInfo[] = [];
  private lightsSubject = new BehaviorSubject<LightInfo[]>([]);

  // Scene properties
  private navbarScene!: THREE.Scene;
  private navbarCamera!: THREE.PerspectiveCamera;
  private navbarRenderer!: THREE.WebGLRenderer;
  private mixer: THREE.AnimationMixer | null = null;
  private animations: THREE.AnimationClip[] = [];
  private clock = new THREE.Clock();

  private backgroundScene!: THREE.Scene;
  private backgroundCamera!: THREE.PerspectiveCamera;
  private backgroundRenderer!: THREE.WebGLRenderer;
  private backgroundObjects: THREE.Mesh[] = [];
    // Lights
  private light!: THREE.PointLight;
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
  private animationFrameRate = 24; // Frames per second for animation updates
  private lastAnimationTime = 0;

  constructor() {
    this.navbarElement = document.querySelector('.navbar');
  }

  // Méthode pour obtenir la liste des lumières
  getLights(): Observable<LightInfo[]> {
    return this.lightsSubject.asObservable();
  }

  // Méthode pour initialiser et nommer les lumières dans la scène
  initializeLights(): void {
    // Réinitialiser la liste des lumières
    this.clearLights();
    
    // Parcourir les lumières de la scène navbar et les ajouter à la liste
    if (this.navbarScene) {
      this.navbarScene.traverse((object) => {
        if (object instanceof THREE.Light) {
          this.addLight(object, 'navbar');
        }
      });
    }
    
    // Parcourir les lumières de la scène background et les ajouter à la liste
    if (this.backgroundScene) {
      this.backgroundScene.traverse((object) => {
        if (object instanceof THREE.Light) {
          this.addLight(object, 'background');
        }
      });
    }
    this.lightsSubject.next([...this.lights]);
  }

  // Méthode pour ajouter une lumière à la liste
  private addLight(light: THREE.Light, scene: 'navbar' | 'background'): void {
    const type = this.getLightTypeName(light);
    const sameTypeCount = this.lights.filter(l => l.type === type).length + 1;
    const name = `${type} ${sameTypeCount}`;
    light.name = name;
    
    // Ajouter à la liste
    const lightInfo: LightInfo = {
      light,
      name,
      type,
      scene
    };
    
    this.lights.push(lightInfo);
    this.lightsSubject.next([...this.lights]);
  }
  
  // Méthode pour obtenir un nom lisible pour le type de lumière
  private getLightTypeName(light: THREE.Light): string {
    if (light instanceof THREE.AmbientLight) return 'Ambient';
    if (light instanceof THREE.DirectionalLight) return 'Directional';
    if (light instanceof THREE.PointLight) return 'Point';
    if (light instanceof THREE.SpotLight) return 'Spot';
    if (light instanceof THREE.HemisphereLight) return 'Hemisphere';
    if (light instanceof THREE.RectAreaLight) return 'RectArea';
    return 'Light';
  }
  
  // Méthode pour trouver une lumière par son nom
  findLightByName(name: string): LightInfo | undefined {
    return this.lights.find(light => light.name === name);
  }
  
  // Méthode pour mettre à jour les propriétés d'une lumière
  updateLight(name: string, properties: { color?: string; intensity?: number; visible?: boolean }): void {
    const lightInfo = this.findLightByName(name);
    if (!lightInfo) return;
    
    const { light } = lightInfo;
    
    if (properties.color !== undefined) {
      light.color.set(properties.color);
    }
    
    if (properties.intensity !== undefined && 'intensity' in light) {
      light.intensity = properties.intensity;
    }
    
    if (properties.visible !== undefined) {
      light.visible = properties.visible;
    }
  }
  
  // Nettoyer la liste des lumières
  clearLights(): void {
    this.lights = [];
    this.lightsSubject.next([]);
  }

  // Méthodes génériques pour contrôler toutes les lumières
  setLightIntensity(lightName: string, intensity: number): void {
    // Utiliser la méthode updateLight pour modifier l'intensité
    this.updateLight(lightName, { intensity });
  }

  setLightColor(lightName: string, color: string): void {
    // Utiliser la méthode updateLight pour modifier la couleur
    this.updateLight(lightName, { color });
  }

  getCurrentColor() {
    return this.currentColor.asObservable();
  }

  setCurrentColor(color: string) {
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

  setLightVisibility(lightName: string, visible: boolean) {
    // Essayer d'abord de trouver la lumière dans notre liste par son nom
    const lightInfo = this.findLightByName(lightName);
    if (lightInfo) {
      lightInfo.light.visible = visible;
      return;
    }
  }

  private configureImportedLights(object: THREE.Object3D) {
    if (object instanceof THREE.Light) {
      // Convertir la couleur de la lumière pour qu'elle corresponde aux valeurs réelles
      if (object.color) {
        const realColorValue = this.convertToRealLightValue(object.color.getHex());
        object.color.set(realColorValue);
      }
      
      // Activer les ombres si c'est une lumière qui peut en projeter
      if (object instanceof THREE.DirectionalLight || object instanceof THREE.SpotLight) {
        object.castShadow = true;
        if (object.shadow) {
          object.shadow.mapSize.width = 1024;
          object.shadow.mapSize.height = 1024;
        }
      }
      
      // Ajouter la lumière à notre liste
      this.addLight(object, 'navbar');
    }
  }

  // Méthode pour convertir les valeurs de couleur des lumières en valeurs réelles
  private convertToRealLightValue(colorValue: number | string): number | string {
    // Si la valeur est une chaîne (ex: "#ff0000"), la convertir en nombre
    let numericColor: number;
    if (typeof colorValue === 'string') {
      // Supprimer le # si présent
      const colorStr = colorValue.startsWith('#') ? colorValue.substring(1) : colorValue;
      numericColor = parseInt(colorStr, 16);
    } else {
      numericColor = colorValue;
    }

    // Retourner le format d'origine sans transformation
    if (typeof colorValue === 'string') {
      return '#' + numericColor.toString(16).padStart(6, '0');
    }
    return numericColor;
  }

  initNavbar(canvas: HTMLCanvasElement) {
    this.navbarScene = new THREE.Scene();
    this.navbarScene.background = null;
    
    // Utiliser la hauteur de la fenêtre pour le canvas initial
    const CANVAS_HEIGHT = window.innerHeight;
    
    this.navbarRenderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      alpha: true,
      antialias: false, // Désactiver l'antialiasing pour améliorer les performances
      precision: 'lowp', // Utiliser une précision basse pour le rendu
      powerPreference: 'low-power' // Optimiser pour l'économie d'énergie
    });
    this.navbarRenderer.setSize(window.innerWidth, CANVAS_HEIGHT);
    this.navbarRenderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio)); // Limiter le pixel ratio
    this.navbarRenderer.shadowMap.enabled = false; // Désactiver les ombres pour améliorer les performances
    this.navbarRenderer.toneMapping = THREE.NoToneMapping; // Désactiver le tone mapping
    this.initializeLights();

    // Chargement du modèle GLB avec sa caméra
    const loader = new GLTFLoader();
    loader.load(
      'assets/models/scene_navbar.glb',
      (gltf: GLTF) => {
        // Désactiver les ombres pour tous les objets
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            
            // Simplifier les matériaux si possible
            if (child.material) {
              if (child.material instanceof THREE.MeshStandardMaterial) {
                // Convertir en MeshLambertMaterial pour de meilleures performances
                const color = child.material.color.clone();
                const map = child.material.map;
                child.material.dispose();
                child.material = new THREE.MeshLambertMaterial({ 
                  color: color, 
                  map: map 
                });
              }
            }
          }
          
          // Chercher une caméra dans le modèle
          if (child instanceof THREE.Camera) {
            this.navbarCamera = child as THREE.PerspectiveCamera;
            this.navbarCamera.aspect = window.innerWidth / CANVAS_HEIGHT;
            this.navbarCamera.updateProjectionMatrix();
          }
        });

        // Configurer les animations - limiter le nombre d'animations actives
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(gltf.scene);
          this.animations = gltf.animations;
          
          // Ne jouer que la première animation pour économiser des ressources
          if (this.mixer && this.animations.length > 0) {
            const action = this.mixer.clipAction(this.animations[0]);
            action.play();
          }
        }
        
        // Ajuster la position et l'échelle du modèle
        gltf.scene.scale.setScalar(2.0);
        gltf.scene.position.y = 0;
        
        this.navbarScene.add(gltf.scene);
      },
      undefined,
      (err: unknown) => {
        console.error('Error loading GLB model:', err);
      }
    );
  }

  initBackground(canvas: HTMLCanvasElement) {
    this.backgroundScene = new THREE.Scene();
    this.backgroundCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100 // Réduire la distance de rendu
    );
    
    this.backgroundCamera.position.set(0, 0, 5);

    this.backgroundRenderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      alpha: true,
      antialias: false, // Désactiver l'antialiasing
      precision: 'lowp', // Utiliser une précision basse
      powerPreference: 'low-power'
    });
    this.backgroundRenderer.setSize(window.innerWidth, window.innerHeight);
    this.backgroundRenderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio)); // Limiter le pixel ratio
    this.backgroundRenderer.toneMapping = THREE.NoToneMapping; // Désactiver le tone mapping

    // Utiliser une géométrie plus simple (moins de segments)
    const geometry = new THREE.IcosahedronGeometry(1, 0); // Réduire la complexité
    
    // Utiliser un matériau moins coûteux
    const material = new THREE.MeshLambertMaterial({ 
      color: this.currentColor.value, 
      transparent: true,
      opacity: 0.6
    });

    // Réduire le nombre d'objets
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
      this.backgroundScene.add(mesh);
      this.backgroundObjects.push(mesh);
    }
    // Initialiser la liste des lumières après avoir ajouté toutes les lumières à la scène
    this.initializeLights();
  }

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
      if (this.mixer) {
        this.mixer.update(delta);
      }

      if (this.navbarScene && this.navbarCamera && this.navbarRenderer) {
        this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.03; // Ralentir l'interpolation
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.03;

        const isLarge = this.navbarElement && !this.navbarElement.classList.contains('shrink-navbar');

        if (isLarge) {
          const timeSec = currentTime * 0.001;
          this.navbarScene.rotation.x = this.currentRotationX;
          this.navbarScene.rotation.y = this.currentRotationY;
          // Réduire l'amplitude de l'animation
          this.navbarScene.position.y = Math.sin(timeSec * 0.3) * 0.1;
        } else {
          this.navbarScene.position.y = THREE.MathUtils.lerp(this.navbarScene.position.y, 0, 0.05);
          this.navbarScene.rotation.x = THREE.MathUtils.lerp(this.navbarScene.rotation.x, 0, 0.05);
          this.navbarScene.rotation.y = THREE.MathUtils.lerp(this.navbarScene.rotation.y, 0, 0.05);
        }

        this.navbarRenderer.render(this.navbarScene, this.navbarCamera);
      }

      if (this.backgroundRenderer && this.backgroundScene && this.backgroundCamera) {
        const timeSec = currentTime * 0.001;

        // Animer uniquement un sous-ensemble des objets ou animer plus lentement
        const animationSpeed = 0.005; // Ralenti
        
        for (let i = 0; i < this.backgroundObjects.length; i++) {
          // Ne pas animer tous les objets si en mode basse qualité
          if (this.lowQualityMode && i % 2 !== 0) continue;
          
          const obj = this.backgroundObjects[i];
          const offset = i * 0.1;
          obj.rotation.x += animationSpeed;
          obj.rotation.y += animationSpeed;
          obj.position.y = Math.sin(timeSec * 0.3 + offset) * 0.3;
          obj.position.x = Math.cos(timeSec * 0.3 + offset) * 0.3;
        }

        this.backgroundRenderer.render(this.backgroundScene, this.backgroundCamera);
      }
    }
  }

  onResize() {
    if (this.navbarCamera && this.navbarRenderer) {
      // Toujours utiliser la hauteur totale de la fenêtre
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

  getAllLights() {
    const lights = [];

    // Lumières de la navbar
    if (this.ambientLight) {
      lights.push({
        name: 'Lumière ambiante',
        type: 'AmbientLight',
        intensity: this.ambientLight.intensity,
        color: '#' + this.ambientLight.color.getHexString(),
        enabled: this.ambientLight.visible
      });
    }

    if (this.directionalLight) {
      lights.push({
        name: 'Lumière directionnelle',
        type: 'DirectionalLight',
        intensity: this.directionalLight.intensity,
        color: '#' + this.directionalLight.color.getHexString(),
        position: {
          x: this.directionalLight.position.x,
          y: this.directionalLight.position.y,
          z: this.directionalLight.position.z
        },
        castShadow: this.directionalLight.castShadow,
        enabled: this.directionalLight.visible
      });
    }

    if (this.pointLight) {
      lights.push({
        name: 'Lumière ponctuelle',
        type: 'PointLight',
        intensity: this.pointLight.intensity,
        color: '#' + this.pointLight.color.getHexString(),
        position: {
          x: this.pointLight.position.x,
          y: this.pointLight.position.y,
          z: this.pointLight.position.z
        },
        castShadow: this.pointLight.castShadow,
        enabled: this.pointLight.visible
      });
    }

    // Lumière de l'arrière-plan
    if (this.light) {
      lights.push({
        name: 'Lumière de fond',
        type: 'PointLight',
        intensity: this.light.intensity,
        color: '#' + this.light.color.getHexString(),
        position: {
          x: this.light.position.x,
          y: this.light.position.y,
          z: this.light.position.z
        },
        enabled: this.light.visible
      });
    }

    // Rechercher d'autres lumières potentielles dans la scène
    if (this.navbarScene) {
      this.navbarScene.traverse((object) => {
        if (object instanceof THREE.Light && 
            object !== this.ambientLight && 
            object !== this.directionalLight && 
            object !== this.pointLight) {
          lights.push({
            name: object.name || 'Lumière sans nom',
            type: object.type,
            intensity: object.intensity,
            color: '#' + (object as THREE.Light).color.getHexString(),
            position: object instanceof THREE.DirectionalLight || object instanceof THREE.PointLight ? {
              x: object.position.x,
              y: object.position.y,
              z: object.position.z
            } : undefined,
            castShadow: object.castShadow,
            enabled: object.visible
          });
        }
      });
    }

    if (this.backgroundScene) {
      this.backgroundScene.traverse((object) => {
        if (object instanceof THREE.Light && 
            object !== this.light) {
          lights.push({
            name: object.name || 'Lumière de fond sans nom',
            type: object.type,
            intensity: object.intensity,
            color: '#' + (object as THREE.Light).color.getHexString(),
            position: object instanceof THREE.DirectionalLight || object instanceof THREE.PointLight ? {
              x: object.position.x,
              y: object.position.y,
              z: object.position.z
            } : undefined,
            castShadow: object.castShadow,
            enabled: object.visible
          });
        }
      });
    }

    return lights;
  }

  // Méthode pour obtenir les lumières par scène
  getLightsByScene(sceneName: 'navbar' | 'background'): any[] {
    const allLights = this.getAllLights();
    
    // Filtrer les lumières basées sur leur nom qui pourrait indiquer la scène
    return allLights.filter(light => {
      // Pour les lumières avec des noms spécifiques déjà identifiés
      if (sceneName === 'navbar') {
        return light.name === 'Lumière ambiante' || 
               light.name === 'Lumière directionnelle' || 
               light.name === 'Lumière ponctuelle' ||
               // Pour les lumières ajoutées via addLight
               (light.name.includes('Ambient') || 
                light.name.includes('Directional') ||
                light.name.includes('Point')) && 
               !light.name.includes('fond');
      } else { // background
        return light.name === 'Lumière de fond' || 
               // Pour les lumières ajoutées via addLight
               light.name.includes('fond') ||
               light.type.includes('Light') && 
               (light.name.includes('background') || 
                light.name.includes('bg'));
      }
    });
  }
}
