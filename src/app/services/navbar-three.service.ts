import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Interface pour les lumières de la navbar
 * Définit la structure d'une lumière avec ses propriétés configurables
 */
export interface NavbarLight {
  name: string;
  type: string;
  intensity: number;
  color: string;
  enabled: boolean;
  position?: { x: number; y: number; z: number };
  castShadow?: boolean;
}

/**
 * Service spécialisé pour gérer les effets Three.js de la barre de navigation
 * 
 * Ce service est responsable de:
 * - L'initialisation et la gestion de la scène Three.js pour la navbar
 * - La gestion des lumières et des objets 3D dans cette scène
 * - Le suivi des interactions utilisateur (mouvement de souris)
 * - La configuration des animations pour les éléments de la navbar
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
  private mixer: THREE.AnimationMixer | null = null;
  private mixers: THREE.AnimationMixer[] = [];
  private animations: THREE.AnimationClip[] = [];
  private clock = new THREE.Clock();
  
  // Variables pour gérer la synchronisation des animations
  private modelLoadingStatus = {
    ico: false,
    torus: false,
    scene: false
  };
  private animationActions: THREE.AnimationAction[] = [];

  // Lumières principales de la navbar
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private lights: NavbarLight[] = [];

  private animationFrameId: number | null = null;

  constructor() {}

  /**
   * Initialise la scène Three.js pour la navbar
   * @param canvas L'élément canvas où rendre la scène
   */
  initNavbar(canvas: HTMLCanvasElement) {
    // Initialisation de la scène, caméra, renderer
    this.navbarScene = new THREE.Scene();
    this.navbarCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.navbarCamera.position.z = 5;

    this.navbarRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    this.navbarRenderer.setSize(window.innerWidth, window.innerHeight);
    this.navbarRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Initialisation des lumières
    this.setupLights();
    
    // Ajout des objets 3D
    this.addNavbarObjects();
    
    // Démarrage de l'animation
    this.animate();
  }

  /**
   * Met en place les lumières pour la navbar
   */
  private setupLights() {
    // Lumière ambiante
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.navbarScene.add(this.ambientLight);
    this.lights.push({
      name: 'Lumière ambiante',
      type: 'AmbientLight',
      intensity: 0.4,
      color: '#ffffff',
      enabled: true
    });

    // Lumière directionnelle
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.05);
    this.directionalLight.position.set(0, 1, 2);
    this.navbarScene.add(this.directionalLight);
    this.lights.push({
      name: 'Lumière directionnelle',
      type: 'DirectionalLight',
      intensity: 0.05,
      color: '#ffffff',
      enabled: true,
      position: { x: 0, y: 1, z: 2 }
    });
  }

  /**
   * Ajoute des objets 3D à la scène de la navbar
   */
  private addNavbarObjects() {
    // Ajouter vos objets 3D pour la navbar ici
    // Par exemple, un logo 3D, etc.
    
    // Géométrie icosaèdre pour démo
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({ 
      color: this.currentColor.value,
      wireframe: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'navbarObject' }; // Marquer comme objet de la navbar
    this.navbarScene.add(mesh);
    
    // Ajouter un torus comme élément décoratif
    const torusGeometry = new THREE.TorusKnotGeometry(0.5, 0.2, 100, 16);
    const torusMaterial = new THREE.MeshStandardMaterial({ 
      color: this.currentColor.value,
      wireframe: true
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.position.set(-2, 0, 0);
    torus.userData = { type: 'navbarObject' }; // Marquer comme objet de la navbar
    this.navbarScene.add(torus);
  }

  /**
   * Gère le redimensionnement de la fenêtre
   */
  onResize() {
    if (!this.navbarRenderer || !this.navbarCamera) return;
    
    // Mettre à jour les dimensions du renderer et le ratio d'aspect de la caméra
    this.navbarRenderer.setSize(window.innerWidth, window.innerHeight);
    this.navbarCamera.aspect = window.innerWidth / window.innerHeight;
    this.navbarCamera.updateProjectionMatrix();
  }

  /**
   * Mettre à jour la position de la souris pour les effets interactifs
   * @param mouseX Position X de la souris (-1 à 1)
   * @param mouseY Position Y de la souris (-1 à 1)
   */
  updateMousePosition(mouseX: number, mouseY: number) {
    if (!this.navbarScene || !this.navbarCamera) return;
    
    // Utiliser les coordonnées de la souris pour des effets interactifs
    // Par exemple, faire tourner légèrement la caméra ou les objets
    this.navbarScene.rotation.y = mouseX * 0.1;
    this.navbarScene.rotation.x = mouseY * 0.1;
  }

  /**
   * Boucle d'animation principale
   */
  animate() {
    if (!this.navbarRenderer || !this.navbarScene || !this.navbarCamera) return;

    const render = () => {
      // Mettre à jour les mixers d'animation
      const delta = this.clock.getDelta();
      this.mixers.forEach(mixer => mixer.update(delta));
      
      // Rendu de la scène
      this.navbarRenderer.render(this.navbarScene, this.navbarCamera);
      
      // Continuer la boucle d'animation
      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  /**
   * Obtenir la couleur actuelle
   */
  getCurrentColor(): Observable<string> {
    return this.currentColor.asObservable();
  }

  /**
   * Définir la couleur actuelle
   * @param color Nouvelle couleur
   */
  setCurrentColor(color: string) {
    this.currentColor.next(color);
    
    // Mettre à jour la couleur des objets de la scène
    this.navbarScene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        object.material.color.set(color);
      }
    });
  }

  /**
   * Récupère toutes les lumières de la scène navbar
   */
  getLights(): Observable<NavbarLight[]> {
    return new BehaviorSubject<NavbarLight[]>(this.lights).asObservable();
  }

  /**
   * Modifie l'intensité d'une lumière spécifique
   * @param lightName Nom de la lumière à modifier
   * @param intensity Nouvelle intensité
   */
  setLightIntensity(lightName: string, intensity: number): void {
    // Trouver l'index de la lumière dans le tableau
    const lightIndex = this.lights.findIndex(light => light.name === lightName);
    
    if (lightIndex === -1) {
      console.warn(`Lumière "${lightName}" non trouvée`);
      return;
    }
    
    // Mettre à jour l'intensité dans le tableau de lumières
    this.lights[lightIndex].intensity = intensity;
    
    // Mettre à jour l'objet Three.js correspondant
    const light = this.findThreeLightByName(lightName);
    if (light && 'intensity' in light) {
      light.intensity = intensity;
    }
  }

  /**
   * Modifie la couleur d'une lumière spécifique
   * @param lightName Nom de la lumière à modifier
   * @param color Nouvelle couleur au format hexadécimal
   */
  setLightColor(lightName: string, color: string): void {
    // Trouver l'index de la lumière dans le tableau
    const lightIndex = this.lights.findIndex(light => light.name === lightName);
    
    if (lightIndex === -1) {
      console.warn(`Lumière "${lightName}" non trouvée`);
      return;
    }
    
    // Mettre à jour la couleur dans le tableau de lumières
    this.lights[lightIndex].color = color;
    
    // Mettre à jour l'objet Three.js correspondant
    const light = this.findThreeLightByName(lightName);
    if (light && 'color' in light && light.color instanceof THREE.Color) {
      light.color.set(color);
    }
  }

  /**
   * Active ou désactive une lumière spécifique
   * @param lightName Nom de la lumière à modifier
   */
  toggleLight(lightName: string): void {
    // Trouver l'index de la lumière dans le tableau
    const lightIndex = this.lights.findIndex(light => light.name === lightName);
    
    if (lightIndex === -1) {
      console.warn(`Lumière "${lightName}" non trouvée`);
      return;
    }
    
    // Inverser l'état d'activation
    const newState = !this.lights[lightIndex].enabled;
    this.lights[lightIndex].enabled = newState;
    
    // Mettre à jour l'objet Three.js correspondant
    const light = this.findThreeLightByName(lightName);
    if (light) {
      light.visible = newState;
    }
  }

  /**
   * Trouve une lumière Three.js par son nom
   * @param name Nom de la lumière à trouver
   * @returns L'objet Three.js Light correspondant
   */
  private findThreeLightByName(name: string): THREE.Light | null {
    let foundLight: THREE.Light | null = null;
    
    // Cas particuliers pour les lumières principales
    if (name === 'Lumière ambiante') {
      return this.ambientLight;
    } else if (name === 'Lumière directionnelle') {
      return this.directionalLight;
    }
      
    // Chercher parmi les autres lumières de la scène
    this.navbarScene.traverse((object) => {
      if (object instanceof THREE.Light && object.userData && object.userData['name'] === name) {
        foundLight = object;
      }
    });
    
    return foundLight;
  }

  /**
   * Nettoyer les ressources
   */
  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Nettoyer la scène et les ressources
    this.navbarScene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.navbarRenderer?.dispose();
  }
}
