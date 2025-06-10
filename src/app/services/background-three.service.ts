import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BehaviorSubject, Observable } from 'rxjs';
import { CommonThreeService } from './threejs/common-three.service';
import { LightService } from './threejs/light.service';
import { AnimationService } from './threejs/animation.service';

@Injectable({
  providedIn: 'root'
})
export class BackgroundThreeService {
  private backgroundScene!: THREE.Scene;
  private backgroundCamera!: THREE.PerspectiveCamera;
  private backgroundRenderer!: THREE.WebGLRenderer;
  private backgroundObjects: THREE.Mesh[] = [];
  private light!: THREE.PointLight;
  private ambientLight!: THREE.AmbientLight;
  private clock = new THREE.Clock();
  private currentColor = new BehaviorSubject<string>('#66ccff');
  private scrollPosition = new BehaviorSubject<number>(0);
  private mousePosition = new THREE.Vector2(0, 0);
  
  private animationFrameId: number | null = null;
  private lowQualityMode = false;

  constructor(
    private commonService: CommonThreeService,
    private lightService: LightService,
    private animationService: AnimationService
  ) {}

  /**
   * Initialise la scène Three.js pour le background
   * @param canvas L'élément canvas où rendre la scène
   */
  initBackground(canvas: HTMLCanvasElement) {
    // Initialisation de la scène
    this.backgroundScene = new THREE.Scene();
    
    // Configuration de la caméra
    this.backgroundCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.backgroundCamera.position.set(0, 0, 5);

    // Configuration du renderer
    this.backgroundRenderer = this.commonService.createRenderer(canvas, {
      alpha: true,
      antialias: !this.lowQualityMode,
      precision: this.lowQualityMode ? 'lowp' : 'mediump',
      powerPreference: 'low-power',
      shadowMapEnabled: true,
      shadowMapType: THREE.BasicShadowMap
    });
    
    // Configurer les lumières
    this.setupLights();
    
    // Initialiser les objets de fond
    this.initBackgroundObjects();
    
    // Démarrer l'animation
    this.animate();
  }

  /**
   * Configure les lumières pour la scène de fond
   */
  private setupLights() {
    // Lumière ambiante
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.ambientLight.name = 'Ambiance de fond';
    this.backgroundScene.add(this.ambientLight);
    
    // Lumière ponctuelle principale
    this.light = new THREE.PointLight(this.currentColor.value, 0.8);
    this.light.position.set(0, 0, 2);
    this.light.name = 'Lumière de fond';
    this.light.castShadow = true;
    this.lightService.configureShadowsForLight(this.light);
    this.backgroundScene.add(this.light);
    
    // Initialiser les lumières dans le service de lumières
    this.lightService.refreshLights([{
      scene: this.backgroundScene,
      type: 'background'
    }]);
  }

  /**
   * Initialise les objets 3D de fond
   */
  private initBackgroundObjects() {
    // Nettoyer les objets existants si nécessaire
    this.backgroundObjects.forEach(obj => this.backgroundScene.remove(obj));
    this.backgroundObjects = [];
    
    // Créer des objets géométriques
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: this.currentColor.value,
      transparent: true,
      opacity: 0.6,
      roughness: 0.7,
      metalness: 0.2
    });

    // Créer plusieurs objets et les placer dans l'espace
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
      
      // Configurer les ombres
      const isCloseObject = Math.abs(mesh.position.z) < 10;
      this.commonService.configureShadowsForObject(mesh, isCloseObject, true);
      
      this.backgroundScene.add(mesh);
      this.backgroundObjects.push(mesh);
    }
  }

  /**
   * Charger un modèle GLTF dans la scène
   * @param modelPath Chemin vers le modèle GLTF
   * @param position Position du modèle
   * @param scale Échelle du modèle
   * @param callback Callback une fois le modèle chargé
   */
  loadModel(modelPath: string, position = { x: 0, y: 0, z: 0 }, scale = 1, callback?: (model: THREE.Group) => void): void {
    const loader = new GLTFLoader();
    
    loader.load(
      modelPath,
      (gltf) => {
        // Configurer le modèle pour les ombres
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            this.commonService.configureShadowsForObject(child, true, true);
          }
        });
        
        // Configurer la position et l'échelle
        gltf.scene.position.set(position.x, position.y, position.z);
        gltf.scene.scale.set(scale, scale, scale);
        
        // Ajouter à la scène
        this.backgroundScene.add(gltf.scene);
        
        // Configurer les animations si disponibles
        if (gltf.animations && gltf.animations.length > 0) {
          const { mixer, actions } = this.animationService.setupGLTFAnimations(gltf, true);
        }
        
        // Appeler le callback si fourni
        if (callback) callback(gltf.scene);
      },
      undefined,
      (error) => console.error('Error loading model:', error)
    );
  }

  /**
   * Met à jour la position de défilement
   * @param scrollY Position de défilement vertical
   */
  updateScrollPosition(scrollY: number) {
    this.scrollPosition.next(scrollY);
  }
  
  /**
   * Obtient la position actuelle de défilement
   */
  getScrollPosition(): Observable<number> {
    return this.scrollPosition.asObservable();
  }
  
  /**
   * Met à jour la position de la souris
   * @param mouseX Position X de la souris (-1 à 1)
   * @param mouseY Position Y de la souris (-1 à 1)
   */
  updateMousePosition(mouseX: number, mouseY: number) {
    this.mousePosition.x = mouseX;
    this.mousePosition.y = mouseY;
  }

  /**
   * Définit la couleur actuelle
   * @param color Nouvelle couleur
   */
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
  
  /**
   * Obtient la couleur actuelle
   */
  getCurrentColor(): Observable<string> {
    return this.currentColor.asObservable();
  }

  /**
   * Gère le redimensionnement de la fenêtre
   */
  onResize() {
    if (!this.backgroundRenderer || !this.backgroundCamera) return;
    
    this.backgroundCamera.aspect = window.innerWidth / window.innerHeight;
    this.backgroundCamera.updateProjectionMatrix();
    this.backgroundRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Définit le mode basse qualité
   * @param enabled Activer ou non le mode basse qualité
   */
  setLowQualityMode(enabled: boolean) {
    this.lowQualityMode = enabled;
    
    if (this.backgroundRenderer) {
      this.backgroundRenderer.setPixelRatio(enabled ? 1.0 : Math.min(1.5, window.devicePixelRatio));
      this.backgroundRenderer.shadowMap.type = enabled ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    }
    
    // Gérer la visibilité des objets de fond
    if (this.backgroundObjects.length > 5) {
      for (let i = 5; i < this.backgroundObjects.length; i++) {
        this.backgroundObjects[i].visible = !enabled;
      }
    }
  }

  /**
   * Boucle d'animation principale
   */
  private animate() {
    if (!this.backgroundRenderer || !this.backgroundScene || !this.backgroundCamera) return;

    const render = () => {
      const delta = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();
      
      // Mise à jour des animations
      this.animationService.update(delta);
      
      // Animation de base des objets
      this.animateBackgroundObjects(elapsedTime, delta);
      
      // Rendu de la scène
      this.backgroundRenderer.render(this.backgroundScene, this.backgroundCamera);
      
      // Continuer la boucle d'animation
      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }
  
  /**
   * Anime les objets de fond
   */
  private animateBackgroundObjects(time: number, delta: number) {
    const scrollY = this.scrollPosition.getValue();
    const scrollFactor = scrollY * 0.001;
    
    // Animation simple des objets de fond
    this.backgroundObjects.forEach((obj, index) => {
      // Rotation continue
      obj.rotation.x += 0.001 * (index % 2 ? 1 : -1);
      obj.rotation.z += 0.001 * (index % 3 ? 1 : -1);
      
      // Mouvement simple basé sur le temps
      const offset = index * 0.1;
      const animationSpeed = 0.005;
      
      obj.position.y = Math.sin(time * 0.3 + offset) * 0.3;
      obj.position.x = Math.cos(time * 0.3 + offset) * 0.3;
    });
    
    // Animation simple de la lumière
    if (this.light) {
      this.light.position.x = Math.sin(time * 0.2) * 3;
      this.light.position.y = 1 + Math.cos(time * 0.15) * 1;
    }
  }

  /**
   * Nettoie les ressources pour éviter les fuites de mémoire
   */
  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Nettoyer les ressources
    this.animationService.dispose();
    
    if (this.backgroundScene) {
      this.commonService.disposeScene(this.backgroundScene);
    }
    
    if (this.backgroundRenderer) {
      this.backgroundRenderer.dispose();
    }
  }
}
