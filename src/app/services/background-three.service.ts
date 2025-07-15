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
  private targetRotationX = 0;
  private targetRotationY = 0;
  private light!: THREE.PointLight; // Déclaration de la lumière mobile


  constructor() {}

  /**
   * Initialise la scène Three.js pour le background
   * @param canvas L'élément canvas où rendre la scène
   */
  init(canvas: HTMLCanvasElement) {
    if (!canvas) return;
    
    console.error('===== INITIALISATION DE LA SCÈNE THREE.JS =====');
    
    // =============================== INITIALISATION SCENE ===============================
    this.scene = new THREE.Scene();
    //this.scene.fog = new THREE.Fog( 0xcccccc, 1, 1000 );
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
    /*    const pointLight = new THREE.PointLight(0xffffff, 0, 20000);
    pointLight.position.set(0, 0, 100);
    pointLight.castShadow = true;
    this.scene.add(pointLight);
    */
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

    // =============================== HELPERS (désactivés) ===============================
    // const lighthelper = new THREE.PointLightHelper(pointLight, 1);
    // const gridHelper = new THREE.GridHelper(400, 50);
    // this.scene.add(lighthelper, gridHelper);

    // =============================== CHARGEMENT DES MODÈLES ===============================
    this.loadModels();

    // =============================== EVENEMENTS UTILISATEUR ===============================
    // Configurer le gestionnaire de scroll - utiliser addEventListener pour plus de fiabilité
    this.boundMoveCamera = this.moveCamera.bind(this);
    window.addEventListener('scroll', this.boundMoveCamera);
    console.log('Gestionnaire de scroll attaché');

    // Ajouter le gestionnaire de mouvement de souris
    this.boundMouseMove = this.handleMouseMove.bind(this);
    window.addEventListener('mousemove', this.boundMouseMove);
    console.log('Gestionnaire de mouvement souris attaché');

    // =============================== LUMIÈRE MOBILE SUIVANT LA CAMÉRA ===============================
    /*this.light = new THREE.PointLight(0xffffff, 200, 200); // Intensité réduite de 0.4 à 0.2
    this.light.position.copy(this.camera.position);
    this.scene.add(this.light);
*/
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

    // Limiter les rotations pour qu'elles restent subtiles
    this.targetRotationX = this.mouseY * 0.1; // Rotation subtile sur X
    this.targetRotationY = this.mouseX * 0.1; // Rotation subtile sur Y
  }
  
  /**
   * Charge les modèles 3D
   */
  // =============================== CHARGEMENT DES MODÈLES 3D ===============================
  private loadModels() {
    console.log('Chargement des modèles...');

    // ----------- BUREAU -----------
    this.loadGLB('scene_bureau', 'assets/models/scene_bureau.glb', { x: 0, y: -5, z: 10 }, 1, (bureau) => {
      // --- Initialisation position/rotation ---
      bureau.position.set(5, -23, 3);
      bureau.rotation.y = THREE.MathUtils.degToRad(-35); // Rotation initiale pour aligner le bureau



      // --- Application d'un effet d'émission aux écrans/moniteurs ---
      bureau.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          (child.name.includes('Cube.005') || child.name.includes('Cube.008') || child.name.includes('display'))
        ) {
          /*
          const emissiveMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x3333ff,
            emissiveIntensity: 0
          });*/
              const emissiveMat = new THREE.MeshStandardMaterial({

            color: 0xffffff,
      side: THREE.BackSide, // Assure la visibilité à l'intérieur

    })
          child.material = emissiveMat;
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
      console.log('Lights in scene_bureau:', lightsInModel);
      console.log('Bureau modifié avec matériau de base appliqué');
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
      console.log("Application du matériau global avec veines colorées et wireframe...");
      
      // Définir les shaders de veines colorées
      const vertexShader = `
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

      const fragmentShader = `
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
            // Face Z : utiliser X et Y
            uv = vWorldPosition.xy * 0.1;
          }

          // Première couche de noise
          float noise1 = snoise(uv + vec2(time * 0.05, 1.0));

          // Seconde couche de noise, plus petite échelle et déplacement
          float noise2 = snoise(uv * 1.5 + vec2(0.0, time * 0.03));

          // Combinaison pour créer des veines continues
          float combined = noise1 * 0.7 + noise2 * 0.3;

          // Créer des veines continues sans seuillage dur
          float veinIntensity = abs(sin(combined * 3.14159 * 2.0)) * 0.8 + 0.2;

          // Couleur de la veine (dégradé cyclique)
          float t = fract(uv.x + time * 0.1 + combined * 0.5);
          vec3 veinColor = getColor(t);

          // Couleur de base pierre avec variation subtile
          vec3 stoneColor = vec3(0.8 + 0.2 * snoise(uv * 0.5));

          // Variation de luminosité basée sur le bruit pour créer des zones sombres et claires
          float lightVariation = (noise1 + noise2) * 0.3 + 0.7;
          stoneColor *= lightVariation;

          // Effet de contour basé sur la normale pour faire ressortir les formes
          float edgeFactor = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          edgeFactor = smoothstep(0.3, 0.7, edgeFactor) * 0.2;
          
          // Assombrir les bords pour donner du volume
          stoneColor = mix(stoneColor, vec3(0.4), edgeFactor);

          // Mélanger les couleurs avec les veines toujours visibles
          // Les veines s'adaptent à la luminosité de la pierre
          vec3 finalVeinColor = veinColor * (lightVariation * 0.5 + 0.5);
          vec3 finalColor = mix(stoneColor, finalVeinColor, veinIntensity * 0.6);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `;
      
      const debugMaterials: {name: string, oldMaterial: string, color: string}[] = [];
      
      this.scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          // Exclure TOUTES les sphères d'environnement (très grandes)
          !(child.geometry instanceof THREE.SphereGeometry && 
            child.geometry.parameters?.radius >= 1000) &&
          // Exclure toutes les sphères avec ShaderMaterial (comme notre petite sphère de test)
          !(child.material instanceof THREE.ShaderMaterial) &&
          // Exclure les écrans/moniteurs (qui ont leur propre matériau émissif)
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
          

          // Créer un matériau avec shader de veines colorées
          const veinMaterial = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.FrontSide,
            uniforms: {
              time: { value: 0 }
            }
          });

          // Créer un matériau wireframe transparent
          const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.15,
            side: THREE.FrontSide
          });

          // Remplacer le mesh original par le mesh avec veines
          const baseMesh = new THREE.Mesh(child.geometry, veinMaterial);
          baseMesh.position.copy(child.position);
          baseMesh.rotation.copy(child.rotation);
          baseMesh.scale.copy(child.scale);
          baseMesh.castShadow = true;
          baseMesh.receiveShadow = true;

          // Créer le wireframe superposé
          const wireframeMesh = new THREE.Mesh(child.geometry, wireframeMaterial);
          wireframeMesh.position.copy(child.position);
          wireframeMesh.rotation.copy(child.rotation);
          wireframeMesh.scale.copy(child.scale);
          wireframeMesh.castShadow = false;
          wireframeMesh.receiveShadow = false;

          // Ajouter les deux meshes à la scène
          if (child.parent) {
            child.parent.add(baseMesh);
            child.parent.add(wireframeMesh);
            // Retirer l'ancien mesh
            child.parent.remove(child);
          } else {
            this.scene.add(baseMesh);
            this.scene.add(wireframeMesh);
            this.scene.remove(child);
          }
        }
      });
      
      console.log("Matériaux appliqués:", debugMaterials);
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
        console.log(`${name}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
      },
      (error) => {
        console.error(`Erreur lors du chargement du modèle ${name}:`, error);
      }
    );
  }

private moveCamera() {
  const t = document.body.getBoundingClientRect().top;
  console.log('Scroll position:', t);

  // Log de la position initiale de la caméra avant toute modification
  this.logCameraInfo(`Camera avant défilement (scroll: ${t})`);
  const lights = this.getLightsInScene();
console.log('Lights in scene:', lights);

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

  // Mettre à jour la position et la rotation de la lumière
  if (this.light) {
    this.light.position.copy(this.camera.position);
    this.light.rotation.copy(this.camera.rotation);
  }

  // Log de la position finale de la caméra après modifications
  this.logCameraInfo(`Camera après défilement (scroll: ${t})`);
}
  /**
   * Gère le redimensionnement de la fenêtre
   */
  onResize() {
    if (!this.renderer || !this.camera) return;
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Log après redimensionnement
    this.logCameraInfo('Camera après redimensionnement');
  }

  /**
   * Anime la scène
   */
  private animate() {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    // Compteur de frames pour limiter la fréquence des logs
    let frameCount = 0;

    const render = () => {
      // Log périodique de la position de la caméra (toutes les 100 frames)
      frameCount++;
      if (frameCount % 100 === 0) {
        this.logCameraInfo(`Camera pendant l'animation (frame ${frameCount})`);
      }
      
      // Mettre à jour les shaders avec uniforms time
      this.scene.children.forEach(child => {
        if (child instanceof THREE.Mesh && 
            child.material instanceof THREE.ShaderMaterial && 
            child.material.uniforms && 
            child.material.uniforms['time'] !== undefined) {
          child.material.uniforms['time'].value += 0.01;
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
   * Log la position et rotation de la caméra
   */
  private logCameraInfo(prefix: string = 'Camera info'): void {
    if (!this.camera) return;

    const pos = this.camera.position;
    const rot = this.camera.rotation;
    
    // Convertir les radians en degrés pour une meilleure lisibilité
    const rotDegrees = {
      x: THREE.MathUtils.radToDeg(rot.x).toFixed(2),
      y: THREE.MathUtils.radToDeg(rot.y).toFixed(2),
      z: THREE.MathUtils.radToDeg(rot.z).toFixed(2)
    };
    
    // Utiliser console.error pour s'assurer que le message est visible
    console.error(
      `%c${prefix}:`,
      'background: #222; color: #bada55; font-size: 16px;',
      `\nPosition: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z.toFixed(2)}`,
      `\nRotation: x=${rotDegrees.x}°, y=${rotDegrees.y}°, z=${rotDegrees.z}°`
    );

    // Créer ou mettre à jour un élément DOM pour afficher les infos
    this.displayCameraInfoOnScreen(prefix, pos, rotDegrees);
  }

  /**
   * Affiche les infos de la caméra directement sur l'écran
   */
  private displayCameraInfoOnScreen(prefix: string, pos: THREE.Vector3, rot: {x: string, y: string, z: string}): void {
    try {
      // Créer ou obtenir l'élément d'affichage
      let infoElement = document.getElementById('camera-debug-info');
      if (!infoElement) {
        infoElement = document.createElement('div');
        infoElement.id = 'camera-debug-info';
        infoElement.style.position = 'fixed';
        infoElement.style.bottom = '10px';
        infoElement.style.right = '10px';
        infoElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        infoElement.style.color = '#bada55';
        infoElement.style.padding = '10px';
        infoElement.style.borderRadius = '5px';
        infoElement.style.fontFamily = 'monospace';
        infoElement.style.fontSize = '14px';
        infoElement.style.zIndex = '9999';
        document.body.appendChild(infoElement);
      }
      
      // Mettre à jour le contenu
      infoElement.innerHTML = `
        <strong>${prefix}</strong><br>
        Position: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z.toFixed(2)}<br>
        Rotation: x=${rot.x}°, y=${rot.y}°, z=${rot.z}°
      `;
    } catch (e) {
      // Ignorer les erreurs DOM
    }
  }
  /**
   * Nettoie les ressources pour éviter les fuites de mémoire
   */
  dispose() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Supprimer les gestionnaires d'événements
    if (this.boundMoveCamera) {
      window.removeEventListener('scroll', this.boundMoveCamera);
      console.log('Gestionnaire de scroll détaché');
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
      console.log('Gestionnaire de mouvement souris détaché');
    }
    
    
    // Nettoyer le renderer
    if (this.renderer) this.renderer.dispose();
  }

  /**
   * Retourne la liste des lumières présentes dans la scène
   */
  getLightsInScene(): THREE.Light[] {
    if (!this.scene) return [];

    return this.scene.children.filter(child => child instanceof THREE.Light) as THREE.Light[];
  }

  private createEnvironment() {
    console.log("Création de l'environnement avec shader amélioré...");

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

    console.log("Sphère d'environnement ajoutée avec shader amélioré:", envSphere);
  }

}