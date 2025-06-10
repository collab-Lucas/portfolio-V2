import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { CommonThreeService } from './threejs/common-three.service';
import { LightService } from './threejs/light.service';
import { AnimationService } from './threejs/animation.service';

/**
 * Service spécialisé pour gérer les effets Three.js de la barre de navigation
 */
@Injectable({
  providedIn: 'root'
})
export class NavbarThreeService {
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
    private animationService: AnimationService
  ) {
    this.navbarElement = document.querySelector('.navbar');
  }

  /**
   * Initialise la scène Three.js pour la navbar
   */
  initNavbar(canvas: HTMLCanvasElement) {
    this.navbarScene = new THREE.Scene();
    this.navbarScene.background = null;

    const CANVAS_HEIGHT = window.innerHeight;
    
    // Initialisation du renderer avec support des ombres
    this.navbarRenderer = this.commonService.createRenderer(canvas, {
      alpha: true,
      antialias: !this.lowQualityMode,
      precision: this.lowQualityMode ? 'lowp' : 'mediump',
      powerPreference: 'low-power',
      shadowMapEnabled: true,
      shadowMapType: THREE.PCFSoftShadowMap
    });
    this.navbarRenderer.setSize(window.innerWidth, CANVAS_HEIGHT);
    this.navbarRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.navbarRenderer.toneMappingExposure = 1;
    
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
    // Lumière ambiante
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.ambientLight.name = 'Lumière ambiante';
    this.navbarScene.add(this.ambientLight);
    
    // Lumière directionnelle
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(-5, 15, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.name = 'Lumière directionnelle';
    
    // Configuration détaillée des ombres
    const shadowQuality = 2048;
    this.directionalLight.shadow.mapSize.width = shadowQuality;
    this.directionalLight.shadow.mapSize.height = shadowQuality;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.directionalLight.shadow.radius = 2;
    
    this.navbarScene.add(this.directionalLight);
    
    // Initialiser les lumières dans le service de lumières
    this.lightService.refreshLights([{
      scene: this.navbarScene,
      type: 'navbar'
    }]);
  }

  /**
   * Charge les modèles de la navbar
   */
  private loadNavbarModels() {
    const loader = new GLTFLoader();
      
    // Load navbar_ico
    loader.load(
      'assets/models/navbar_ico.glb',
      (gltf: GLTF) => {
        // Configurer l'objet chargé pour le support des ombres
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            this.commonService.configureShadowsForObject(child, true, true);
          }
        });

        if (gltf.animations && gltf.animations.length > 0) {
          const icoMixer = new THREE.AnimationMixer(gltf.scene);
          this.mixers.push(icoMixer);
          const icoAction = icoMixer.clipAction(gltf.animations[0]);
          this.animationActions.push(icoAction);
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
      (gltf: GLTF) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            this.commonService.configureShadowsForObject(child, true, true);
            this.commonService.configureTorus(child);
          }
        });

        if (gltf.animations && gltf.animations.length > 0) {
          const torusMixer = new THREE.AnimationMixer(gltf.scene);
          this.mixers.push(torusMixer);
          const torusAction = torusMixer.clipAction(gltf.animations[0]);
          this.animationActions.push(torusAction);
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
        });

        if (gltf.animations && gltf.animations.length > 0) {
          const sceneMixer = new THREE.AnimationMixer(gltf.scene);
          this.mixers.push(sceneMixer);
          const sceneAction = sceneMixer.clipAction(gltf.animations[0]);
          sceneAction.play();
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
   */
  animate(time: number = 0) {
    if (!this.navbarRenderer || !this.navbarScene || !this.navbarCamera) {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
      return;
    }

    // Limiter la fréquence de mise à jour des animations
    const currentTime = performance.now();
    const timeDiff = currentTime - this.lastAnimationTime;
    const frameInterval = 1000 / this.animationFrameRate;
    
    if (timeDiff > frameInterval) {
      this.lastAnimationTime = currentTime - (timeDiff % frameInterval);
      
      const delta = this.clock.getDelta();
      
      // Mise à jour des mixers d'animation
      this.mixers.forEach(mixer => {
        if (mixer) mixer.update(delta);
      });

      // Mettre à jour la rotation de la scène
      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.03;
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.03;
      
      const isLarge = this.navbarElement && !this.navbarElement.classList.contains('shrink-navbar');
      
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
        }
      } else {
        this.navbarScene.position.y = THREE.MathUtils.lerp(this.navbarScene.position.y, 0, 0.05);
        this.navbarScene.rotation.x = THREE.MathUtils.lerp(this.navbarScene.rotation.x, 0, 0.05);
        this.navbarScene.rotation.y = THREE.MathUtils.lerp(this.navbarScene.rotation.y, 0, 0.05);
        
        if (this.navbarRenderer.shadowMap.enabled !== true) {
          this.navbarRenderer.shadowMap.enabled = true;
        }
      }

      this.navbarRenderer.render(this.navbarScene, this.navbarCamera);
    }
    
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  /**
   * Gère le redimensionnement de la fenêtre
   */
  onResize() {
    if (!this.navbarRenderer || !this.navbarCamera) return;
    
    const CANVAS_HEIGHT = window.innerHeight;
    this.navbarCamera.aspect = window.innerWidth / CANVAS_HEIGHT;
    this.navbarCamera.updateProjectionMatrix();
    this.navbarRenderer.setSize(window.innerWidth, CANVAS_HEIGHT);
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
    if (this.modelLoadingStatus.ico && this.modelLoadingStatus.torus) {
      console.log('Tous les modèles sont chargés, démarrage des animations synchronisées');
      
      this.animationActions.forEach(action => {
        action.reset();
        action.play();
      });
    }
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Arrêter les animations
    this.mixers.forEach(mixer => {
      mixer.stopAllAction();
    });
    
    // Nettoyer la scène et les ressources
    if (this.navbarScene) {
      this.commonService.disposeScene(this.navbarScene);
    }
    
    if (this.navbarRenderer) {
      this.navbarRenderer.dispose();
    }
  }
}
