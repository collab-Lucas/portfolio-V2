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
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    this.renderer.setClearColor(0xffffff, 0); // Fond noir opaque

    // =============================== AJOUT DE LUMIÈRES ===============================
    // Réduction de l'intensité des lumières
    const pointLight = new THREE.PointLight(0xffffff, 10000,20000); // Intensité réduite davantage
    pointLight.position.set(5, 5, 5);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2); // Intensité modérée
    ambientLight.position.set(50, 50, 50);
    this.scene.add(pointLight, ambientLight);

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
    this.light = new THREE.PointLight(0xffffff, 0.4, 200); // Intensité réduite de 0.8 à 0.4
    this.light.position.copy(this.camera.position);
    this.scene.add(this.light);

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
      bureau.rotation.y = THREE.MathUtils.degToRad(-35);

      // --- Gestion des lumières du bureau ---
      bureau.traverse((child) => {
        if (child instanceof THREE.PointLight) {
          child.intensity = 0;
          child.color.set(0xff0000); // Changer la couleur en rouge
        }
      });

      // --- Application du matériau MeshStandardMaterial à tous les Mesh du bureau ---
      bureau.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const originalMap = child.material instanceof THREE.MeshStandardMaterial ? child.material.map : null;
          const newMaterial = new THREE.MeshStandardMaterial({
            color: child.material ? child.material.color : 0xff000,
            map: originalMap,
            roughness: 0.3,
            metalness: 0.1,
            envMapIntensity: 1.0
          });
          child.material = newMaterial;
        }
      });

      // --- Application d'un effet d'émission aux écrans/moniteurs ---
      bureau.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          (child.name.includes('screen') || child.name.includes('monitor') || child.name.includes('display'))
        ) {
          const emissiveMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x3333ff,
            emissiveIntensity: 0.5
          });
          child.material = emissiveMat;
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
      fond.position.y = 30;
      fond.position.z = -100;
      fond.position.x = 50;
      fond.rotation.x = 0.2; // Légère inclinaison pour mieux voir
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
      console.log("Application du matériau global uniforme à tous les objets...");
      
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
          
          // Créer un nouveau matériau avec des paramètres FIXES (pas basés sur l'ancien matériau)
          const newMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000, // Forcer une couleur de base uniforme pour tous
            roughness: 0.3,
            metalness: 0.7,
            envMapIntensity: 1.0
          });
          
          child.material = newMaterial;
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
  const bureauPosition = { x: 20, y: -20, z: 10 };
  const fondPosition = { x: 60, y: 30, z: -100 }; // Position de scene_fond

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
  } else if (t > -1500 && t <= -1050) {
    // Section 3 : Transition vers scene_fond
    const progress = (Math.abs(t) - 1050) / 450; // Progression entre -1050 et -1500

    // Positions
    this.camera.position.x = bureauPosition.x + (fondPosition.x - bureauPosition.x) * progress;
    this.camera.position.y = bureauPosition.y + (fondPosition.y - bureauPosition.y) * progress;
    this.camera.position.z = bureauPosition.z + (fondPosition.z - bureauPosition.z) * progress;

    // Rotation progressive vers scene_fond
    const exactRotationY = bureauRotation + (fondRotation - bureauRotation) * progress;
    this.camera.rotation.y = exactRotationY;
  } else if (t >= -2000 && t <= -1500) {
    // Section 4 : Stagnation à scene_fond
    this.camera.position.x = fondPosition.x;
    this.camera.position.y = fondPosition.y;
    this.camera.position.z = fondPosition.z;

    // Rotation fixe à scene_fond
    this.camera.rotation.y = fondRotation;
  } else {
    // Section 5 : Après scene_fond
    const progress = (Math.abs(t) - 2000) / 500; // Progression après -2000

    // Positions
    this.camera.position.x = fondPosition.x + progress * 10; // Exemple de mouvement
    this.camera.position.y = fondPosition.y + progress * -5;
    this.camera.position.z = fondPosition.z + progress * 20;

    // Rotation fixe ou légère transition
    this.camera.rotation.y = fondRotation;
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
      
      // Mettre à jour le shader de la sphère d'environnement si elle existe
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
        if (child instanceof THREE.Group && child !== this.models['prisme'] && child !== this.models['scene_bureau']) {
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
    console.log("Création de l'environnement avec shader minimal...");

    // Ajuster la caméra pour voir le fond
    this.camera.far = 5000;
    this.camera.updateProjectionMatrix();

    // Shader minimal pour tester la visibilité
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      void main() {
        gl_FragColor = vec4(vUv, 0.0, 1.0); // Gradient UV simple
      }
    `;

    // Vérification et ajustement du shader pour la sphère inversée
    const geometry = new THREE.SphereGeometry(2000, 64, 64); // Sphère très grande
    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide, // Assure la visibilité à l'intérieur
      uniforms: {
        time: { value: 0 }
      }
    });

    const envSphere = new THREE.Mesh(geometry, shaderMaterial);
    envSphere.scale.set(-1, 1, 1); // Inverser la sphère pour que l'intérieur soit visible
    envSphere.renderOrder = -1000;
    this.scene.add(envSphere);

    // Correction pour appliquer le shader uniquement à la petite sphère
    const testShaderMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.FrontSide, // Assure la visibilité extérieure
      uniforms: {
        time: { value: 0 }
      }
    });

    const testGeometry = new THREE.SphereGeometry(50, 32, 32); // Sphère plus petite
    const testSphere = new THREE.Mesh(testGeometry, testShaderMaterial);
    testSphere.position.set(0, 0, -200); // Positionner la sphère devant la caméra
    testSphere.renderOrder = 0;
    this.scene.add(testSphere);
    console.log("Petite sphère corrigée avec shader distinct:", testSphere);

    // Ajout de logs pour vérifier le ShaderMaterial
    console.log("ShaderMaterial de la sphère d'environnement:", shaderMaterial);
    console.log("ShaderMaterial de la petite sphère:", testShaderMaterial);

    // Test avec un MeshBasicMaterial coloré sur la petite sphère
    const debugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });


    // Création d'une nouvelle sphère pour le test avec MeshBasicMaterial
    const debugSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    debugSphere.position.set(0, 0, -5);
    this.scene.add(debugSphere);
    console.log("Nouvelle sphère de test avec MeshBasicMaterial ajoutée à la scène:", debugSphere);

    // Création d'une sphère de test distincte avec MeshBasicMaterial
    const separateDebugSphere = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    separateDebugSphere.position.set(0, 0, -300); // Position différente pour éviter les conflits
    this.scene.add(separateDebugSphere);
    console.log("Sphère de test distincte avec MeshBasicMaterial ajoutée à la scène:", separateDebugSphere);

    console.log("Sphère d'environnement ajoutée avec shader procédural inversé:", envSphere);
  }







}