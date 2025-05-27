import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service spécialisé pour gérer les effets Three.js d'arrière-plan
 * 
 * Ce service est responsable de:
 * - L'initialisation et la gestion de la scène Three.js pour l'arrière-plan
 * - La création et l'animation d'objets 3D qui réagissent au défilement
 * - L'application d'effets de parallaxe et d'animation sur les éléments de fond
 * - L'optimisation des performances pour les animations d'arrière-plan
 * - La génération d'effets visuels réactifs aux interactions utilisateur
 * - La synchronisation des animations avec le défilement et les mouvements de souris
 */
@Injectable({
  providedIn: 'root'
})
export class BackgroundThreeService {
  private backgroundScene!: THREE.Scene;
  private backgroundCamera!: THREE.PerspectiveCamera;
  private backgroundRenderer!: THREE.WebGLRenderer;
  private backgroundObjects: THREE.Mesh[] = [];
  private light!: THREE.PointLight;
  private ambientLight!: THREE.AmbientLight; 
  private clock = new THREE.Clock();
  private scrollPosition = new BehaviorSubject<number>(0);
  private mousePosition = new THREE.Vector2(0, 0);
  
  private animationFrameId: number | null = null;

  constructor() {}

  /**
   * Initialise la scène Three.js pour le background
   * @param canvas L'élément canvas où rendre la scène
   */
  initBackground(canvas: HTMLCanvasElement) {
    // Initialisation de la scène
    this.backgroundScene = new THREE.Scene();
    
    // Configuration de la caméra
    this.backgroundCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.backgroundCamera.position.set(0, 0, 5);

    // Configuration du renderer
    this.backgroundRenderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      alpha: true,
      antialias: true,
      precision: 'mediump'
    });
    this.backgroundRenderer.setSize(window.innerWidth, window.innerHeight);
    this.backgroundRenderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    
    // Configurer les lumières
    this.setupLights();
    
    // Initialiser les objets de fond
    this.initScrollObjects();
    
    // Démarrer l'animation
    this.animate();
  }

  /**
   * Configure les lumières pour la scène de fond
   */
  private setupLights() {
    // Lumière ambiante
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.backgroundScene.add(this.ambientLight);
    
    // Lumière ponctuelle principale
    this.light = new THREE.PointLight(0xffffff, 0.8);
    this.light.position.set(0, 0, 2);
    this.backgroundScene.add(this.light);
    
    // Lumières additionnelles pour créer une ambiance plus riche
    const blueLight = new THREE.PointLight(0x4444ff, 0.5);
    blueLight.position.set(-5, 3, -3);
    this.backgroundScene.add(blueLight);
    
    const pinkLight = new THREE.PointLight(0xff44aa, 0.3);
    pinkLight.position.set(5, -2, -1);
    this.backgroundScene.add(pinkLight);
  }

  /**
   * Initialise les objets 3D qui réagiront au défilement
   */
  private initScrollObjects() {
    // Nettoyer les objets existants si nécessaire
    this.backgroundObjects.forEach(obj => this.backgroundScene.remove(obj));
    this.backgroundObjects = [];
    
    // Créer des objets géométriques plus variés pour l'arrière-plan
    const geometries = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.TorusGeometry(0.7, 0.3, 16, 100),
      new THREE.TorusKnotGeometry(0.6, 0.25, 64, 8, 2, 3),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.DodecahedronGeometry(0.8, 0),
      new THREE.SphereGeometry(0.7, 8, 8)
    ];
    
    // Utiliser une palette de couleurs plus cohérente
    const colorPalette = [
      new THREE.Color(0x6666ff), // Bleu
      new THREE.Color(0x66ccff), // Bleu ciel
      new THREE.Color(0x44aaff), // Bleu électrique
      new THREE.Color(0x8866ff), // Violet
      new THREE.Color(0xaa66ff)  // Pourpre
    ];
    
    // Créer plusieurs objets et les placer dans l'espace
    const numObjects = 20; // Augmenter le nombre d'objets
    
    for (let i = 0; i < numObjects; i++) {
      // Sélectionner une géométrie aléatoire
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      
      // Déterminer si l'objet sera wireframe
      const isWireframe = Math.random() > 0.5;
      
      // Sélectionner une couleur de la palette
      const baseColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      
      // Légère variation de couleur
      const color = new THREE.Color(baseColor);
      color.r += (Math.random() - 0.5) * 0.2;
      color.g += (Math.random() - 0.5) * 0.2;
      color.b += (Math.random() - 0.5) * 0.2;
      
      // Créer un matériau semi-transparent
      const material = isWireframe ? 
        new THREE.MeshPhongMaterial({
          color: color,
          wireframe: true,
          transparent: true,
          opacity: Math.random() * 0.4 + 0.4
        }) :
        new THREE.MeshPhongMaterial({
          color: color,
          transparent: true,
          opacity: Math.random() * 0.3 + 0.2,
          side: THREE.DoubleSide,
          shininess: Math.random() * 100
        });
      
      // Créer le mesh
      const mesh = new THREE.Mesh(geometry, material);
      
      // Distribution spatiale plus intéressante
      const radius = 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      // Distribution sphérique pour certains objets
      if (i % 3 === 0) {
        mesh.position.set(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi) - 10
        );
      } else {
        // Distribution plus cubique pour les autres
        mesh.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10 - 5
        );
      }
      
      // Rotation initiale aléatoire
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      // Taille aléatoire
      const scale = Math.random() * 1 + 0.5;
      mesh.scale.set(scale, scale, scale);
      
      // Stocker les propriétés originales pour les animations
      mesh.userData = {
        originalPosition: {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z
        },
        originalRotation: {
          x: mesh.rotation.x,
          y: mesh.rotation.y,
          z: mesh.rotation.z
        },
        originalScale: scale,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.003,
          y: (Math.random() - 0.5) * 0.003,
          z: (Math.random() - 0.5) * 0.003
        },
        group: i % 4 // Grouper les objets pour des animations différentes
      };
      
      // Ajouter à la scène et au tableau d'objets
      this.backgroundScene.add(mesh);
      this.backgroundObjects.push(mesh);
    }
  }

  /**
   * Met à jour la position de défilement et déclenche des animations
   * @param scrollY Position de défilement vertical
   */
  updateScrollPosition(scrollY: number) {
    this.scrollPosition.next(scrollY);
    this.updateBackgroundOnScroll(scrollY);
  }
  
  /**
   * Obtient la position actuelle de défilement
   */
  getScrollPosition(): Observable<number> {
    return this.scrollPosition.asObservable();
  }
  
  /**
   * Met à jour les éléments du background en fonction de la position de défilement
   * @param scrollY Position de défilement vertical
   */
  private updateBackgroundOnScroll(scrollY: number) {
    if (!this.backgroundScene) return;
    
    // Calculer les facteurs d'effet
    const scrollFactor = scrollY * 0.001;
    const viewportHeight = window.innerHeight;
    
    // Appliquer des effets aux objets de fond
    this.backgroundObjects.forEach((obj, index) => {
      // Stocker les positions et échelles originales si ce n'est pas déjà fait
      if (!obj.userData['originalPosition']) {
        obj.userData['originalPosition'] = {
          x: obj.position.x,
          y: obj.position.y,
          z: obj.position.z
        };
      }
      if (!obj.userData['originalScale']) {
        obj.userData['originalScale'] = obj.scale.x;
      }
      if (!obj.userData['originalRotation']) {
        obj.userData['originalRotation'] = {
          x: obj.rotation.x,
          y: obj.rotation.y,
          z: obj.rotation.z
        };
      }
      
      const originalPos = obj.userData['originalPosition'];
      const originalScale = obj.userData['originalScale'];
      
      // Effet de parallaxe avancé en fonction de la profondeur Z
      // Plus l'objet est loin (Z négatif), plus l'effet est prononcé
      const zDepth = originalPos.z;
      const parallaxStrength = Math.max(0.5, Math.abs(zDepth) * 0.2);
      const depthFactor = (index % 4) * 0.15 + 0.7; // Variation par groupe d'objets
      
      // Parallaxe horizontal et vertical basé sur le défilement
      const horizontalOffset = Math.sin(scrollFactor * 0.8 + index * 0.2) * parallaxStrength;
      const verticalOffset = Math.cos(scrollFactor * 0.5 + index * 0.3) * parallaxStrength * 0.7;
      
      // Appliquer un mouvement orbital pour certains objets
      if (index % 3 === 0) {
        const orbitRadius = 0.8;
        const orbitSpeed = 0.2;
        obj.position.x = originalPos.x + Math.sin(scrollFactor * orbitSpeed + index) * orbitRadius;
        obj.position.z = originalPos.z + Math.cos(scrollFactor * orbitSpeed + index) * orbitRadius * 0.5;
      } else {
        // Pour les autres objets, appliquer un mouvement d'oscillation bidimensionnelle
        obj.position.x = originalPos.x + horizontalOffset;
        obj.position.z = originalPos.z + Math.sin(scrollFactor * 0.3 + index) * 0.2;
      }
      
      // Mouvement vertical avec variation de phase par objet
      obj.position.y = originalPos.y + verticalOffset;
      
      // Rotation dynamique avec plusieurs axes
      obj.rotation.y = originalPos.y + scrollFactor * depthFactor;
      obj.rotation.x = originalPos.x + Math.sin(scrollFactor * 0.5) * (index % 3 === 0 ? 0.3 : 0.15);
      obj.rotation.z = originalPos.z + Math.cos(scrollFactor * 0.3 + index * 0.2) * 0.1;
      
      // Effet de pulsation sur la taille (différent selon l'indice)
      const pulsePhase = index * 0.25;
      const pulseFrequency = 0.4 + (index % 5) * 0.1;
      const pulseAmplitude = 0.1 + (index % 3) * 0.05;
      
      const pulseFactor = 1 + Math.sin(scrollFactor * pulseFrequency + pulsePhase) * pulseAmplitude;
      obj.scale.set(
        originalScale * pulseFactor * (1 + Math.sin(scrollFactor * 0.3) * 0.05),
        originalScale * pulseFactor, 
        originalScale * pulseFactor * (1 + Math.cos(scrollFactor * 0.2) * 0.05)
      );
      
      // Effet de transparence en fonction du défilement pour certains objets
      if (obj.material instanceof THREE.Material && obj.material.transparent) {
        const baseTrans = 0.25 + (index % 5) * 0.05;
        const transVariation = 0.15;
        obj.material.opacity = baseTrans + Math.sin(scrollFactor * 0.4 + index) * transVariation;
      }
    });
    
    // Effets de lumière avancés
    if (this.light) {
      // Variation d'intensité lumineuse avec interpolation douce
      this.light.intensity = 0.8 + Math.sin(scrollFactor * 0.8) * 0.3;
      
      // Mouvement orbital de la lumière
      this.light.position.x = Math.sin(scrollFactor * 0.2) * 3;
      this.light.position.y = 1 + Math.cos(scrollFactor * 0.15) * 1;
      this.light.position.z = 2 + Math.sin(scrollFactor * 0.1) * 1;
      
      // Transitions de couleur plus élaborées
      const hue = (scrollFactor * 0.01) % 1;
      const saturation = 0.5 + Math.sin(scrollFactor * 0.05) * 0.2;
      const lightness = 0.6 + Math.sin(scrollFactor * 0.07) * 0.1;
      this.light.color.setHSL(hue, saturation, lightness);
    }
    
    // Appliquer un effet subtil à la lumière ambiante aussi
    if (this.ambientLight) {
      const ambientIntensity = 0.3 + Math.sin(scrollFactor * 0.1) * 0.05;
      this.ambientLight.intensity = ambientIntensity;
    }
  }

  /**
   * Gère le redimensionnement de la fenêtre
   */
  onResize() {
    if (!this.backgroundRenderer || !this.backgroundCamera) return;
    
    this.backgroundRenderer.setSize(window.innerWidth, window.innerHeight);
    this.backgroundCamera.aspect = window.innerWidth / window.innerHeight;
    this.backgroundCamera.updateProjectionMatrix();
  }

  /**
   * Boucle d'animation principale
   */
  animate() {
    if (!this.backgroundRenderer || !this.backgroundScene || !this.backgroundCamera) return;

    const render = () => {
      const delta = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();
      
      // Animation automatique des objets de fond avec des mouvements plus complexes
      this.backgroundObjects.forEach((obj, index) => {
        // Rotation de base automatique
        obj.rotation.x += 0.001 * (index % 2 ? 1 : -1);
        obj.rotation.z += 0.001 * (index % 3 ? 1 : -1);
        
        // Ajout d'une légère oscillation pour les objets les plus éloignés
        if (obj.position.z < -2) {
          // Mouvement sinusoïdal subtil
          const oscillationSpeed = 0.2 + (index % 4) * 0.05;
          const oscillationAmplitude = 0.02;
          
          obj.position.y += Math.sin(elapsedTime * oscillationSpeed) * oscillationAmplitude * delta;
          obj.position.x += Math.cos(elapsedTime * oscillationSpeed * 0.7) * oscillationAmplitude * delta;
        }
        
        // Effet d'ondulation pour certains objets wireframe
        if (obj.material instanceof THREE.MeshPhongMaterial && obj.material.wireframe) {
          const pulseFactor = 1 + Math.sin(elapsedTime * (0.5 + index * 0.1)) * 0.03;
          obj.scale.set(pulseFactor, pulseFactor, pulseFactor);
        }
      });
      
      // Animation subtile de la caméra
      if (this.mousePosition.x !== 0 || this.mousePosition.y !== 0) {
        // Lissage du mouvement de la caméra en direction de la souris
        this.backgroundCamera.position.x += (this.mousePosition.x * 0.5 - this.backgroundCamera.position.x) * 0.01;
        this.backgroundCamera.position.y += (this.mousePosition.y * 0.3 - this.backgroundCamera.position.y) * 0.01;
        this.backgroundCamera.lookAt(0, 0, 0);
      }
      
      // Rendu de la scène
      this.backgroundRenderer.render(this.backgroundScene, this.backgroundCamera);
      
      // Continuer la boucle d'animation
      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }
  
  /**
   * Met à jour la position de la souris pour les effets interactifs
   * @param mouseX Position X de la souris (-1 à 1)
   * @param mouseY Position Y de la souris (-1 à 1)
   */
  updateMousePosition(mouseX: number, mouseY: number) {
    this.mousePosition.x = mouseX;
    this.mousePosition.y = mouseY;
    
    // Effet léger de suivi de la souris pour la lumière principale
    if (this.light) {
      this.light.position.x += (mouseX * 2 - this.light.position.x) * 0.05;
      this.light.position.y += (mouseY * 1 - this.light.position.y) * 0.05;
    }
  }

  /**
   * Nettoie les ressources pour éviter les fuites de mémoire
   */
  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Nettoyer la scène et les ressources
    this.backgroundScene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.backgroundRenderer?.dispose();
  }
}
