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
   * Configure les event listeners
   */
  private setupEventListeners(): void {
    this.boundMoveCamera = this.moveCamera.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    
    window.addEventListener('scroll', this.boundMoveCamera);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('resize', this.onResize.bind(this));
  }

  /**
   * Gère le mouvement de la souris
   */
  private handleMouseMove = (event: MouseEvent): void => {
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
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
   * Génère les clones de prismes
   */
  private generatePrismeClones(prisme: THREE.Group, count: number): void {
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
        console.error(`Erreur lors du chargement du modèle ${name}:`, error);
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
   * Boucle d'animation
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
      
      this.renderer.render(this.scene, this.camera);
      this.animationId = requestAnimationFrame(render);
    };
    
    render();
  }

  /**
   * Met à jour les shaders
   */
  private updateShaders(): void {
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.ShaderMaterial && 
            child.material.uniforms && 
            child.material.uniforms['time'] !== undefined) {
          child.material.uniforms['time'].value = this.animationTime;
        }
        else if (child.material instanceof THREE.MeshBasicMaterial && 
                 child.material.userData && 
                 child.material.userData['shader'] && 
                 child.material.userData['shader'].uniforms && 
                 child.material.userData['shader'].uniforms['time']) {
          child.material.userData['shader'].uniforms['time'].value = this.animationTime;
        }
      }
    });
  }

  /**
   * Anime les objets
   */
  private animateObjects(delta: number): void {
    const frameMultiplier = delta * 60;
    
    if (this.models['prisme']) {
      this.models['prisme'].rotation.y += 0.005 * frameMultiplier;
    }
    
    if (this.models['scene_bureau']) {
      const bureau = this.models['scene_bureau'];
      const initialRotationY = THREE.MathUtils.degToRad(-35);
      
      bureau.rotation.x = this.mouseY * 0.01;
      bureau.rotation.y = initialRotationY + this.mouseX * 0.01;
      
      const t = document.body.getBoundingClientRect().top;
      if (t >= -850 && t <= -650) {
        bureau.rotation.z = Math.sin(this.animationTime * 2) * 0.01;
      } else {
        bureau.rotation.z *= 0.95;
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
      }
    });
  }

  /**
   * Déplace la caméra selon le scroll
   */
  private moveCamera(): void {
    const t = document.body.getBoundingClientRect().top;

    const initialPosition = { x: -3, y: 0, z: 300 };
    const bureauPosition = { x: 16, y: -20, z: 9.5 };
    const fondPosition = { x: 62, y: 30, z: -70 };

    const initialRotation = THREE.MathUtils.degToRad(-3.69);
    const bureauRotation = THREE.MathUtils.degToRad(-3.69 + 35);
    const fondRotation = THREE.MathUtils.degToRad(-3.69 + 70);

    if (t > -650) {
      const progress = Math.abs(t) / 650;
      this.camera.position.x = initialPosition.x + (bureauPosition.x - initialPosition.x) * progress;
      this.camera.position.y = initialPosition.y + (bureauPosition.y - initialPosition.y) * progress;
      this.camera.position.z = initialPosition.z + (bureauPosition.z - initialPosition.z) * progress;
      this.camera.rotation.y = initialRotation + (bureauRotation - initialRotation) * progress;
    } else if (t >= -1050 && t <= -650) {
      this.camera.position.copy(new THREE.Vector3(bureauPosition.x, bureauPosition.y, bureauPosition.z));
      this.camera.rotation.y = bureauRotation;
    } else if (t > -1800 && t <= -1050) {
      const progress = (Math.abs(t) - 1050) / 750;
      this.camera.position.x = bureauPosition.x + (fondPosition.x - bureauPosition.x) * progress;
      this.camera.position.y = bureauPosition.y + (fondPosition.y - bureauPosition.y) * progress;
      this.camera.position.z = bureauPosition.z + (fondPosition.z - bureauPosition.z) * progress;
      
      const additionalRotation = THREE.MathUtils.degToRad(-40);
      const targetRotation = fondRotation + additionalRotation;
      this.camera.rotation.y = bureauRotation + (targetRotation - bureauRotation) * progress;
    } else if (t >= -2100 && t <= -1800) {
      this.camera.position.copy(new THREE.Vector3(fondPosition.x, fondPosition.y, fondPosition.z));
      this.camera.rotation.y = fondRotation + THREE.MathUtils.degToRad(-40);
    } else {
      const progress = (Math.abs(t) - 2100) / 400;
      this.camera.position.x = fondPosition.x + progress * 20;
      this.camera.position.y = fondPosition.y + progress * -10;
      this.camera.position.z = fondPosition.z + progress * 50;
      this.camera.rotation.y = fondRotation + THREE.MathUtils.degToRad(-40);
    }
  }

  /**
   * Gère le redimensionnement
   */
  onResize(): void {
    if (!this.renderer || !this.camera) return;
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.boundMoveCamera) {
      window.removeEventListener('scroll', this.boundMoveCamera);
    }
    
    if (this.boundMouseMove) {
      window.removeEventListener('mousemove', this.boundMouseMove);
    }
    
    Object.values(this.models).forEach(model => {
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
    });
    
    this.models = {};
    
    if (this.renderer) this.renderer.dispose();
    
    this.initialized = false;
  }
}