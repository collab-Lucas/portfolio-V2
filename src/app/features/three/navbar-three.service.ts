import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ReplaySubject, Observable, fromEvent, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { LightService } from './light.service';
import { AnimationService } from './animation.service';
import { CommonThreeService } from '../../shared/utils/common-three.service';

@Injectable({ providedIn: 'root' })
export class NavbarThreeService implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private isAnimating = false;
  private loadedModel: THREE.Object3D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private currentAnimationId: number | null = null;

  // Observables
  private isInitializedSubject = new ReplaySubject<boolean>(1);
  public isInitialized$ = this.isInitializedSubject.asObservable();

  // Gestionnaire de redimensionnement
  private resizeSubscription = fromEvent(window, 'resize').pipe(
    debounceTime(100),
    distinctUntilChanged()
  ).subscribe(() => this.onWindowResize());

  constructor(
    private lightService: LightService,
    private animationService: AnimationService,
    private commonThreeService: CommonThreeService
  ) {
    this.initializeScene();
  }

  /**
   * Initialise la scène Three.js pour la navbar
   */
  private initializeScene(): void {
    // Créer la scène
    this.scene = this.commonThreeService.setupScene({
      fog: { color: 0x000000, near: 1, far: 1000 }
    });

    // Créer la caméra
    this.camera = this.commonThreeService.setupCamera({
      fov: 50,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 1000,
      position: { x: 0, y: 0, z: 8 }
    });

    this.setupLighting();
    this.isInitializedSubject.next(true);
  }

  /**
   * Configure l'éclairage de la scène
   */
  private setupLighting(): void {
    // Lumière directionnelle principale
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.name = 'navbar-directional-main';
    
    this.scene.add(directionalLight);

    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    ambientLight.name = 'navbar-ambient';
    this.scene.add(ambientLight);

    // Enregistrer les lumières dans le service
    this.lightService.addLight({
      name: 'navbar-directional-main',
      type: 'DirectionalLight',
      intensity: 0.6,
      color: '#ffffff',
      enabled: true,
      position: { x: 5, y: 5, z: 5 },
      castShadow: true,
      scene: 'navbar'
    });

    this.lightService.addLight({
      name: 'navbar-ambient',
      type: 'AmbientLight',
      intensity: 0.3,
      color: '#404040',
      enabled: true,
      scene: 'navbar'
    });

    // Enregistrer la scène dans le service de lumières
    this.lightService.registerScene(this.scene, 'navbar');
  }

  /**
   * Configure le canvas et le renderer
   * @param canvas Élément canvas HTML
   */
  initializeRenderer(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    
    this.renderer = this.commonThreeService.createRenderer(canvas, {
      alpha: true,
      antialias: true,
      shadowMapEnabled: true,
      shadowMapType: THREE.PCFSoftShadowMap
    });

    this.startRenderLoop();
  }

  /**
   * Charge un modèle 3D
   * @param modelPath Chemin vers le modèle
   */
  loadModel(modelPath: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      
      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          
          // Configuration du modèle
          model.scale.setScalar(0.8);
          model.position.set(0, 0, 0);

          // Configurer les ombres et matériaux
          this.commonThreeService.configureShadowsForObject(model);
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              this.commonThreeService.configureTorus(child);
            }
          });

          // Ajouter à la scène
          if (this.loadedModel) {
            this.scene.remove(this.loadedModel);
          }
          
          this.scene.add(model);
          this.loadedModel = model;

          // Configurer les animations si disponibles
          if (gltf.animations && gltf.animations.length > 0) {
            this.animationService.setupGLTFAnimations(gltf, true);
          }

          resolve(model);
        },
        (progress) => {
          console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          console.error('Error loading model:', error);
          reject(error);
        }
      );
    });
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
        this.render();
        
        // Animation de rotation du modèle si chargé
        if (this.loadedModel && this.isAnimating) {
          this.loadedModel.rotation.y += delta * 0.5;
        }
      },
      60 // 60 FPS
    );
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
   * Active/désactive l'animation de rotation
   * @param animate État de l'animation
   */
  setAnimating(animate: boolean): void {
    this.isAnimating = animate;
  }

  /**
   * Anime le modèle vers une nouvelle position/rotation
   * @param targetProps Propriétés cibles
   * @param duration Durée de l'animation en millisecondes
   */
  animateModel(targetProps: any, duration: number = 1000): void {
    if (this.loadedModel) {
      this.animationService.animateObject(this.loadedModel, targetProps, {
        duration,
        easing: (t) => t * t * (3 - 2 * t) // Smooth step
      });
    }
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
   * Obtient la scène Three.js
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
   * Obtient le modèle chargé
   */
  getLoadedModel(): THREE.Object3D | null {
    return this.loadedModel;
  }

  /**
   * Nettoyage des ressources
   */
  dispose(): void {
    if (this.currentAnimationId !== null) {
      this.animationService.stopAnimationLoop(this.currentAnimationId);
      this.currentAnimationId = null;
    }

    if (this.loadedModel) {
      this.commonThreeService.disposeObject(this.loadedModel);
      this.scene.remove(this.loadedModel);
      this.loadedModel = null;
    }

    if (this.scene) {
      this.commonThreeService.disposeScene(this.scene);
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    this.resizeSubscription.unsubscribe();
    this.isInitializedSubject.complete();
  }

  ngOnDestroy(): void {
    this.dispose();
  }
}
