import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  private boundMoveCamera: any; // Pour stocker la référence à la fonction liée
  private boundMouseMove: any; // Pour stocker la référence à la fonction de mouvement souris
  private mouseX = 0;
  private mouseY = 0;
  private animationTime = 0; // Temps d'animation interne stable


  constructor() {}

  /**
   * Initialise la scène Three.js pour le background
   * @param canvas L'élément canvas où rendre la scène
   */
  init(canvas: HTMLCanvasElement) {
    if (!canvas) return;
    
    // =============================== INITIALISATION SCENE ===============================
    this.scene = new THREE.Scene();
    // =============================== INITIALISATION CAMERA ===============================
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.setZ(300);
    this.camera.position.setX(-3);
    this.camera.position.setY(0);
    this.camera.rotation.z = THREE.MathUtils.degToRad(0); // Rotation initiale pour aligner la caméra
    this.camera.rotation.x = THREE.MathUtils.degToRad(0); // Rotation initiale pour aligner la caméra
    this.camera.rotation.y = THREE.MathUtils.degToRad(-3.69); // Rotation initiale pour aligner la caméra

    // =============================== INITIALISATION RENDERER ===============================
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: false,  // Désactiver alpha pour un fond solide
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    this.renderer.setClearColor(0xffffff, 0); // Fond noir opaque

    // Activer les ombres dans le renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // =============================== AJOUT DE LUMIÈRES ===============================
    // Lumière directionnelle principale pour ombres marquées
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.bias = -0.001;
    this.scene.add(directionalLight);

    // Lumière ambiante faible pour garder du contraste
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    // Brouillard gris avec distances optimisées
    this.scene.fog = new THREE.Fog(0xcccccc, 1, 500);

    // =============================== CHARGEMENT DES MODÈLES ===============================
    this.loadModels();

    // =============================== EVENEMENTS UTILISATEUR ===============================
    // Configurer le gestionnaire de scroll - utiliser addEventListener pour plus de fiabilité
    this.boundMoveCamera = this.moveCamera.bind(this);
    window.addEventListener('scroll', this.boundMoveCamera);

    // Ajouter le gestionnaire de mouvement de souris
    this.boundMouseMove = this.handleMouseMove.bind(this);
    window.addEventListener('mousemove', this.boundMouseMove);

    // =============================== POSITION INITIALE CAMERA ===============================
    this.moveCamera();

    // =============================== ENVIRONNEMENT 3D (FOND) ===============================
    this.createEnvironment();

    // =============================== DÉMARRAGE ANIMATION ===============================
    this.animate();
  }

  // =============================== GESTION MOUVEMENT SOURIS ===============================
  private handleMouseMove(event: MouseEvent) {
    // Calcul de la position relative de la souris (-1 à 1)
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  
  /**
   * Charge les modèles 3D
   */
  // =============================== CHARGEMENT DES MODÈLES 3D ===============================
  private loadModels() {
    // ----------- BUREAU -----------
    this.loadGLB('scene_bureau', 'assets/models/scene_bureau.glb', { x: 0, y: -5, z: 10 }, 1, (bureau) => {
      // --- Initialisation position/rotation ---
      bureau.position.set(5, -23, 3);
      bureau.rotation.y = THREE.MathUtils.degToRad(-35); // Rotation initiale pour aligner le bureau



      // --- Application d'un effet d'émission aux écrans/moniteurs ---
      bureau.traverse((child) => {
        if (child instanceof THREE.Mesh && (child.name.includes('Cube008') || child.name.includes('Cube005'))) {
          // Matériau avec shader pour effet animé avec blur/halo
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
                
                // Effet de clignotement subtil avec variation
                float flicker = 0.9 + 0.1 * sin(time * 2.0);
                
                // Gradient principal de l'écran - plus stable
                float screenGradient = 1.0 - smoothstep(0.0, 0.5, distFromCenter);
                
                // Couleur de base stable
                vec3 screenColor = mix(baseColor, glowColor, 0.3);
                
                // Effet de halo plus doux
                float halo = 1.0 - smoothstep(0.0, haloSize, distFromCenter);
                halo = pow(halo, 1.5);
                
                // Combinaison finale plus stable
                vec3 finalColor = screenColor * flicker;
                finalColor = mix(finalColor, glowColor, halo * 0.2);
                
                // Effet de scanlines très subtil
                float scanline = sin(vUv.y * 80.0) * 0.01;
                finalColor += scanline;
                
                // Assurer que la couleur reste dans une plage stable
                finalColor = clamp(finalColor, 0.0, 1.0);
                
                gl_FragColor = vec4(finalColor, 1.0);
              }
            `,
            side: THREE.FrontSide,
            transparent: false,
            blending: THREE.NormalBlending // Blending normal pour couleur stable
          });
          
          child.material = screenMaterial;
        }
      });

      // Désactiver toutes les lumières du modèle "scene_bureau"
      bureau.traverse((child) => {
        if (child instanceof THREE.Light) {
          child.intensity = 0;
        }
      });

      // --- Debug : liste des lumières du modèle ---
      const lightsInModel: THREE.Light[] = [];
      bureau.traverse((child) => {
        if (child instanceof THREE.Light) {
          lightsInModel.push(child);
        }
      });

      // --- Debug : liste de tous les éléments/meshes du modèle scene_bureau ---
      console.log('=== ÉLÉMENTS/MESHES dans scene_bureau ===');
      const meshesInBureau: { name: string, type: string, geometry?: string, material?: string }[] = [];
      bureau.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const meshInfo = {
            name: child.name || 'unnamed',
            type: 'Mesh',
            geometry: child.geometry.type,
            material: child.material ? (Array.isArray(child.material) ? child.material.map(m => m.type).join(', ') : child.material.type) : 'undefined'
          };
          meshesInBureau.push(meshInfo);
          console.log(`Mesh: "${child.name}" | Géométrie: ${meshInfo.geometry} | Matériau: ${meshInfo.material}`);
        } else if (child instanceof THREE.Group) {
          console.log(`Group: "${child.name || 'unnamed'}" | Enfants: ${child.children.length}`);
        } else if (child instanceof THREE.Object3D) {
          console.log(`Object3D: "${child.name || 'unnamed'}" | Type: ${child.type}`);
        }
      });
      console.log(`Total meshes trouvés: ${meshesInBureau.length}`);
      console.log('=== FIN LISTE scene_bureau ===');
    });

    // ----------- FOND -----------
    this.loadGLB('scene_fond', 'assets/models/scene_fond.glb', { x: 0, y: -5, z: 10 }, 1, (fond) => {
      // Positionnement et inclinaison du fond
      fond.position.y = 29.5;
      fond.position.z = -75;
      fond.position.x = 59;
      fond.rotation.y = THREE.MathUtils.degToRad(-65);; // Légère inclinaison pour mieux voir
    });

    // ----------- PRISMES -----------
    this.loadGLB('prisme', 'assets/models/prisme.glb', { x: 10, y: 0, z: 0 }, 1, (prisme) => {
      prisme.rotation.y = Math.PI / 4;

      // Génération de clones pour effet de profondeur
      for (let i = 0; i < 100; i++) {
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
    });

    // ----------- MATÉRIAUX GLOBAUX (hors sphère d'environnement) -----------
    // Application différée des matériaux pour s'assurer que tous les modèles sont chargés
    setTimeout(() => {
      const debugMaterials: {name: string, oldMaterial: string, color: string}[] = [];
      
      this.scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          // Exclure TOUTES les sphères d'environnement (très grandes)
          !(child.geometry instanceof THREE.SphereGeometry && 
            child.geometry.parameters?.radius >= 1000) &&
          // Exclure toutes les sphères avec ShaderMaterial
          !(child.material instanceof THREE.ShaderMaterial) &&
          // Exclure les écrans/moniteurs
          !(child.name && (child.name.includes('screen') || child.name.includes('Cube005') || child.name.includes('Cube008')))
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
            this.scene.add(overlayMesh);
          }
        }
      });
      
    }, 500); // Attendre que tous les modèles soient chargés
  }
  
  /**
   * Charge un modèle GLB
   */
  // =============================== CHARGEMENT GLB (générique) ===============================
  private loadGLB(
    name: string,
    path: string,
    position: { x: number, y: number, z: number },
    scale: number,
    onLoad?: (model: THREE.Group) => void
  ) {
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
      (xhr) => {
        // Progress loading
      },
      (error) => {
        console.error(`Erreur lors du chargement du modèle ${name}:`, error);
      }
    );
  }

private moveCamera() {
  const t = document.body.getBoundingClientRect().top;

  const initialPosition = { x: -3, y: 0, z: 300 };
  const bureauPosition = { x: 16, y: -20, z: 9.5 };
  const fondPosition = { x: 62, y: 30, z: -70 }; // Position de scene_fond

  // Rotations fixes (en radians) pour chaque section
  const initialRotation = THREE.MathUtils.degToRad(-3.69);
  const bureauRotation = THREE.MathUtils.degToRad(-3.69 + 35);
  const fondRotation = THREE.MathUtils.degToRad(-3.69 + 70); // Rotation vers scene_fond

  if (t > -650) {
    // Section 1 : Transition progressive vers le bureau
    const progress = Math.abs(t) / 650;

    // Positions
    this.camera.position.x = initialPosition.x + (bureauPosition.x - initialPosition.x) * progress;
    this.camera.position.y = initialPosition.y + (bureauPosition.y - initialPosition.y) * progress;
    this.camera.position.z = initialPosition.z + (bureauPosition.z - initialPosition.z) * progress;

    // Rotation avec une valeur fixe à chaque étape
    const exactRotationY = initialRotation + (bureauRotation - initialRotation) * progress;

    // Appliquer directement la rotation exacte au lieu d'une interpolation
    this.camera.rotation.y = exactRotationY;
  } else if (t >= -1050 && t <= -650) {
    // Section 2 : Vue du bureau avec position et rotation fixes
    this.camera.position.x = bureauPosition.x;
    this.camera.position.y = bureauPosition.y;
    this.camera.position.z = bureauPosition.z;

    // Appliquer directement la rotation exacte du bureau
    this.camera.rotation.y = bureauRotation;
  } else if (t > -1800 && t <= -1050) {
    // Section 3 : Transition vers scene_fond
    const progress = (Math.abs(t) - 1050) / 750; // Progression entre -1050 et -1500

    // Positions
    this.camera.position.x = bureauPosition.x + (fondPosition.x - bureauPosition.x) * progress;
    this.camera.position.y = bureauPosition.y + (fondPosition.y - bureauPosition.y) * progress;
    this.camera.position.z = bureauPosition.z + (fondPosition.z - bureauPosition.z) * progress;

    // Rotation progressive vers scene_fond avec rotation supplémentaire
    const additionalRotation = THREE.MathUtils.degToRad(-40); // Rotation supplémentaire de 20 degrés
    const targetRotation = fondRotation + additionalRotation;
    const exactRotationY = bureauRotation + (targetRotation - bureauRotation) * progress;
    this.camera.rotation.y = exactRotationY;
  } else if (t >= -2100 && t <= -1800) {
    // Section 4 : Stagnation à scene_fond
    this.camera.position.x = fondPosition.x;
    this.camera.position.y = fondPosition.y;
    this.camera.position.z = fondPosition.z;

      // Rotation fixe à scene_fond avec rotation supplémentaire
    const additionalRotation = THREE.MathUtils.degToRad(-40); // Même rotation supplémentaire
    this.camera.rotation.y = fondRotation + additionalRotation;
  } else {
    // Section 5 : Après scene_fond
    const progress = (Math.abs(t) - 2100) / 400; // Progression après -2100

    // Positions
    this.camera.position.x = fondPosition.x + progress * 20; // Exemple de mouvement
    this.camera.position.y = fondPosition.y + progress * -10;
    this.camera.position.z = fondPosition.z + progress * 50;

    // Rotation continue avec la même rotation supplémentaire
    const additionalRotation = THREE.MathUtils.degToRad(-40); // Même rotation supplémentaire
    this.camera.rotation.y = fondRotation + additionalRotation;
  }
}
  /**
   * Gère le redimensionnement de la fenêtre
   */
  onResize() {
    if (!this.renderer || !this.camera) return;
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Anime la scène
   */
  private animate() {
    if (!this.renderer || !this.scene || !this.camera) return;

    const render = () => {
      // Incrémenter le temps d'animation de façon stable
      this.animationTime += 0.01;
      
      // Mettre à jour les shaders avec uniforms time
      this.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Pour les ShaderMaterial classiques
          if (child.material instanceof THREE.ShaderMaterial && 
              child.material.uniforms && 
              child.material.uniforms['time'] !== undefined) {
            child.material.uniforms['time'].value = this.animationTime;
          }
          // Pour les matériaux avec onBeforeCompile
          else if (child.material instanceof THREE.MeshBasicMaterial && 
                   child.material.userData && 
                   child.material.userData['shader'] && 
                   child.material.userData['shader'].uniforms && 
                   child.material.userData['shader'].uniforms['time']) {
            child.material.userData['shader'].uniforms['time'].value = this.animationTime;
          }
        }
      });
      
      // Animation des modèles si nécessaire
      if (this.models['prisme']) {
        // Rotation continue indépendante du scroll
        this.models['prisme'].rotation.y += 0.005;
      }
      
      // Animation des prismes clonés pour plus de dynamisme
      this.scene.children.forEach(child => {
        if (child instanceof THREE.Group && 
            child !== this.models['prisme'] && 
            child !== this.models['scene_fond']) {
          child.rotation.x += 0.002;
          child.rotation.y += 0.003;
        }
      });
      

            // Animation du bureau basée sur la souris
      if (this.models['scene_bureau']) {
        const bureau = this.models['scene_bureau'];

        // Rotation initiale sur Y (base)
        const initialRotationY = THREE.MathUtils.degToRad(-35);

        // Ajouter une rotation basée sur la souris
        const mouseRotationX = this.mouseY * 0.01; // Rotation subtile sur X
        const mouseRotationY = this.mouseX * 0.01; // Rotation subtile sur Y

        // Appliquer les rotations en ajoutant à la rotation initiale
        bureau.rotation.x = mouseRotationX; // Rotation sur X basée sur la souris
        bureau.rotation.y = initialRotationY + mouseRotationY; // Rotation sur Y basée sur la souris

        // Oscillation sur Z uniquement dans la zone de stagnation
        const t = document.body.getBoundingClientRect().top;
        if (t >= -850 && t <= -650) {
          bureau.rotation.z = Math.sin(Date.now() * 0.001) * 0.01; // Oscillation subtile
        } else {
          bureau.rotation.z *= 0.95; // Réduction progressive hors de la zone
        }
      }

      // Rendu de la scène
      this.renderer.render(this.scene, this.camera);
      this.animationId = requestAnimationFrame(render);
    };

    render();
  }

  /**
   * Nettoie les ressources pour éviter les fuites de mémoire
   */
  dispose() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Réinitialiser le temps d'animation
    this.animationTime = 0;
    
    // Supprimer les gestionnaires d'événements
    if (this.boundMoveCamera) {
      window.removeEventListener('scroll', this.boundMoveCamera);
    }
    
    // Nettoyer les modèles
    Object.values(this.models).forEach(model => {
      this.scene.remove(model);
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
        if (this.boundMouseMove) {
      window.removeEventListener('mousemove', this.boundMouseMove);
    }
    
    
    // Nettoyer le renderer
    if (this.renderer) this.renderer.dispose();
  }

  private createEnvironment() {
    // Ajuster la caméra pour voir le fond
    this.camera.far = 5000;
    this.camera.updateProjectionMatrix();

    // Shader pour la sphère d'environnement avec bande horizontale colorée et effets supplémentaires
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

  // === Simplex Noise 2D ===
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

  // === Dégradé cyclique fluide ===
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

  // --- Masque pour la bande (reste centré, inchangé) ---
  float dist = abs(vUv.y - bandCenter);
  float mask = 1.0 - smoothstep(bandWidth / 2.0, bandWidth / 2.0 + softness, dist);
  float glow = 1.0 - smoothstep(bandWidth / 2.0 + 0.03, bandWidth / 2.0 + 0.08, dist);

  // --- Déformer les UV uniquement pour les couleurs ---
  vec2 warpedUv = vUv;
  float deformation = snoise(vUv * 6.0 + vec2(time * 0.1, 0.0)); // noise animé
  warpedUv.x += deformation * 0.1;
  warpedUv.y += deformation * 0.1;

  // --- Gradient cyclique sur les UV déformés ---
  float gradientT = fract(warpedUv.x + time * 0.05);
  vec3 bandColor = getColor(gradientT);

  // --- Grain/bruit subtil ---
  float grain = rand(vUv + time * 0.5);
  bandColor += noiseStrength * (grain - 0.5);

  // --- Couleur finale ---
  vec3 background = vec3(0);
  vec3 finalColor = mix(background, bandColor, glow * glowIntensity);
  finalColor = mix(finalColor, bandColor, mask);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

    const geometry = new THREE.SphereGeometry(1000, 64, 64); // Sphère très grande
    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide, // Assure la visibilité à l'intérieur
      uniforms: {
        time: { value: 0 },
        glowIntensity: { value: 0.05 },
        noiseStrength: { value: 0.05 }
      }
    });

    const envSphere = new THREE.Mesh(geometry, shaderMaterial);
    envSphere.scale.set(-1, 1, 1); // Inverser la sphère pour que l'intérieur soit visible
    envSphere.renderOrder = -1000;
    this.scene.add(envSphere);
  }

}