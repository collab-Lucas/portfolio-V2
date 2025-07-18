import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  high: { prismCount: 100, sphereSegments: 64, shadowMapSize: 2048, pixelRatio: 1.5, enableShadows: true, enableAntialiasing: true }
};

@Injectable({
  providedIn: 'root'
})
export class BackgroundThreeService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId: number | null = null;
  private models: { [key: string]: THREE.Group } = {};
  private loader = new GLTFLoader();
  private boundMoveCamera: any;
  private boundMouseMove: any;
  private mouseX = 0;
  private mouseY = 0;
  private animationTime = 0;
  private clock = new THREE.Clock();
  private qualityLevel: 'low' | 'medium' | 'high' = 'medium';
  private qualitySettings: QualitySettings = QUALITY_PRESETS['medium'];
  private initialized = false;

  constructor() {
    this.detectPerformanceLevel();
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
   * Initialise la scène Three.js
   */
  init(canvas: HTMLCanvasElement): void {
    if (!canvas || this.initialized) return;

    this.initializeScene(canvas);
    this.setupLights();
    this.setupEventListeners();
    this.loadModels();
    this.createEnvironment();
    this.animate();
    this.moveCamera();
    
    this.initialized = true;
  }

  /**
   * Initialise la scène de base
   */
  private initializeScene(canvas: HTMLCanvasElement): void {
    // Scène
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcccccc, 1, 500);

    // Caméra
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-3, 0, 300);
    this.camera.rotation.set(0, THREE.MathUtils.degToRad(-3.69), 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: this.qualitySettings.enableAntialiasing
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(this.qualitySettings.pixelRatio, window.devicePixelRatio));
    this.renderer.setClearColor(0xffffff, 0);
    
    if (this.qualitySettings.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }

  /**
   * Configure les lumières
   */
  private setupLights(): void {
    // Lumière directionnelle
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(10, 10, 10);
    
    if (this.qualitySettings.enableShadows) {
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = this.qualitySettings.shadowMapSize;
      directionalLight.shadow.mapSize.height = this.qualitySettings.shadowMapSize;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.bias = -0.001;
    }
    
    this.scene.add(directionalLight);

    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);
  }

  /**
   * Limite le nombre d'appels à une fonction
   */
  private throttle(callback: Function, delay: number): (...args: any[]) => void {
    let lastCall = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        callback(...args);
      }
    };
  }
  
  /**
   * Configure les event listeners avec throttling pour réduire les appels
   */
  private setupEventListeners(): void {
    this.boundMoveCamera = this.throttle(this.moveCamera.bind(this), 100); // Throttle à 100ms
    this.boundMouseMove = this.throttle(this.handleMouseMove.bind(this), 50); // Throttle à 50ms
    
    window.addEventListener('scroll', this.boundMoveCamera, { passive: true });
    window.addEventListener('mousemove', this.boundMouseMove, { passive: true });
    window.addEventListener('resize', this.onResize.bind(this));
  }

  /**
   * Gère le mouvement de la souris
   */
  private handleMouseMove(event: MouseEvent): void {
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    // Demander un rendu lorsque la souris bouge
    this.needsUpdate = true;
  };

  /**
   * Charge les modèles 3D
   */
  private loadModels(): void {
    // Bureau
    this.loadGLB('scene_bureau', 'assets/models/scene_bureau.glb', { x: 5, y: -23, z: 3 }, 1, (bureau) => {
      bureau.rotation.y = THREE.MathUtils.degToRad(-35);
      this.setupBureauMaterials(bureau);
    });

    // Fond
    this.loadGLB('scene_fond', 'assets/models/scene_fond.glb', { x: 59, y: 29.5, z: -75 }, 1, (fond) => {
      fond.rotation.y = THREE.MathUtils.degToRad(-65);
    });

    // Prismes
    this.loadGLB('prisme', 'assets/models/prisme.glb', { x: 10, y: 0, z: 0 }, 1, (prisme) => {
      prisme.rotation.y = Math.PI / 4;
      this.generatePrismeClones(prisme, this.qualitySettings.prismCount);
    });

    // Appliquer les matériaux globaux après chargement
    setTimeout(() => {
      this.applyGlobalMaterials();
    }, 500);
  }

  /**
   * Configure les matériaux du bureau
   */
  private setupBureauMaterials(bureau: THREE.Group): void {
    bureau.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Matériaux spéciaux pour les écrans
        if (child.name.includes('Cube008') || child.name.includes('Cube005')) {
          const screenMaterial = new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 },
              baseColor: { value: new THREE.Color(0xffffff) },
              glowColor: { value: new THREE.Color(0x00ffff) },
              glowIntensity: { value: 0.8 },
              haloSize: { value: 0.6 }
            },
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float time;
              uniform vec3 baseColor;
              uniform vec3 glowColor;
              uniform float glowIntensity;
              uniform float haloSize;
              varying vec2 vUv;
              
              void main() {
                vec2 center = vec2(0.5, 0.5);
                float distFromCenter = length(vUv - center);
                
                float flicker = 0.9 + 0.1 * sin(time * 2.0);
                float screenGradient = 1.0 - smoothstep(0.0, 0.5, distFromCenter);
                vec3 screenColor = mix(baseColor, glowColor, 0.3);
                
                float halo = 1.0 - smoothstep(0.0, haloSize, distFromCenter);
                halo = pow(halo, 1.5);
                
                vec3 finalColor = screenColor * flicker;
                finalColor = mix(finalColor, glowColor, halo * 0.2);
                
                float scanline = sin(vUv.y * 80.0) * 0.01;
                finalColor += scanline;
                
                finalColor = clamp(finalColor, 0.0, 1.0);
                
                gl_FragColor = vec4(finalColor, 1.0);
              }
            `,
            side: THREE.FrontSide,
            transparent: false,
            blending: THREE.NormalBlending
          });
          
          child.material = screenMaterial;
        }
      }
    });
  }

  /**
   * Applique les matériaux globaux avec veines
   */
  private applyGlobalMaterials(): void {
    this.scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        !(child.geometry instanceof THREE.SphereGeometry && child.geometry.parameters?.radius >= 1000) &&
        !(child.material instanceof THREE.ShaderMaterial) &&
        !(child.name && (child.name.includes('screen') || child.name.includes('Cube005') || child.name.includes('Cube008')))
      ) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Shader veines appliqué directement sur le matériau principal
        child.material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 }
          },
          vertexShader: `
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            varying vec2 vUv;
            void main() {
              vUv = uv;
              vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float time;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            varying vec2 vUv;

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
                uv = vWorldPosition.yz * 0.1;
              } else if (absNormal.y > absNormal.z) {
                uv = vWorldPosition.xz * 0.1;
              } else {
                uv = vWorldPosition.xy * 0.1;
              }

              float noise1 = snoise(uv + vec2(time * 0.05, 1.0));
              float noise2 = snoise(uv * 1.5 + vec2(0.0, time * 0.03));
              float combined = abs(noise1 * 1.3 - noise2 * 0.5);
              float veins = 1.0 - smoothstep(0.12, 0.25, combined); // Veines moins comprimées pour éviter la saturation

              float t = fract(uv.x * 2.0 + time * 0.1);
              vec3 veinColor = getColor(t);
              veinColor = mix(veinColor * 1.5, veinColor, 0.3); // Réduction de la saturation pour éviter le blanc

              // Couleur de fond sombre pour contraste
              vec3 bgColor = vec3(0.15);
              vec3 finalColor = mix(bgColor, veinColor, veins);

              // Accentuer la visibilité des veines mais sans excès
              finalColor = mix(finalColor, veinColor, veins * 0.6);

              // Shading simple selon la normale
              float shade = dot(normalize(vNormal), normalize(vec3(0.2, 0.5, 1.0)));
              shade = clamp(shade, 0.3, 1.0);
              finalColor *= shade;
              
              // Limiter la luminosité pour éviter la surexposition blanche
              finalColor = min(finalColor, vec3(0.95));

              float alpha = 1.0;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `,
          side: THREE.DoubleSide,
          transparent: false,
          blending: THREE.NormalBlending
        });
      }
    });
  }

  /**
   * Génère les clones de prismes - version sécurisée sans InstancedMesh
   * pour éviter les problèmes de compatibilité avec la navbar
   */
  private generatePrismeClones(prisme: THREE.Group, count: number): void {
    // Revenir à la méthode originale de clonage pour éviter les erreurs de type
    // et les problèmes potentiels avec la navbar
    for (let i = 0; i < count; i++) {
      const clone = prisme.clone();
      
      clone.position.set(
        THREE.MathUtils.randFloatSpread(200),
        THREE.MathUtils.randFloatSpread(200),
        THREE.MathUtils.randFloatSpread(300)
      );

      clone.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      clone.scale.setScalar(0.3 + Math.random() * 1.2);
      this.scene.add(clone);
    }
  }

  /**
   * Charge un modèle GLB
   */
  private loadGLB(
    name: string,
    path: string,
    position: { x: number; y: number; z: number },
    scale: number,
    onLoad?: (model: THREE.Group) => void
  ): void {
    this.loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(position.x, position.y, position.z);
        model.scale.set(scale, scale, scale);
        
        this.scene.add(model);
        this.models[name] = model;
        
        if (onLoad) onLoad(model);
      },
      undefined,
      (error) => {
        // Suppression du log pour optimisation
        // Possibilité d'ajouter un système de logging silencieux ou une notification UI
      }
    );
  }

  /**
   * Crée l'environnement
   */
  private createEnvironment(): void {
    this.camera.far = 5000;
    this.camera.updateProjectionMatrix();

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float time;
      uniform float glowIntensity;
      uniform float noiseStrength;
      varying vec2 vUv;

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

      vec3 getColor(float t) {
        float r = 0.8 + 0.2 * sin(t * 6.283 + 0.0);
        float g = 0.8 + 0.2 * sin(t * 6.283 + 2.0);
        float b = 0.8 + 0.2 * sin(t * 6.283 + 4.0);
        return vec3(r, g, b);
      }

      float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        float bandCenter = 0.5;
        float bandWidth = 0.05;
        float softness = 0.001;

        float dist = abs(vUv.y - bandCenter);
        float mask = 1.0 - smoothstep(bandWidth / 2.0, bandWidth / 2.0 + softness, dist);
        float glow = 1.0 - smoothstep(bandWidth / 2.0 + 0.03, bandWidth / 2.0 + 0.08, dist);

        vec2 warpedUv = vUv;
        float deformation = snoise(vUv * 4.0 + vec2(time * 0.08, 0.0));
        warpedUv.x += deformation * 0.08;
        warpedUv.y += deformation * 0.08;

        float gradientT = fract(warpedUv.x + time * 0.04);
        vec3 bandColor = getColor(gradientT);

        float grain = rand(vUv + time * 0.3);
        bandColor += noiseStrength * (grain - 0.5);

        vec3 background = vec3(0);
        vec3 finalColor = mix(background, bandColor, glow * glowIntensity);
        finalColor = mix(finalColor, bandColor, mask);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const geometry = new THREE.SphereGeometry(1000, this.qualitySettings.sphereSegments, this.qualitySettings.sphereSegments);
    
    const noiseStrength = this.qualityLevel === 'low' ? 0.02 : 0.05;
    const glowIntensity = this.qualityLevel === 'low' ? 0.03 : 0.05;
    
    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide,
      uniforms: {
        time: { value: 0 },
        glowIntensity: { value: glowIntensity },
        noiseStrength: { value: noiseStrength }
      }
    });

    const envSphere = new THREE.Mesh(geometry, shaderMaterial);
    envSphere.scale.set(-1, 1, 1);
    envSphere.renderOrder = -1000;
    this.scene.add(envSphere);
  }

  /**
   * Indicateur pour savoir si un rendu est nécessaire
   * Optimisation: Rendu uniquement lorsque nécessaire
   */
  private needsUpdate: boolean = true;
  
  /**
   * Demande un nouveau rendu
   */
  public requestRender(): void {
    this.needsUpdate = true;
  }
  
  /**
   * Boucle d'animation optimisée avec rendu conditionnel
   */
  private animate(): void {
    const render = () => {
      const delta = this.clock.getDelta();
      this.animationTime += delta;
      
      if (this.animationTime > 1000) {
        this.animationTime = this.animationTime % 1000;
      }
      
      this.updateShaders();
      this.animateObjects(delta);
      
      // Optimisation: Rendu uniquement si nécessaire
      if (this.needsUpdate) {
        this.renderer.render(this.scene, this.camera);
        this.needsUpdate = false;
      }
      
      this.animationId = requestAnimationFrame(render);
    };
    
    render();
  }

  /**
   * Met à jour les shaders
   */
  private updateShaders(): void {
    // Uniquement mettre à jour les shaders toutes les N frames pour économiser des ressources
    const updateInterval = this.qualityLevel === 'low' ? 5 : (this.qualityLevel === 'medium' ? 3 : 1);
    
    // Si on n'est pas sur une frame d'update de shader, retourner immédiatement
    if (Math.floor(this.animationTime * 60) % updateInterval !== 0) {
      return;
    }
    
    let shadersUpdated = false;
    
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.ShaderMaterial && 
            child.material.uniforms && 
            child.material.uniforms['time'] !== undefined) {
          child.material.uniforms['time'].value = this.animationTime;
          shadersUpdated = true;
        }
        else if (child.material instanceof THREE.MeshBasicMaterial && 
                 child.material.userData && 
                 child.material.userData['shader'] && 
                 child.material.userData['shader'].uniforms && 
                 child.material.userData['shader'].uniforms['time']) {
          child.material.userData['shader'].uniforms['time'].value = this.animationTime;
          shadersUpdated = true;
        }
      }
    });
    
    // Si des shaders ont été mis à jour, demander un rendu
    if (shadersUpdated) {
      this.needsUpdate = true;
    }
  }

  /**
   * Anime les objets
   */
  private animateObjects(delta: number): void {
    const frameMultiplier = delta * 60;
    let objectsAnimated = false;
    
    if (this.models['prisme']) {
      this.models['prisme'].rotation.y += 0.005 * frameMultiplier;
      objectsAnimated = true;
    }
    
    if (this.models['scene_bureau']) {
      const bureau = this.models['scene_bureau'];
      const initialRotationY = THREE.MathUtils.degToRad(-35);
      
      // Uniquement mettre à jour si la souris a réellement changé de position
      const newRotX = this.mouseY * 0.01;
      const newRotY = initialRotationY + this.mouseX * 0.01;
      
      if (Math.abs(bureau.rotation.x - newRotX) > 0.0001 || 
          Math.abs(bureau.rotation.y - newRotY) > 0.0001) {
        bureau.rotation.x = newRotX;
        bureau.rotation.y = newRotY;
        objectsAnimated = true;
      }
      
      const t = document.body.getBoundingClientRect().top;
      if (t >= -850 && t <= -650) {
        const newRotZ = Math.sin(this.animationTime * 2) * 0.01;
        if (Math.abs(bureau.rotation.z - newRotZ) > 0.0001) {
          bureau.rotation.z = newRotZ;
          objectsAnimated = true;
        }
      } else if (bureau.rotation.z !== 0) {
        bureau.rotation.z *= 0.95;
        if (Math.abs(bureau.rotation.z) > 0.0001) {
          objectsAnimated = true;
        } else {
          bureau.rotation.z = 0;
        }
      }
    }
    
    let prismCount = 0;
    this.scene.children.forEach(child => {
      if (child instanceof THREE.Group && 
          child !== this.models['prisme'] && 
          child !== this.models['scene_fond'] &&
          child !== this.models['scene_bureau'] &&
          prismCount < this.qualitySettings.prismCount) {
        
        child.rotation.x += 0.002 * frameMultiplier;
        child.rotation.y += 0.003 * frameMultiplier;
        prismCount++;
        objectsAnimated = true;
      }
    });
    
    // Si des objets ont été animés, demander un rendu
    if (objectsAnimated) {
      this.needsUpdate = true;
    }
  }

  // Points de caméra pré-calculés pour éviter les calculs répétitifs
  private readonly cameraPoints = {
    initial: {
      position: new THREE.Vector3(-3, 0, 300),
      rotation: THREE.MathUtils.degToRad(-3.69)
    },
    bureau: {
      position: new THREE.Vector3(16, -20, 9.5),
      rotation: THREE.MathUtils.degToRad(-3.69 + 35)
    },
    fond: {
      position: new THREE.Vector3(62, 30, -70),
      rotation: THREE.MathUtils.degToRad(-3.69 + 70)
    }
  };
  
  // Seuils de scroll pré-calculés
  private readonly scrollThresholds = {
    section1: -650,
    section2: -1050,
    section3: -1800,
    section4: -2100
  };
  
  // Cache pour éviter les calculs répétitifs
  private lastScrollTop: number = 0;
  private scrollSection: number = 0;
  
  /**
   * Déplace la caméra selon le scroll avec des optimisations de performances
   */
  private moveCamera(): void {
    const t = document.body.getBoundingClientRect().top;
    
    // Si le scroll n'a pas changé significativement, éviter le recalcul
    if (Math.abs(t - this.lastScrollTop) < 5) {
      return;
    }
    
    this.lastScrollTop = t;
    this.needsUpdate = true;
    
    // Déterminer la section actuelle pour éviter des comparaisons répétitives
    let currentSection = 0;
    if (t > this.scrollThresholds.section1) currentSection = 1;
    else if (t >= this.scrollThresholds.section2 && t <= this.scrollThresholds.section1) currentSection = 2;
    else if (t > this.scrollThresholds.section3 && t <= this.scrollThresholds.section2) currentSection = 3;
    else if (t >= this.scrollThresholds.section4 && t <= this.scrollThresholds.section3) currentSection = 4;
    else currentSection = 5;
    
    // Si la section n'a pas changé, éviter certains calculs
    if (currentSection === this.scrollSection && 
        (currentSection === 2 || currentSection === 4)) {
      return;
    }
    
    this.scrollSection = currentSection;
    
    // Utiliser les points pré-calculés
    const { initial, bureau, fond } = this.cameraPoints;
    
    switch (currentSection) {
      case 1: // Section 1: Transition initiale vers bureau
        const progress1 = Math.abs(t) / Math.abs(this.scrollThresholds.section1);
        this.camera.position.lerpVectors(initial.position, bureau.position, progress1);
        this.camera.rotation.y = initial.rotation + (bureau.rotation - initial.rotation) * progress1;
        break;
        
      case 2: // Section 2: Bureau fixe
        this.camera.position.copy(bureau.position);
        this.camera.rotation.y = bureau.rotation;
        break;
        
      case 3: // Section 3: Transition bureau vers fond
        const progress3 = (Math.abs(t) - Math.abs(this.scrollThresholds.section2)) / 
                        (Math.abs(this.scrollThresholds.section3) - Math.abs(this.scrollThresholds.section2));
        this.camera.position.lerpVectors(bureau.position, fond.position, progress3);
        
        const additionalRotation = THREE.MathUtils.degToRad(-40);
        const targetRotation = fond.rotation + additionalRotation;
        this.camera.rotation.y = bureau.rotation + (targetRotation - bureau.rotation) * progress3;
        break;
        
      case 4: // Section 4: Fond fixe
        this.camera.position.copy(fond.position);
        this.camera.rotation.y = fond.rotation + THREE.MathUtils.degToRad(-40);
        break;
        
      case 5: // Section 5: Fin du scroll
        const progress5 = (Math.abs(t) - Math.abs(this.scrollThresholds.section4)) / 400;
        const endPos = new THREE.Vector3(
          fond.position.x + progress5 * 20,
          fond.position.y - progress5 * 10,
          fond.position.z + progress5 * 50
        );
        this.camera.position.copy(endPos);
        this.camera.rotation.y = fond.rotation + THREE.MathUtils.degToRad(-40);
        break;
    }
  }

  // Variables pour limiter les redimensionnements
  private lastWidth: number = 0;
  private lastHeight: number = 0;
  private resizeTimeout: any = null;
  
  /**
   * Gère le redimensionnement avec debouncing et caching
   */
  onResize(): void {
    if (!this.renderer || !this.camera) return;
    
    // Annuler tout redimensionnement précédent en attente
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    // Attendre que le redimensionnement soit terminé avant d'appliquer (debouncing)
    this.resizeTimeout = setTimeout(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Vérifier si la taille a réellement changé de manière significative (>5%)
      const widthDiff = Math.abs(width - this.lastWidth);
      const heightDiff = Math.abs(height - this.lastHeight);
      
      if (widthDiff > this.lastWidth * 0.05 || heightDiff > this.lastHeight * 0.05 || 
          this.lastWidth === 0 || this.lastHeight === 0) {
        
        // Mettre à jour la taille du renderer
        this.renderer.setSize(width, height);
        
        // Mettre à jour la caméra seulement si nécessaire
        if (this.camera.aspect !== width / height) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
        }
        
        // Mettre à jour les dernières dimensions connues
        this.lastWidth = width;
        this.lastHeight = height;
        
        // Demander un rendu
        this.needsUpdate = true;
      }
      
      this.resizeTimeout = null;
    }, 250); // Attendre 250ms après le dernier événement de redimensionnement
  }

  /**
   * Nettoie les ressources pour éviter les fuites mémoire
   */
  dispose(): void {
    // Nettoyer l'animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Supprimer les gestionnaires d'événements
    if (this.boundMoveCamera) {
      window.removeEventListener('scroll', this.boundMoveCamera);
      this.boundMoveCamera = null;
    }
    
    if (this.boundMouseMove) {
      window.removeEventListener('mousemove', this.boundMouseMove);
      this.boundMouseMove = null;
    }
    
    window.removeEventListener('resize', this.onResize.bind(this));
    
    // Annuler tout timeout en attente
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    
    // Nettoyer la scène et libérer la mémoire
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          if (object.material) {
            // Gérer les matériaux simples et les tableaux de matériaux
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                this.disposeMaterial(material);
              });
            } else {
              this.disposeMaterial(object.material);
            }
          }
          
          // Supprimer les références cycliques
          object.parent?.remove(object);
        }
      });
    }
    
    // Nettoyer les modèles
    Object.values(this.models).forEach(model => {
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => this.disposeMaterial(material));
            } else {
              this.disposeMaterial(object.material);
            }
          }
        }
      });
    });
    
    // Vider les références aux modèles
    this.models = {};
    
    // Nettoyer le renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement?.remove();
      // Ne pas assigner null pour éviter les erreurs de type
      // this.renderer est toujours défini mais inutilisable après dispose
    }
    
    // Ne pas assigner null aux propriétés de type non-nullable
    // Marquer simplement comme non initialisé
    this.initialized = false;
  }
  
  /**
   * Méthode auxiliaire pour nettoyer un matériau et ses ressources associées
   */
  private disposeMaterial(material: THREE.Material): void {
    // Disposer des textures de base (présentes sur tous les types de matériaux supportés)
    if (material instanceof THREE.MeshBasicMaterial) {
      if (material.map) material.map.dispose();
      if (material.lightMap) material.lightMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.envMap) material.envMap.dispose();
    }
    
    // Disposer des textures spécifiques à MeshStandardMaterial
    if (material instanceof THREE.MeshStandardMaterial) {
      if (material.map) material.map.dispose();
      if (material.lightMap) material.lightMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();
      if (material.metalnessMap) material.metalnessMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.envMap) material.envMap.dispose();
    }
    
    // Disposer des textures spécifiques à MeshPhongMaterial
    if (material instanceof THREE.MeshPhongMaterial) {
      if (material.map) material.map.dispose();
      if (material.lightMap) material.lightMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.envMap) material.envMap.dispose();
    }
    
    // Pour les matériaux de shader, nettoyer les uniforms avec des textures
    if (material instanceof THREE.ShaderMaterial) {
      for (const uniformName in material.uniforms) {
        const uniform = material.uniforms[uniformName];
        if (uniform && uniform.value instanceof THREE.Texture) {
          uniform.value.dispose();
        }
      }
    }
    
    // Disposer le matériau lui-même
    material.dispose();
  }
}