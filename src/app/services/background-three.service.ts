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


  constructor() {}

  /**
   * Initialise la scène Three.js pour le background
   * @param canvas L'élément canvas où rendre la scène
   */
  init(canvas: HTMLCanvasElement) {
    if (!canvas) return;
    
    // Initialisation de la scène
    this.scene = new THREE.Scene();
    
    // Configuration de la caméra
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.setZ(30);
    this.camera.position.setX(-3);

    // Configuration du renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    this.renderer.setClearColor(0x000000, 0.3); // Fond légèrement transparent
    
    // Ajout de lumières////////////////////////////////////////////////////LIGHTS
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(pointLight, ambientLight);
    
    const lighthelper =new THREE.PointLightHelper(pointLight, 1);
    const gridHelper = new THREE.GridHelper(400, 50);
    this.scene.add(lighthelper,gridHelper);
    // Chargement des modèles
    this.loadModels();
    
    // Configurer le gestionnaire de scroll - utiliser addEventListener pour plus de fiabilité
    this.boundMoveCamera = this.moveCamera.bind(this);
    window.addEventListener('scroll', this.boundMoveCamera);
    console.log('Gestionnaire de scroll attaché');
        
    // Ajouter le gestionnaire de mouvement de souris
    this.boundMouseMove = this.handleMouseMove.bind(this);
    window.addEventListener('mousemove', this.boundMouseMove);
    console.log('Gestionnaire de mouvement souris attaché');

    this.moveCamera(); // Position initiale
    
    // Démarrer l'animation
    this.animate();
  }

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
  private loadModels() {
    console.log('Chargement des modèles...');
    
    // Charger le bureau
    this.loadGLB('scene_bureau', 'assets/models/scene_bureau.glb', { x: 0, y: -5, z: 10 }, 1, (bureau) => {
      // Positionner le bureau légèrement en avant et en bas pour une meilleure visibilité
      bureau.position.y = -25;
      bureau.position.z = 3;
      bureau.position.x = 5;
      //bureau.rotation.x = THREE.MathUtils.degToRad(80); // Convertir 80 degrés en radians
      bureau.rotation.y = THREE.MathUtils.degToRad(-35);  // Rotation pour que le bureau soit face à la caméra
    });
    //// Charger le fond
        this.loadGLB('scene_fond', 'assets/models/scene_fond.glb', { x: 0, y: -5, z: 10 }, 1, (fond) => {
      // Positionner le bureau légèrement en avant et en bas pour une meilleure visibilité
      fond.position.y = 30;
      fond.position.z = -190;
      fond.position.x = -20;
      fond.rotation.x = 0.2; // Légère inclinaison pour mieux voir
    });
    
    // Charger les prismes
    this.loadGLB('prisme', 'assets/models/prisme.glb', { x: 10, y: 0, z: 0 }, 1, (prisme) => {
      prisme.rotation.y = Math.PI / 4;
      
      // Créer plus de prismes dans un volume plus grand pour mieux percevoir la profondeur
      for (let i = 0; i < 100; i++) {
        const clone = prisme.clone();
        
        // Distribution sur une plus grande zone pour mieux voir l'effet de parallaxe
        clone.position.set(
          THREE.MathUtils.randFloatSpread(200),  // Plus large distribution
          THREE.MathUtils.randFloatSpread(200),  // Plus large distribution
          THREE.MathUtils.randFloatSpread(300)   // Beaucoup plus profond pour bien voir l'effet de scroll
        );
        
        clone.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        // Variation de taille plus prononcée
        clone.scale.setScalar(0.3 + Math.random() * 1.2);
        
        
        this.scene.add(clone);
      }
    });
  }
  
  /**
   * Charge un modèle GLB
   */
  private loadGLB(name: string, path: string, position: { x: number, y: number, z: number }, scale: number, onLoad?: (model: THREE.Group) => void) {
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

  /**
   * Gère le mouvement de la caméra en fonction du défilement
   */
  private lastRotationY: number = 25.1; 
  
/**
 * Gère le mouvement de la caméra en fonction du défilement
 */
private lastPosition = { x: -3, y: 0, z: 300 }; // Stocker la dernière position

private moveCamera() {
  const t = document.body.getBoundingClientRect().top;
  console.log('Scroll position:', t);

  const initialPosition = { x: -3, y: 0, z: 300 };
  const bureauPosition = { x: 20, y: -20, z: 10 };

  // Calculer la rotation cible pour éviter les sauts brusques
  const transitionRotation = 25.1 + (-650) * -0.001;

  if (t > -650) {
    // Section 1 : Transition progressive vers le bureau
    const progress = Math.abs(t) / 650;
    this.camera.position.x = initialPosition.x + (bureauPosition.x - initialPosition.x) * progress;
    this.camera.position.y = initialPosition.y + (bureauPosition.y - initialPosition.y) * progress;
    this.camera.position.z = initialPosition.z + (bureauPosition.z - initialPosition.z) * progress;

    const newRotationY = 25.1 + t * -0.001;
    this.camera.rotation.y += (newRotationY - this.camera.rotation.y) * 0.1;
  } else if (t >= -850 && t <= -650) {
    // Section 2 : Stagnation pour observer le bureau
    // Transition douce pour éviter les sauts
    this.camera.position.x += (bureauPosition.x - this.camera.position.x) * 0.1;
    this.camera.position.y += (bureauPosition.y - this.camera.position.y) * 0.1;
    this.camera.position.z += (bureauPosition.z - this.camera.position.z) * 0.1;

    this.camera.rotation.y += (transitionRotation - this.camera.rotation.y) * 0.1;
  } else {
    // Section 3 : Transition après le bureau
    const rotationAt850 = transitionRotation + ((-850) + 650) * -0.001;
    const rotationOffset = (t - (-850)) * -0.0005; // Coefficient réduit pour éviter les tours rapides
    const newRotationY = rotationAt850 + rotationOffset;

    const nextZ = bureauPosition.z + (t + 850) * 0.03;
    const nextX = bureauPosition.x + (t + 850) * -0.002;

    // Transition douce des positions
    this.camera.position.z += (nextZ - this.camera.position.z) * 0.05;
    this.camera.position.x += (nextX - this.camera.position.x) * 0.05;

    // Transition douce pour la rotation
    this.camera.rotation.y += (newRotationY - this.camera.rotation.y) * 0.02;
  }



  // Animation des prismes
  if (this.models['prisme']) {
    const targetPrismeRotation = t * -0.002;
    this.models['prisme'].rotation.y += (targetPrismeRotation - this.models['prisme'].rotation.y) * 0.05;
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
}