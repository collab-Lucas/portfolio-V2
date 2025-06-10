import * as THREE from 'three';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CommonThreeService {
  /**
   * Crée un renderer Three.js avec les options spécifiées
   * @param canvas Élément canvas à utiliser
   * @param options Options du renderer
   */
  createRenderer(canvas: HTMLCanvasElement, options: { 
    alpha?: boolean; 
    antialias?: boolean;
    precision?: string;
    powerPreference?: string;
    shadowMapEnabled?: boolean;
    shadowMapType?: THREE.ShadowMapType;
    pixelRatio?: number;
  } = {}): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: options.alpha !== undefined ? options.alpha : true, 
      antialias: options.antialias !== undefined ? options.antialias : true,
      precision: options.precision || 'highp',
      powerPreference: options.powerPreference || 'high-performance' as any
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    if (options.pixelRatio !== undefined) {
      renderer.setPixelRatio(options.pixelRatio);
    } else {
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    }
    
    if (options.shadowMapEnabled) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = options.shadowMapType || THREE.PCFSoftShadowMap;
    }
    
    return renderer;
  }

  /**
   * Configure les ombres pour un objet 3D
   * @param object Objet à configurer
   * @param castShadow Si l'objet doit projeter des ombres
   * @param receiveShadow Si l'objet doit recevoir des ombres
   */
  configureShadowsForObject(object: THREE.Object3D, castShadow: boolean = true, receiveShadow: boolean = true): void {
    if (object instanceof THREE.Mesh) {
      object.castShadow = castShadow;
      object.receiveShadow = receiveShadow;
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => {
            if (mat) {
              mat.needsUpdate = true;
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                mat.roughness = Math.max(0.2, mat.roughness);
              }
            }
          });
        } else if (object.material instanceof THREE.Material) {
          object.material.needsUpdate = true;
          if (object.material instanceof THREE.MeshStandardMaterial || object.material instanceof THREE.MeshPhysicalMaterial) {
            object.material.roughness = Math.max(0.2, object.material.roughness);
          }
        }
      }
    }
    
    // Traiter les enfants récursivement
    object.children.forEach(child => {
      this.configureShadowsForObject(child, castShadow, receiveShadow);
    });
  }

  /**
   * Libère les ressources d'un matériau
   * @param material Matériau à nettoyer
   */
  disposeMaterial(material: THREE.Material): void {
    material.dispose();
    
    if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();
      if (material.metalnessMap) material.metalnessMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
    }
  }

  /**
   * Libère les ressources d'une scène Three.js
   * @param scene Scène à nettoyer
   */
  disposeScene(scene: THREE.Scene): void {
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => this.disposeMaterial(material));
          } else {
            this.disposeMaterial(object.material);
          }
        }
      }
    });
  }

  /**
   * Configure le matériau du torus pour améliorer les ombres
   */
  configureTorus(mesh: THREE.Mesh): void {
    if (!mesh.material) return;

    // D'abord, s'assurer que le mesh est configuré pour les ombres
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Traiter les tableaux de matériaux
    if (Array.isArray(mesh.material)) {
      for (let i = 0; i < mesh.material.length; i++) {
        const mat = mesh.material[i];
        if (mat instanceof THREE.MeshBasicMaterial) {
          // Remplacer les matériaux de base par des matériaux standard qui supportent les ombres
          const newMaterial = new THREE.MeshStandardMaterial({
            color: mat.color,
            transparent: mat.transparent,
            opacity: mat.opacity || 1,
            roughness: 0.4,
            metalness: 0.6,
            side: mat.side,
          });
          mesh.material[i] = newMaterial;
        } else if (mat instanceof THREE.MeshStandardMaterial) {
          // Optimiser pour un meilleur rendu des ombres
          mat.roughness = 0.4;
          mat.metalness = 0.6;
          mat.envMapIntensity = 1.0;
          
          mat.shadowSide = THREE.FrontSide;
          mat.needsUpdate = true;
        }
      }
    } 
    // Traiter un matériau unique
    else if (mesh.material instanceof THREE.MeshBasicMaterial) {
      mesh.material = new THREE.MeshStandardMaterial({
        color: mesh.material.color,
        transparent: mesh.material.transparent,
        opacity: mesh.material.opacity || 1,
        roughness: 0.4,
        metalness: 0.6,
        side: mesh.material.side,
        shadowSide: THREE.FrontSide
      });
    } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.roughness = 0.4;
      mesh.material.metalness = 0.6;
      mesh.material.envMapIntensity = 1.0;
      mesh.material.shadowSide = THREE.FrontSide;
      mesh.material.needsUpdate = true;
    }
    
    // Forcer une mise à jour immédiate
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  }
}
