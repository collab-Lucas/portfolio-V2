import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { fromEvent } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

import { LightService } from './light.service';
import { AnimationService } from './animation.service';
import { CommonThreeService } from '../../shared/utils/common-three.service';

interface QualitySettings {
  prismCount: number;
  sphereSegments: number;
  shadowMapSize: number;
  pixelRatio: number;
  enableShadows: boolean;
  enableAntialiasing: boolean;
}

const QUALITY_PRESETS: Record<string, QualitySettings> = {
  low: { prismCount: 20, sphereSegments: 16, shadowMapSize: 512, pixelRatio: 0.5, enableShadows: false, enableAntialiasing: false },
  medium: { prismCount: 50, sphereSegments: 32, shadowMapSize: 1024, pixelRatio: 1, enableShadows: true, enableAntialiasing: true },
  high: { prismCount: 100, sphereSegments: 32, shadowMapSize: 2048, pixelRatio: 1.5, enableShadows: true, enableAntialiasing: true }
};

@Injectable({ providedIn: 'root' })
export class BackgroundThreeService implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private models: { [key: string]: THREE.Group } = {};
  private loader = new GLTFLoader();
  private initialized = false;
  private currentAnimationId: number | null = null;

  // Performance et qualité
  private qualityLevel: 'low' | 'medium' | 'high' = 'medium';
  private qualitySettings: QualitySettings = QUALITY_PRESETS['medium'];

  // Animation et interaction
  private mouseX = 0;
  private mouseY = 0;
  private animationTime = 0;
  private cameraTargetPosition = new THREE.Vector3(-3, 0, 300);
  private cameraTargetRotationY = THREE.MathUtils.degToRad(-3.69);

  // Subscriptions
  private mouseSubscription = fromEvent<MouseEvent>(document, 'mousemove').pipe(
    throttleTime(16) // ~60fps
  ).subscribe((event) => this.onMouseMove(event));

  private resizeSubscription = fromEvent(window, 'resize').pipe(
    debounceTime(100)
  ).subscribe(() => this.onWindowResize());

  constructor(
    private lightService: LightService,
    private animationService: AnimationService,
    private commonThreeService: CommonThreeService
  ) {
    this.detectPerformanceLevel();
  }

  /**
   * Initialise la scène de fond
   */
  init(canvas: HTMLCanvasElement): void {
    if (!canvas || this.initialized) return;

    this.initializeScene(canvas);
    this.setupLights();
    this.loadModels();
    this.createEnvironment();
    this.setupQualitySettings();
    this.startRenderLoop();

    this.initialized = true;
  }

  /**
   * Initialise la scène Three.js
   */
  private initializeScene(canvas: HTMLCanvasElement): void {
    // Créer la scène
    this.scene = this.commonThreeService.setupScene({
      fog: { color: 0x111111, near: 100, far: 1000 }
    });

    // Créer la caméra
    this.camera = this.commonThreeService.setupCamera({
      fov: 75,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 1000,
      position: { x: -3, y: 0, z: 300 }
    });

    // Créer le renderer
    this.renderer = this.commonThreeService.createRenderer(canvas, {
      alpha: true,
      antialias: this.qualitySettings.enableAntialiasing,
      shadowMapEnabled: this.qualitySettings.enableShadows,
      shadowMapType: THREE.PCFSoftShadowMap
    });
  }

  /**
   * Configure l'éclairage de la scène
   */
  private setupLights(): void {
    // Lumière directionnelle principale
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = this.qualitySettings.enableShadows;
    directionalLight.name = 'background-directional-main';
    
    if (this.qualitySettings.enableShadows) {
      directionalLight.shadow.mapSize.width = this.qualitySettings.shadowMapSize;
      directionalLight.shadow.mapSize.height = this.qualitySettings.shadowMapSize;
    }
    
    this.scene.add(directionalLight);

    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    ambientLight.name = 'background-ambient';
    this.scene.add(ambientLight);

    // Lumière d'accent
    const accentLight = new THREE.PointLight(0x00aaff, 0.5, 100);
    accentLight.position.set(-50, 0, 50);
    accentLight.name = 'background-accent';
    this.scene.add(accentLight);

    // Enregistrer les lumières dans le service
    this.lightService.addLight({
      name: 'background-directional-main',
      type: 'DirectionalLight',
      intensity: 0.8,
      color: '#ffffff',
      enabled: true,
      position: { x: 10, y: 10, z: 5 },
      castShadow: this.qualitySettings.enableShadows,
      scene: 'background'
    });

    this.lightService.addLight({
      name: 'background-ambient',
      type: 'AmbientLight',
      intensity: 0.4,
      color: '#404040',
      enabled: true,
      scene: 'background'
    });

    this.lightService.addLight({
      name: 'background-accent',
      type: 'PointLight',
      intensity: 0.5,
      color: '#00aaff',
      enabled: true,
      position: { x: -50, y: 0, z: 50 },
      scene: 'background'
    });

    // Enregistrer la scène dans le service de lumières
    this.lightService.registerScene(this.scene, 'background', this.renderer);
  }

  /**
   * Charge les modèles 3D
   */
  private loadModels(): void {
    const modelPaths = [
      '/assets/models/scene_fond.glb',
      '/assets/models/prisme.glb'
    ];

    modelPaths.forEach((path, index) => {
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          
          // Configuration selon le modèle
          if (path.includes('scene_fond')) {
            model.scale.setScalar(1);
            model.position.set(0, 0, 0);
            this.models['background'] = model;
          } else if (path.includes('prisme')) {
            model.scale.setScalar(0.5);
            model.position.set(0, 0, -50);
            this.models['prism'] = model;
          }

          // Configurer les ombres et matériaux
          this.commonThreeService.configureShadowsForObject(model);
          
          this.scene.add(model);

          // Configurer les animations si disponibles
          if (gltf.animations && gltf.animations.length > 0) {
            this.animationService.setupGLTFAnimations(gltf, true);
          }
        },
        (progress) => {
          console.log(`Loading ${path}: ${(progress.loaded / progress.total * 100)}%`);
        },
        (error) => {
          console.error(`Error loading ${path}:`, error);
        }
      );
    });
  }

  /**
   * Crée l'environnement de la scène
   */
  private createEnvironment(): void {
    // Créer des particules ou objets de fond selon la qualité
    const particleCount = this.qualitySettings.prismCount;
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(
        Math.random() * 2 + 0.5,
        this.qualitySettings.sphereSegments,
        this.qualitySettings.sphereSegments
      );
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5),
        roughness: 0.4,
        metalness: 0.6
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200
      );
      
      if (this.qualitySettings.enableShadows) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      
      this.scene.add(mesh);
    }
  }

  /**
   * Détecte le niveau de performance de l'appareil
   */
  private detectPerformanceLevel(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    
    if (isMobile || isLowEndDevice) {
      this.qualityLevel = 'low';
    } else if (window.innerWidth < 1920) {
      this.qualityLevel = 'medium';
    } else {
      this.qualityLevel = 'high';
    }
    
    this.qualitySettings = QUALITY_PRESETS[this.qualityLevel];
  }

  /**
   * Configure les paramètres de qualité
   */
  private setupQualitySettings(): void {
    this.renderer.setPixelRatio(Math.min(this.qualitySettings.pixelRatio, window.devicePixelRatio));
    
    if (this.qualitySettings.enableShadows) {
      this.renderer.shadowMap.enabled = true;
    }
  }

  /**
   * Démarre la boucle de rendu
   */
  private startRenderLoop(): void {
    if (this.currentAnimationId !== null) {
      this.animationService.stopAnimationLoop(this.currentAnimationId);
    }

    this.currentAnimationId = this.animationService.startAnimationLoop(
      (time: number, delta: number) => {
        this.animationTime += delta;
        this.updateCamera(delta);
        this.animateModels(delta);
        this.render();
      },
      60 // 60 FPS
    );
  }

  /**
   * Met à jour la position de la caméra
   */
  private updateCamera(delta: number): void {
    // Animation fluide de la caméra basée sur la souris
    const targetX = this.cameraTargetPosition.x + (this.mouseX - this.cameraTargetPosition.x) * 0.01;
    const targetY = this.cameraTargetPosition.y + (this.mouseY - this.cameraTargetPosition.y) * 0.01;
    
    this.camera.position.x += (targetX - this.camera.position.x) * 0.02;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.02;
    
    // Rotation légère
    this.camera.rotation.y += (this.cameraTargetRotationY - this.camera.rotation.y) * 0.02;
  }

  /**
   * Anime les modèles chargés
   */
  private animateModels(delta: number): void {
    // Animation du prisme
    if (this.models['prism']) {
      this.models['prism'].rotation.x += delta * 0.5;
      this.models['prism'].rotation.y += delta * 0.3;
    }

    // Animation des sphères
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry instanceof THREE.SphereGeometry) {
        object.rotation.x += delta * 0.2;
        object.rotation.y += delta * 0.1;
        object.position.y += Math.sin(this.animationTime + object.position.x) * 0.01;
      }
    });
  }

  /**
   * Fonction de rendu
   */
  private render(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Gère le mouvement de la souris
   */
  private onMouseMove(event: MouseEvent): void {
    this.mouseX = (event.clientX - window.innerWidth / 2) * 0.1;
    this.mouseY = (event.clientY - window.innerHeight / 2) * 0.1;
  }

  /**
   * Gère le redimensionnement de la fenêtre
   */
  private onWindowResize(): void {
    if (!this.camera || !this.renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Change le niveau de qualité
   */
  setQualityLevel(level: 'low' | 'medium' | 'high'): void {
    this.qualityLevel = level;
    this.qualitySettings = QUALITY_PRESETS[level];
    this.setupQualitySettings();
  }

  /**
   * Obtient la scène
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Obtient la caméra
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Obtient le renderer
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Nettoyage des ressources
   */
  dispose(): void {
    if (this.currentAnimationId !== null) {
      this.animationService.stopAnimationLoop(this.currentAnimationId);
      this.currentAnimationId = null;
    }

    // Nettoyer les modèles
    Object.values(this.models).forEach(model => {
      this.commonThreeService.disposeObject(model);
      this.scene.remove(model);
    });
    this.models = {};

    // Nettoyer la scène
    if (this.scene) {
      this.commonThreeService.disposeScene(this.scene);
    }

    // Nettoyer le renderer
    if (this.renderer) {
      this.renderer.dispose();
    }

    // Nettoyer les subscriptions
    this.mouseSubscription.unsubscribe();
    this.resizeSubscription.unsubscribe();
  }

  ngOnDestroy(): void {
    this.dispose();
  }
}
