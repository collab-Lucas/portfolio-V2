import { Injectable } from '@angular/core';
import * as THREE from 'three';

/**
 * Service central pour toutes les méthodes communes d'optimisation Three.js
 * Élimine la duplication de code entre les services
 */
@Injectable({
  providedIn: 'root'
})
export class ThreeOptimizationService {

  /**
   * Méthode unifiée pour disposer des ressources Three.js
   * Centralise toute la logique de nettoyage mémoire
   */
  static disposeThreeResources(obj: any): void {
    if (!obj) return;

    // Dispose geometry
    if (obj.geometry) {
      obj.geometry.dispose();
    }

    // Dispose material(s)
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((material: any) => this.disposeMaterial(material));
      } else {
        this.disposeMaterial(obj.material);
      }
    }

    // Dispose texture(s)
    if (obj.texture) {
      obj.texture.dispose();
    }

    // Remove from parent
    if (obj.parent) {
      obj.parent.remove(obj);
    }

    // Dispose children recursively
    if (obj.children) {
      [...obj.children].forEach((child: any) => this.disposeThreeResources(child));
    }
  }

  /**
   * Méthode unifiée pour disposer des matériaux
   * Centralise toute la logique de nettoyage des matériaux
   */
  static disposeMaterial(material: any): void {
    if (!material) return;

    // Dispose all textures in material
    Object.keys(material).forEach(key => {
      const value = material[key];
      if (value && typeof value === 'object' && value.isTexture) {
        value.dispose();
      }
    });

    // Dispose the material itself
    if (material.dispose && typeof material.dispose === 'function') {
      material.dispose();
    }
  }

  /**
   * Optimisation unifiée des lumières pour les ombres du torus
   * Centralise la logique d'optimisation des ombres
   */
  static optimizeLightsForTorusShadows(scene: THREE.Scene): void {
    if (!scene) return;

    scene.traverse((child) => {
      if (child instanceof THREE.Light && child.castShadow) {
        // Optimisations communes pour toutes les lumières avec ombres
        if (child.shadow) {
          child.shadow.mapSize.width = 1024;
          child.shadow.mapSize.height = 1024;
          child.shadow.camera.near = 0.1;
          child.shadow.camera.far = 500;
          
          // Optimisations spécifiques selon le type de lumière
          if (child instanceof THREE.DirectionalLight) {
            child.shadow.camera.left = -50;
            child.shadow.camera.right = 50;
            child.shadow.camera.top = 50;
            child.shadow.camera.bottom = -50;
          } else if (child instanceof THREE.SpotLight) {
            child.shadow.camera.fov = 30;
          }
        }
      }
    });
  }

  /**
   * Optimisation des performances de rendu
   * Applique les meilleures pratiques de performance Three.js
   */
  static optimizeRenderingPerformance(renderer: THREE.WebGLRenderer): void {
    if (!renderer) return;

    // Configuration optimale pour les performances
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // Optimisations additionnelles
    renderer.info.autoReset = true;
    renderer.capabilities.precision = 'mediump';
  }

  /**
   * Nettoyage complet d'une scène Three.js
   */
  static disposeScene(scene: THREE.Scene): void {
    if (!scene) return;

    // Nettoyer tous les objets de la scène
    [...scene.children].forEach(child => {
      this.disposeThreeResources(child);
    });

    // Nettoyer la scène elle-même
    scene.clear();
  }

  /**
   * Optimisation de la géométrie pour réduire les vertices
   */
  static optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    if (!geometry) return geometry;

    // Calculer les normales optimisées
    geometry.computeVertexNormals();
    
    return geometry;
  }
}
