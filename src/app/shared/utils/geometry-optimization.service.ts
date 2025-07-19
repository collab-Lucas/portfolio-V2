import * as THREE from 'three';
import { Injectable } from '@angular/core';

/**
 * Configuration des niveaux de détail pour les géométries
 */
export interface GeometryLODConfig {
  sphereSegments: { width: number; height: number };
  torusSegments: { radial: number; tubular: number };
  cylinderSegments: { radial: number; height: number };
  planeSegments: { width: number; height: number };
  boxSegments: { width: number; height: number; depth: number };
}

/**
 * Presets de qualité optimisés pour les géométries
 */
const GEOMETRY_LOD_PRESETS: Record<string, GeometryLODConfig> = {
  ultra_low: {
    sphereSegments: { width: 8, height: 6 },
    torusSegments: { radial: 8, tubular: 12 },
    cylinderSegments: { radial: 8, height: 1 },
    planeSegments: { width: 1, height: 1 },
    boxSegments: { width: 1, height: 1, depth: 1 }
  },
  low: {
    sphereSegments: { width: 12, height: 8 },
    torusSegments: { radial: 12, tubular: 16 },
    cylinderSegments: { radial: 12, height: 1 },
    planeSegments: { width: 2, height: 2 },
    boxSegments: { width: 1, height: 1, depth: 1 }
  },
  medium: {
    sphereSegments: { width: 16, height: 12 },
    torusSegments: { radial: 16, tubular: 32 },
    cylinderSegments: { radial: 16, height: 1 },
    planeSegments: { width: 4, height: 4 },
    boxSegments: { width: 1, height: 1, depth: 1 }
  },
  high: {
    sphereSegments: { width: 24, height: 16 },
    torusSegments: { radial: 24, tubular: 48 },
    cylinderSegments: { radial: 24, height: 2 },
    planeSegments: { width: 8, height: 8 },
    boxSegments: { width: 2, height: 2, depth: 2 }
  }
};

/**
 * Service d'optimisation des géométries Three.js
 * Fournit des géométries optimisées selon le niveau de performance
 */
@Injectable({ providedIn: 'root' })
export class GeometryOptimizationService {
  private currentLOD: GeometryLODConfig = GEOMETRY_LOD_PRESETS['medium'];
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private maxCacheSize = 50; // Limite du cache pour éviter une surconsommation mémoire

  constructor() {
    this.detectOptimalLOD();
  }

  /**
   * Détecte automatiquement le niveau de détail optimal
   */
  private detectOptimalLOD(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    const isLowResolution = window.innerWidth < 1366 || window.innerHeight < 768;
    const isSlowGPU = this.detectSlowGPU();

    if (isMobile || isLowEndDevice || isSlowGPU) {
      this.setLODLevel('ultra_low');
    } else if (isLowResolution) {
      this.setLODLevel('low');
    } else if (window.innerWidth < 1920) {
      this.setLODLevel('medium');
    } else {
      this.setLODLevel('high');
    }
  }

  /**
   * Détecte si le GPU est lent (heuristique basique)
   */
  private detectSlowGPU(): boolean {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    
    if (!gl) return true; // Pas de WebGL = GPU lent
    
    try {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Détection basique de GPU intégrés ou anciens
        return /Intel|integrated|software/i.test(renderer);
      }
    } catch (e) {
      // En cas d'erreur, considérer comme GPU lent
      return true;
    }
    
    return false;
  }

  /**
   * Définit manuellement le niveau de détail
   */
  setLODLevel(level: 'ultra_low' | 'low' | 'medium' | 'high'): void {
    this.currentLOD = GEOMETRY_LOD_PRESETS[level];
    this.clearCache(); // Vider le cache pour forcer la régénération
  }

  /**
   * Obtient le niveau de détail actuel
   */
  getCurrentLOD(): GeometryLODConfig {
    return this.currentLOD;
  }

  /**
   * Crée une géométrie de sphère optimisée
   */
  createOptimizedSphere(radius: number = 1, cacheKey?: string): THREE.SphereGeometry {
    const key = cacheKey || `sphere_${radius}_${this.currentLOD.sphereSegments.width}_${this.currentLOD.sphereSegments.height}`;
    
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key)!.clone() as THREE.SphereGeometry;
    }

    const geometry = new THREE.SphereGeometry(
      radius,
      this.currentLOD.sphereSegments.width,
      this.currentLOD.sphereSegments.height
    );

    this.cacheGeometry(key, geometry);
    return geometry;
  }

  /**
   * Crée une géométrie de tore optimisée
   */
  createOptimizedTorus(radius: number = 1, tube: number = 0.4, cacheKey?: string): THREE.TorusGeometry {
    const key = cacheKey || `torus_${radius}_${tube}_${this.currentLOD.torusSegments.radial}_${this.currentLOD.torusSegments.tubular}`;
    
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key)!.clone() as THREE.TorusGeometry;
    }

    const geometry = new THREE.TorusGeometry(
      radius,
      tube,
      this.currentLOD.torusSegments.radial,
      this.currentLOD.torusSegments.tubular
    );

    this.cacheGeometry(key, geometry);
    return geometry;
  }

  /**
   * Crée une géométrie de cylindre optimisée
   */
  createOptimizedCylinder(
    radiusTop: number = 1, 
    radiusBottom: number = 1, 
    height: number = 1, 
    cacheKey?: string
  ): THREE.CylinderGeometry {
    const key = cacheKey || `cylinder_${radiusTop}_${radiusBottom}_${height}_${this.currentLOD.cylinderSegments.radial}_${this.currentLOD.cylinderSegments.height}`;
    
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key)!.clone() as THREE.CylinderGeometry;
    }

    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      this.currentLOD.cylinderSegments.radial,
      this.currentLOD.cylinderSegments.height
    );

    this.cacheGeometry(key, geometry);
    return geometry;
  }

  /**
   * Crée une géométrie de plan optimisée
   */
  createOptimizedPlane(width: number = 1, height: number = 1, cacheKey?: string): THREE.PlaneGeometry {
    const key = cacheKey || `plane_${width}_${height}_${this.currentLOD.planeSegments.width}_${this.currentLOD.planeSegments.height}`;
    
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key)!.clone() as THREE.PlaneGeometry;
    }

    const geometry = new THREE.PlaneGeometry(
      width,
      height,
      this.currentLOD.planeSegments.width,
      this.currentLOD.planeSegments.height
    );

    this.cacheGeometry(key, geometry);
    return geometry;
  }

  /**
   * Crée une géométrie de boîte optimisée
   */
  createOptimizedBox(
    width: number = 1, 
    height: number = 1, 
    depth: number = 1, 
    cacheKey?: string
  ): THREE.BoxGeometry {
    const key = cacheKey || `box_${width}_${height}_${depth}_${this.currentLOD.boxSegments.width}_${this.currentLOD.boxSegments.height}_${this.currentLOD.boxSegments.depth}`;
    
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key)!.clone() as THREE.BoxGeometry;
    }

    const geometry = new THREE.BoxGeometry(
      width,
      height,
      depth,
      this.currentLOD.boxSegments.width,
      this.currentLOD.boxSegments.height,
      this.currentLOD.boxSegments.depth
    );

    this.cacheGeometry(key, geometry);
    return geometry;
  }

  /**
   * Optimise une géométrie existante en réduisant ses segments
   */
  optimizeExistingGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    // Pour les géométries complexes, on peut simplifier en réduisant les vertices
    const positionAttribute = geometry.attributes['position'] as THREE.BufferAttribute;
    
    if (positionAttribute && positionAttribute.count > 1000) {
      // Algorithme de simplification basique
      const originalPositions = positionAttribute.array;
      const originalCount = positionAttribute.count;
      
      // Réduire de 30% pour les géométries très complexes
      const targetCount = Math.floor(originalCount * 0.7);
      const step = Math.floor(originalCount / targetCount);
      
      const newPositions: number[] = [];
      const newNormals: number[] = [];
      const newUvs: number[] = [];
      
      for (let i = 0; i < originalCount; i += step) {
        // Position
        newPositions.push(
          originalPositions[i * 3],
          originalPositions[i * 3 + 1],
          originalPositions[i * 3 + 2]
        );
        
        // Normales si elles existent
        const normalAttribute = geometry.attributes['normal'] as THREE.BufferAttribute;
        if (normalAttribute) {
          const normals = normalAttribute.array;
          newNormals.push(
            normals[i * 3],
            normals[i * 3 + 1],
            normals[i * 3 + 2]
          );
        }
        
        // UVs si elles existent
        const uvAttribute = geometry.attributes['uv'] as THREE.BufferAttribute;
        if (uvAttribute) {
          const uvs = uvAttribute.array;
          newUvs.push(
            uvs[i * 2],
            uvs[i * 2 + 1]
          );
        }
      }
      
      const optimizedGeometry = new THREE.BufferGeometry();
      optimizedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
      
      if (newNormals.length > 0) {
        optimizedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
      } else {
        optimizedGeometry.computeVertexNormals();
      }
      
      if (newUvs.length > 0) {
        optimizedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
      }
      
      return optimizedGeometry;
    }
    
    return geometry;
  }

  /**
   * Met en cache une géométrie
   */
  private cacheGeometry(key: string, geometry: THREE.BufferGeometry): void {
    // Limite la taille du cache
    if (this.geometryCache.size >= this.maxCacheSize) {
      const firstKey = this.geometryCache.keys().next().value;
      if (firstKey) {
        const oldGeometry = this.geometryCache.get(firstKey);
        if (oldGeometry) {
          oldGeometry.dispose();
        }
        this.geometryCache.delete(firstKey);
      }
    }
    
    this.geometryCache.set(key, geometry.clone());
  }

  /**
   * Vide le cache des géométries
   */
  clearCache(): void {
    this.geometryCache.forEach(geometry => geometry.dispose());
    this.geometryCache.clear();
  }

  /**
   * Obtient les statistiques du cache
   */
  getCacheStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.geometryCache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.geometryCache.keys())
    };
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.clearCache();
  }
}
