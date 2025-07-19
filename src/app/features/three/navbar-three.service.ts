import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { CommonThreeService } from '../../shared/utils/common-three.service';
import { LightService } from './light.service';
import { AnimationService } from './animation.service';
import { ResizeService } from '../../core/resize.service';

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
  private animationTime = 0; // Temps d'animation interne stable
  
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
  private customMaterials: (THREE.MeshStandardMaterial | THREE.MeshBasicMaterial)[] = [];
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
   */  
  private setupRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    return this.commonService.createRenderer(canvas, {
      alpha: true,
      antialias: !this.lowQualityMode,
      precision: this.lowQualityMode ? 'lowp' : 'mediump',
      powerPreference: 'high-performance',
      shadowMapEnabled: true,
      shadowMapType: THREE.PCFSoftShadowMap
    });
  }

  private setupScene(): void {
    this.navbarScene = this.commonService.setupScene();
    this.navbarScene.background = null;
  }

  initNavbar(canvas: HTMLCanvasElement, initialLightValues?: { [lightName: string]: number }) {
    if (!canvas) {
      console.error('Canvas non disponible pour initNavbar');
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.setupScene();
    this.navbarRenderer = this.setupRenderer(canvas);
    this.navbarRenderer.setSize(window.innerWidth, window.innerHeight);
    this.navbarRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.navbarRenderer.toneMappingExposure = 1;
    this.navbarRenderer.setClearColor(0x000000, 0); // Fond transparent
    
    // Utiliser setupCamera du CommonThreeService
    this.navbarCamera = this.commonService.setupCamera({
      fov: 75,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 1000,
      position: { x: 0, y: 0, z: 5 }
    });
      // Enregistrer la scène auprès du service de lumières
    this.lightService.registerScene(this.navbarScene, 'navbar', this.navbarRenderer);
      // Enregistrement global pour la compatibilité
    if (window.registerScene) {
      window.registerScene(this.navbarScene, 'navbar', this.navbarCamera);
    }
    
    // Configurer l'écoute du redimensionnement
    this.setupResizeListener();
    
    // Lumières de base
    this.setupLights(initialLightValues);
    
    // Charger les modèles
    this.loadNavbarModels();
    
    // Démarrer l'animation
    this.animate();
  }
  /**
   * Configure les lumières pour la navbar
   */
  private setupLights(initialLightValues?: { [lightName: string]: number }) {
    // Utiliser notre nouveau système de lumières optimisées créées directement en code
    // Au lieu d'importer les lumières depuis une scène, on les crée avec leurs propriétés exactes
    const lights = this.lightService.createOptimizedNavbarLights(this.navbarScene, initialLightValues);
    
    // Stocker les références aux lumières principales
    this.ambientLight = lights.ambient;
    this.directionalLight = lights.directional;
    
    // Configuration supplémentaire pour la lumière directionnelle
    this.directionalLight.position.set(-5, 15, 10);
  }

  /**
   * Charge les modèles de la navbar
   */  private loadNavbarModels() {
    // Ajout d'un gestionnaire d'erreurs global pour THREE.js
    THREE.Cache.enabled = true; // Active le cache pour les textures
    
    const loader = new GLTFLoader();
      
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
        // Error loading navbar_ico
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
        // Error loading navbar_torus
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
        // Error loading navbar_scene
        this.modelLoadingStatus.scene = true;
      }
    );
    setTimeout(() => {
      // Maintenant appliquer des matériaux bicouches aux objets de la navbar
      const debugMaterials: {name: string, oldMaterial: string, color: string}[] = [];
      
      this.navbarScene.traverse((child: THREE.Object3D) => {
        if (
          child instanceof THREE.Mesh &&
          // Exclure TOUTES les sphères d'environnement (très grandes)
          !(child.geometry instanceof THREE.SphereGeometry && 
            child.geometry.parameters?.radius >= 1000) &&
          // Exclure toutes les sphères avec ShaderMaterial
          !(child.material instanceof THREE.ShaderMaterial) &&
          // Exclure les écrans/moniteurs
          !(child.name && (child.name.includes('screen') || child.name.includes('monitor') || child.name.includes('display')))
        ) {
          // Enregistrer l'ancien matériau pour débogage
          debugMaterials.push({
            name: child.name || 'unnamed',
            oldMaterial: child.material ? child.material.type : 'undefined',
            color: child.material && (child.material as any).color ? (child.material as any).color.getHexString() : 'no color'
          });
          
          child.castShadow = true;
          child.receiveShadow = true;
          
          // === COUCHE 1: MATÉRIAU DE BASE (réagit à la lumière) ===
          const originalColor = child.material && (child.material as any).color ? 
            (child.material as any).color : new THREE.Color(0xffffff);
          
          const baseMaterial = new THREE.MeshStandardMaterial({
            color: originalColor,
            roughness: 0.5,
            metalness: 0.3,
            transparent: false
          });
          
          // Appliquer le matériau de base
          child.material = baseMaterial;
          this.customMaterials.push(baseMaterial);
          
          // === COUCHE 2: MATÉRIAU OVERLAY (veines uniquement) ===
          // Créer une géométrie légèrement plus grande pour éviter le z-fighting
          const overlayGeometry = child.geometry.clone();
          overlayGeometry.scale(1.002, 1.002, 1.002);
          
          const overlayMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            alphaTest: 0.1, // Important pour ne pas afficher les parties transparentes
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending
          });
          
          // Shader pour les veines avec le shader fourni
          overlayMaterial.onBeforeCompile = (shader: any) => {
            // Stocker la référence au shader
            overlayMaterial.userData = overlayMaterial.userData || {};
            overlayMaterial.userData['shader'] = shader;
            
            // Ajouter les uniforms
            shader.uniforms.time = { value: 0 };
            
            // Remplacer complètement le vertex shader
            shader.vertexShader = `
              varying vec3 vWorldPosition;
              varying vec3 vNormal;
              varying vec3 vViewPosition;
              varying vec2 vUv;

              #include <common>
              #include <lights_pars_begin>

              void main() {
                vUv = uv;
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                vNormal = normalize(normalMatrix * normal);
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                
                gl_Position = projectionMatrix * mvPosition;
              }
            `;
            
            // Remplacer complètement le fragment shader
            shader.fragmentShader = `
              uniform float time;
              varying vec3 vWorldPosition;
              varying vec3 vNormal;

              // === Simplex Noise ===
              vec3 permute(vec3 x) {
                return mod(((x * 34.0) + 1.0) * x, 289.0);
              }
              float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                    -0.577350269189626, 0.024390243902439);
                vec2 i = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) +
                                 i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m * m;
                m = m * m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g;
                g.x  = a0.x * x0.x + h.x * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
              }

              // Dégradé coloré léger
              vec3 getColor(float t) {
                return vec3(0.8 + 0.2 * sin(t * 6.283 + 0.0),
                            0.8 + 0.2 * sin(t * 6.283 + 2.0),
                            0.8 + 0.2 * sin(t * 6.283 + 4.0));
              }

              void main() {
                vec3 normalizedPos = normalize(vWorldPosition);
                vec2 uv;
                vec3 absNormal = abs(vNormal);
                
                if (absNormal.x > absNormal.y && absNormal.x > absNormal.z) {
                  // Face X : utiliser Y et Z
                  uv = vWorldPosition.yz * 0.1;
                } else if (absNormal.y > absNormal.z) {
                  // Face Y : utiliser X et Z  
                  uv = vWorldPosition.xz * 0.1;
                } else {
                  // Face Z : utiliser X et Y avec la même échelle
                  uv = vWorldPosition.xy * 0.1;
                }

                // Première couche de noise
                float noise1 = snoise(uv + vec2(time * 0.05, 1.0));

                // Seconde couche de noise, plus petite échelle et déplacement
                float noise2 = snoise(uv * 1.5 + vec2(0.0, time * 0.03));

                // Combinaison : produit une sorte de lignes de turbulence croisées
                float combined = abs(noise1*1.3 - noise2 * 0.5);

                // Amplifie la séparation et réduit l'épaisseur des veines
                float veins = 1.0 - smoothstep(0.2, 0.3, combined);

                // Couleur de la veine (dégradé cyclique)
                float t = fract(uv.x + time * 0.1);
                vec3 veinColor = getColor(t);

                // Couleur de base pierre avec variation subtile
                vec3 stoneColor = vec3(0.9 + 0.1 * snoise(uv * 0.5));

                // Effet de contour basé sur la normale pour faire ressortir les formes
                float edgeFactor = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                edgeFactor = smoothstep(0.3, 0.7, edgeFactor) * 0.1;
                
                // Assombrir les bords pour donner du volume
                stoneColor = mix(stoneColor, vec3(0.6), edgeFactor);

                // Pour l'overlay, on ne veut que les veines, pas la pierre
                // Donc on utilise les veines comme alpha et on garde la couleur des veines
                vec3 finalColor = veinColor;
                float alpha = veins * 0.8; // Intensité des veines comme alpha
                
                // Discard les pixels trop transparents
                if (alpha < 0.01) {
                  discard;
                }
                
                gl_FragColor = vec4(finalColor, alpha);
              }
            `;
          };
          
          // Créer le mesh overlay
          const overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
          overlayMesh.position.copy(child.position);
          overlayMesh.rotation.copy(child.rotation);
          overlayMesh.scale.copy(child.scale);
          overlayMesh.castShadow = false; // Les veines ne projettent pas d'ombres
          overlayMesh.receiveShadow = false;
          
          // Ajouter l'overlay au même parent que l'objet original
          if (child.parent) {
            child.parent.add(overlayMesh);
          } else {
            this.navbarScene.add(overlayMesh);
          }
          
          // Ajouter à la liste des matériaux personnalisés
          this.customMaterials.push(overlayMaterial);
        }
      });
      
    }, 500);
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

      // Mettre à jour les uniforms des shaders
      this.updateShaderUniforms();

      if (isLarge) {
        // Utiliser le temps d'animation interne pour éviter les sauts
        this.navbarScene.rotation.x = this.currentRotationX;
        this.navbarScene.rotation.y = this.currentRotationY;
        this.navbarScene.position.y = Math.sin(this.animationTime * 0.3) * 0.1;
        
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
   * Met à jour les uniforms des shaders
   */
  private updateShaderUniforms(): void {
    if (!this.navbarScene) return;

    // Incrémenter le temps d'animation de façon stable
    this.animationTime += 0.016; // ~60fps
    
    this.navbarScene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        // Pour les ShaderMaterial classiques
        if (child.material instanceof THREE.ShaderMaterial) {
          if (child.material.uniforms && child.material.uniforms['time']) {
            child.material.uniforms['time'].value = this.animationTime;
          }
        }
        // Pour les MeshStandardMaterial et MeshBasicMaterial avec onBeforeCompile
        else if ((child.material instanceof THREE.MeshStandardMaterial || 
                  child.material instanceof THREE.MeshBasicMaterial) && 
                 child.material.userData && 
                 child.material.userData['shader']) {
          const shader = child.material.userData['shader'];
          if (shader.uniforms) {
            // Mettre à jour l'uniform time pour tous les shaders
            if (shader.uniforms['time']) {
              shader.uniforms['time'].value = this.animationTime;
            }
            
            // Garder les anciens uniforms pour compatibilité avec d'autres shaders
            if (shader.uniforms['noiseScale']) {
              shader.uniforms['noiseScale'].value = 3.0 + Math.sin(this.animationTime * 0.2) * 0.5;
            }
            
            if (shader.uniforms['waveSpeed']) {
              shader.uniforms['waveSpeed'].value = 0.5 + Math.sin(this.animationTime * 0.3) * 0.2;
            }
            
            if (shader.uniforms['colorIntensity']) {
              shader.uniforms['colorIntensity'].value = 0.3 + Math.sin(this.animationTime * 0.4) * 0.2;
            }
            
            if (shader.uniforms['veinIntensity']) {
              shader.uniforms['veinIntensity'].value = 0.8 + Math.sin(this.animationTime * 0.4) * 0.3;
            }
            
            if (shader.uniforms['veinThickness']) {
              shader.uniforms['veinThickness'].value = 0.1 + Math.sin(this.animationTime * 0.5) * 0.05;
            }
          }
        }
      }
    });
    
    // Debug moins fréquent
    if (Math.floor(this.animationTime) % 10 === 0 && Math.floor(this.animationTime * 10) % 10 === 0) {
      // Bicouche shaders updated
    }
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
    //this.directionalLight.position.set(-8, 12, 8);
    //this.directionalLight.intensity = 0.9;
    
    // Rechercher et optimiser le torus
    this.navbarScene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        // S'assurer que tous les objets peuvent projeter et recevoir des ombres
        obj.castShadow = true;
        obj.receiveShadow = true;
        
        // Si c'est le torus, appliquer un traitement spécial
        if (obj.name.includes('torus') || 
            (obj.parent && obj.parent.name && obj.parent.name.includes('torus'))) {
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
      // Attendre un peu pour s'assurer que tout est bien initialisé
      setTimeout(() => {
        // Réinitialiser et jouer toutes les animations
        this.animationActions.forEach(action => {
          action.reset();
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
          action.time = 0; // Réinitialiser le temps à 0 pour éviter les sauts
          action.enabled = true;
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
    
    // Réinitialiser le temps d'animation
    this.animationTime = 0;
    
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
    
    // Remove event listeners
    window.removeEventListener('resize', this.onResize.bind(this));
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

  /**
   * Simplify geometry for performance optimization
   */
  private optimizeGeometry(child: THREE.Object3D): void {
    if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
      child.geometry = new THREE.SphereGeometry(10, 16, 16); // Reduced complexity
    }
  }
}
