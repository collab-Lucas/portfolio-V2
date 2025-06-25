import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { CommonThreeService } from './threejs/common-three.service';
import { LightService } from './threejs/light.service';
import { AnimationService } from './threejs/animation.service';
import { ResizeService } from './resize.service';

/**
 * Service spécialisé pour gérer les effets Three.js de la barre de navigation
 */
@Injectable({
  providedIn: 'root'
})
export class NavbarThreeService implements OnDestroy {
  private resizeSubscription?: Subscription;
  private currentColor = new BehaviorSubject<string>('#66ccff');

  // Scene properties spécifiques à la navbar
  private navbarScene!: THREE.Scene;
  private navbarCamera!: THREE.PerspectiveCamera;
  private navbarRenderer!: THREE.WebGLRenderer;
  private mixers: THREE.AnimationMixer[] = [];
  private animationActions: THREE.AnimationAction[] = [];
  private clock = new THREE.Clock();
  
  // Variables pour la gestion des modèles et animations
  private modelLoadingStatus = {
    ico: false,
    torus: false,
    scene: false
  };

  // Lumières principales de la navbar
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  
  // Variables pour l'interaction utilisateur
  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentRotationX = 0;
  private currentRotationY = 0;
  private navbarElement: HTMLElement | null = null;
  
  // Performance
  private lowQualityMode = false;
  private animationFrameRate = 24;
  private lastAnimationTime = 0;
  private lastShadowUpdate = 0;
  private torusShadowsOptimized = false;
  
  private animationFrameId: number | null = null;
  constructor(
    private commonService: CommonThreeService,
    private lightService: LightService,
    private animationService: AnimationService,
    private resizeService: ResizeService
  ) {
    this.navbarElement = document.querySelector('.navbar');
  }
  /**
   * Initialise la scène Three.js pour la navbar
   */  initNavbar(canvas: HTMLCanvasElement) {
    console.log('initNavbar appelé avec canvas:', canvas);
    
    if (!canvas) {
      console.error('Canvas non disponible pour initNavbar');
      return;
    }
    
    // Arrêter toute animation précédente
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Utiliser setupScene du CommonThreeService
    this.navbarScene = this.commonService.setupScene();
    this.navbarScene.background = null;

    const CANVAS_HEIGHT = window.innerHeight;
    
    // Initialisation du renderer avec support des ombres
    this.navbarRenderer = this.commonService.createRenderer(canvas, {
      alpha: true,
      antialias: !this.lowQualityMode,
      precision: this.lowQualityMode ? 'lowp' : 'mediump',
      powerPreference: 'high-performance', // Changé pour améliorer les performances
      shadowMapEnabled: true,
      shadowMapType: THREE.PCFSoftShadowMap
    });
    
    this.navbarRenderer.setSize(window.innerWidth, CANVAS_HEIGHT);
    this.navbarRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.navbarRenderer.toneMappingExposure = 1;
    this.navbarRenderer.setClearColor(0x000000, 0); // Fond transparent
    
    // Utiliser setupCamera du CommonThreeService
    this.navbarCamera = this.commonService.setupCamera({
      fov: 75,
      aspect: window.innerWidth / CANVAS_HEIGHT,
      near: 0.1,
      far: 1000,
      position: { x: 0, y: 0, z: 5 }
    });
      // Enregistrer la scène auprès du service de lumières
    this.lightService.registerScene(this.navbarScene, 'navbar', this.navbarRenderer);
      // Enregistrement global pour la compatibilité
    if (window.registerScene) {
      window.registerScene(this.navbarScene, 'navbar', this.navbarRenderer);
    }
    
    // Configurer l'écoute du redimensionnement
    this.setupResizeListener();
    
    // Lumières de base
    this.setupLights();
    
    // Charger les modèles
    this.loadNavbarModels();
    
    // Démarrer l'animation
    this.animate();
  }
  /**
   * Configure les lumières pour la navbar
   */
  private setupLights() {
    // Utiliser le LightService pour créer un ensemble standard de lumières
    const lights = this.lightService.createStandardLightSet(this.navbarScene, {
      sceneType: 'navbar',
      color: '#ffffff',
      ambientIntensity: 0.5,
      directionalIntensity: 0.8,
      includePoint: false,
      shadowQuality: this.lowQualityMode ? 'low' : 'high'
    });
    
    // Stocker les références aux lumières principales
    this.ambientLight = lights.ambient;
    this.directionalLight = lights.directional!;
    
    // Configuration supplémentaire pour la lumière directionnelle
    this.directionalLight.position.set(-5, 15, 10);
  }

  /**
   * Charge les modèles de la navbar
   */  private loadNavbarModels() {
    // Ajout d'un gestionnaire d'erreurs global pour THREE.js
    THREE.Cache.enabled = true; // Active le cache pour les textures
    
    const loader = new GLTFLoader();
    
    console.log('Chargement des modèles de la navbar');
      
    // Load navbar_ico
    loader.load(
      'assets/models/navbar_ico.glb',
      (gltf: GLTF) => {        // Configurer l'objet chargé pour le support des ombres
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            this.commonService.configureShadowsForObject(child, true, true);
          }
        });

        // Utiliser l'AnimationService pour gérer les animations
        if (gltf.animations && gltf.animations.length > 0) {
          const { mixer, actions } = this.animationService.setupGLTFAnimations(gltf, false);
          this.mixers.push(mixer);
          this.animationActions.push(...actions);
        }

        this.navbarScene.add(gltf.scene);
        
        // Marquer ce modèle comme chargé
        this.modelLoadingStatus.ico = true;
        // Vérifier si tous les modèles sont chargés
        this.checkAndStartAnimations();
      },
      undefined,
      (err: unknown) => {
        console.error('Error loading navbar_ico:', err);
        this.modelLoadingStatus.ico = true;
      }
    );
    
    // Load navbar_torus
    loader.load(
      'assets/models/navbar_torus.glb',
      (gltf: GLTF) => {        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            this.commonService.configureShadowsForObject(child, true, true);
            this.commonService.configureTorus(child);
          }
        });

        // Utiliser l'AnimationService pour gérer les animations
        if (gltf.animations && gltf.animations.length > 0) {
          const { mixer, actions } = this.animationService.setupGLTFAnimations(gltf, false);
          this.mixers.push(mixer);
          this.animationActions.push(...actions);
        }

        this.navbarScene.add(gltf.scene);
        
        // Marquer ce modèle comme chargé
        this.modelLoadingStatus.torus = true;
        // Vérifier si tous les modèles sont chargés
        this.checkAndStartAnimations();
      },
      undefined,
      (err: unknown) => {
        console.error('Error loading navbar_torus:', err);
        this.modelLoadingStatus.torus = true;
      }
    );
    
    // Load navbar_scene
    loader.load(
      'assets/models/navbar_scene.glb',
      (gltf: GLTF) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            this.commonService.configureShadowsForObject(child, true, true);
            
            // Améliorer les matériaux pour un meilleur rendu des ombres
            if (child.material instanceof THREE.MeshStandardMaterial || 
                child.material instanceof THREE.MeshPhysicalMaterial) {
              child.material.envMapIntensity = 1.0;
              child.material.roughness = Math.max(0.3, child.material.roughness);
              if (child.material.metalness > 0.7) {
                child.material.metalness = 0.7;
              }
              child.material.needsUpdate = true;
            }
          }
            if (child instanceof THREE.Camera) {
            this.navbarCamera = child as THREE.PerspectiveCamera;
            this.navbarCamera.aspect = window.innerWidth / window.innerHeight;
            this.navbarCamera.updateProjectionMatrix();
          }
          
          // Récupérer les lumières importées
          if (child instanceof THREE.Light) {
            // Nommer la lumière si pas de nom défini
            if (!child.name || child.name.trim() === '') {
              const type = this.lightService['getLightType'](child);
              const count = this.navbarScene.children.filter(
                c => c instanceof THREE.Light && this.lightService['getLightType'](c as THREE.Light) === type
              ).length;
              child.name = `${type} ${count + 1}`;
            }
            
            // Activer les ombres pour les lumières
            if ((child instanceof THREE.DirectionalLight || 
                child instanceof THREE.SpotLight || 
                child instanceof THREE.PointLight) && 
                (!('castShadow' in child) || !child.castShadow)) {
              child.castShadow = true;
              this.lightService.configureShadowsForLight(child);
            }
          }
        });        // Utiliser l'AnimationService pour gérer les animations
        if (gltf.animations && gltf.animations.length > 0) {
          const { mixer, actions } = this.animationService.setupGLTFAnimations(gltf, true);
          this.mixers.push(mixer);
        }

        this.navbarScene.add(gltf.scene);
        
        // Mettre à jour les lumières
        this.lightService.refreshLights([{
          scene: this.navbarScene,
          type: 'navbar'
        }]);
        
        // Marquer ce modèle comme chargé
        this.modelLoadingStatus.scene = true;
        // Vérifier si tous les modèles sont chargés
        this.checkAndStartAnimations();
      },
      undefined,
      (err: unknown) => {
        console.error('Error loading navbar_scene:', err);
        this.modelLoadingStatus.scene = true;
      }
    );
  }
  
  /**
   * Met à jour la position de la souris pour les effets interactifs
   */
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
  /**
   * Boucle d'animation principale
   */  animate() {
    if (!this.navbarRenderer || !this.navbarScene || !this.navbarCamera) {
      // Réessayer plus tard si les composants ne sont pas encore initialisés
      setTimeout(() => this.animate(), 100);
      return;
    }
    
    // Utiliser notre propre boucle d'animation (plus fiable)
    const animateFrame = () => {
      if (this.animationFrameId === null) return; // Animation a été arrêtée
      
      this.animationFrameId = requestAnimationFrame(animateFrame);
      const delta = this.clock.getDelta();
      
      // Mettre à jour tous les mixers d'animation
      this.mixers.forEach(mixer => mixer.update(delta));
        
      // Mettre à jour la rotation de la scène
      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.03;
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.03;
      
      const isLarge = this.navbarElement && !this.navbarElement.classList.contains('shrink-navbar');
      const currentTime = performance.now();
      
      // Mettre à jour régulièrement les ombres
      const shadowUpdateInterval = this.lowQualityMode ? 5000 : 2000;
      if (currentTime - this.lastShadowUpdate > shadowUpdateInterval) {
        this.forceUpdateShadows();
        
        // Chercher et optimiser le torus si nécessaire
        if (!this.torusShadowsOptimized && currentTime > 5000) {
          this.optimizeLightsForTorusShadows();
          this.torusShadowsOptimized = true;
        }
        
        this.lastShadowUpdate = currentTime;
      }

      if (isLarge) {
        const timeSec = currentTime * 0.001;
        this.navbarScene.rotation.x = this.currentRotationX;
        this.navbarScene.rotation.y = this.currentRotationY;
        this.navbarScene.position.y = Math.sin(timeSec * 0.3) * 0.1;
        
        if (this.navbarRenderer.shadowMap.enabled !== true) {
          this.navbarRenderer.shadowMap.enabled = true;
          this.forceUpdateShadows();
        }      } else {
        // Quand la navbar est repliée, positionner la scène légèrement plus haut pour éviter l'écart
        this.navbarScene.position.y = THREE.MathUtils.lerp(this.navbarScene.position.y, 1.0, 0.05);
        this.navbarScene.rotation.x = THREE.MathUtils.lerp(this.navbarScene.rotation.x, 0, 0.05);
        this.navbarScene.rotation.y = THREE.MathUtils.lerp(this.navbarScene.rotation.y, 0, 0.05);
        
        if (this.navbarRenderer.shadowMap.enabled !== true) {
          this.navbarRenderer.shadowMap.enabled = true;
        }        
      }

      this.navbarRenderer.render(this.navbarScene, this.navbarCamera);
    };
    
    // Démarrer la boucle d'animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(animateFrame);
  }

  /**
   * Gère le redimensionnement de la fenêtre
   */  onResize() {
    if (!this.navbarRenderer || !this.navbarCamera) return;
    
    const CANVAS_HEIGHT = window.innerHeight;
    this.navbarCamera.aspect = window.innerWidth / CANVAS_HEIGHT;
    this.navbarCamera.updateProjectionMatrix();
    this.navbarRenderer.setSize(window.innerWidth, CANVAS_HEIGHT);
  }
  
  /**
   * Configure l'écoute du redimensionnement via le ResizeService
   */
  setupResizeListener() {
    // Désinscrire l'ancienne subscription si elle existe
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
    
    // S'abonner au service de redimensionnement
    this.resizeSubscription = this.resizeService.resize$.subscribe(({ width, height }) => {
      if (!this.navbarRenderer || !this.navbarCamera) return;
      
      this.navbarCamera.aspect = width / height;
      this.navbarCamera.updateProjectionMatrix();
      this.navbarRenderer.setSize(width, height);
    });
  }

  /**
   * Force la mise à jour des ombres
   */
  private forceUpdateShadows(): void {
    if (!this.navbarRenderer || !this.navbarScene) return;
    
    // Forcer le rendu des ombres pour le renderer
    this.navbarRenderer.shadowMap.enabled = true;
    this.navbarRenderer.shadowMap.needsUpdate = true;
    
    // Utiliser le LightService pour mettre à jour les ombres
    this.lightService.forceUpdateShadows([{
      scene: this.navbarScene,
      renderer: this.navbarRenderer
    }]);
  }

  /**
   * Optimise les lumières pour mieux faire apparaître les ombres du torus
   */
  private optimizeLightsForTorusShadows(): void {
    if (!this.navbarScene || !this.directionalLight) return;
    
    // Ajuster la position et l'intensité de la lumière directionnelle principale
    this.directionalLight.position.set(-8, 12, 8);
    this.directionalLight.intensity = 0.9;
    
    // Rechercher et optimiser le torus
    this.navbarScene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        // S'assurer que tous les objets peuvent projeter et recevoir des ombres
        obj.castShadow = true;
        obj.receiveShadow = true;
        
        // Si c'est le torus, appliquer un traitement spécial
        if (obj.name.includes('torus') || 
            (obj.parent && obj.parent.name && obj.parent.name.includes('torus'))) {
          console.log('Torus trouvé, optimisation des ombres...');
          
          // Ajuster sa position si nécessaire
          if (obj.position.y < 0.5) {
            obj.position.y += 0.5;
          }
          
          // Appliquer la configuration spéciale au torus
          this.commonService.configureTorus(obj);
        }
      }
    });
    
    // Forcer une mise à jour immédiate des ombres
    this.forceUpdateShadows();
  }

  /**
   * Définit le mode basse qualité
   * @param enabled Activer ou non le mode basse qualité
   */
  setLowQualityMode(enabled: boolean) {
    this.lowQualityMode = enabled;
    
    if (this.navbarRenderer) {
      this.navbarRenderer.setPixelRatio(enabled ? 1.0 : Math.min(1.5, window.devicePixelRatio));
      this.navbarRenderer.shadowMap.type = enabled ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    }
    
    // Ajuster le taux de rafraîchissement des animations
    this.animationFrameRate = enabled ? 24 : 30;
    
    // Mettre à jour la qualité des ombres
    this.lightService.configureShadowQuality(enabled ? 'low' : 'medium', [{
      scene: this.navbarScene,
      renderer: this.navbarRenderer
    }]);
  }

  /**
   * Définit la couleur actuelle
   * @param color Nouvelle couleur
   */
  setCurrentColor(color: string) {
    this.currentColor.next(color);
  }
  
  /**
   * Obtient la couleur actuelle
   */
  getCurrentColor(): Observable<string> {
    return this.currentColor.asObservable();
  }
  /**
   * Vérifier si tous les modèles sont chargés et démarrer les animations
   */
  private checkAndStartAnimations(): void {
    const allModelsLoaded = this.modelLoadingStatus.ico && 
                           this.modelLoadingStatus.torus && 
                           this.modelLoadingStatus.scene;
    
    if (allModelsLoaded) {
      console.log('Tous les modèles sont chargés, démarrage des animations synchronisées');
      
      // Attendre un peu pour s'assurer que tout est bien initialisé
      setTimeout(() => {
        // Réinitialiser et jouer toutes les animations
        this.animationActions.forEach(action => {
          action.reset();
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
          action.play();
        });
        
        // S'assurer que l'animation est bien démarrée
        if (this.animationFrameId === null) {
          this.animate();
        }
        
        // Forcer une mise à jour des ombres
        this.forceUpdateShadows();
      }, 200);
    }
  }
  /**
   * Nettoie les ressources
   */  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Arrêter tous les mixers d'animation
    for (const mixer of this.mixers) {
      mixer.stopAllAction();
    }
    this.mixers = [];
    
    // Nettoyer la scène et les ressources
    if (this.navbarScene) {
      this.commonService.disposeObject(this.navbarScene);
    }
    
    if (this.navbarRenderer) {
      this.navbarRenderer.dispose();
    }
    
    // Désabonner du service de redimensionnement
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }
  
  /**
   * Implémentation de OnDestroy
   */
  ngOnDestroy() {
    this.dispose();
  }

  /**
   * Ajuste la position de la caméra en fonction de l'état de la navbar
   * @param isShrunk True si la navbar est repliée, false sinon
   */
  adjustCameraForNavbarState(isShrunk: boolean): void {
    if (!this.navbarCamera) return;
    
    if (isShrunk) {
      // Quand la navbar est repliée, positionner la caméra pour éviter l'écart
      this.navbarCamera.position.y = 2.0; // Position plus élevée pour compenser l'écart
    } else {
      // En mode large, position standard
      this.navbarCamera.position.y = 0;
    }
    
    this.navbarCamera.updateProjectionMatrix();
  }
}
