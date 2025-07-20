import { Injectable } from '@angular/core';
import { PerformanceUtils } from '../utils/performance.utils';

interface ThreeJSConfig {
  antialias: boolean;
  pixelRatio: number;
  powerPreference: 'high-performance' | 'low-power' | 'default';
  shadowMapEnabled: boolean;
  maxLights: number;
}

@Injectable({
  providedIn: 'root'
})
export class ThreePerformanceManager {
  private config: ThreeJSConfig = {
    antialias: true,
    pixelRatio: 1,
    powerPreference: 'high-performance',
    shadowMapEnabled: true,
    maxLights: 4
  };

  private isLowPerformanceDevice = false;
  private frameDropThreshold = 30;

  constructor(private performanceUtils: PerformanceUtils) {
    this.detectDeviceCapabilities();
  }

  private detectDeviceCapabilities(): void {
    // Détecter les dispositifs low-end
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      this.isLowPerformanceDevice = true;
      return;
    }

    // Vérifier la mémoire disponible
    // @ts-ignore
    const memInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (memInfo) {
      // @ts-ignore
      const renderer = gl.getParameter(memInfo.UNMASKED_RENDERER_WEBGL);
      
      // Détecter les GPUs intégrés ou low-end
      if (renderer.includes('Intel') || renderer.includes('integrated')) {
        this.isLowPerformanceDevice = true;
      }
    }

    // Tester les performances de rendu
    this.performRenderTest();
  }

  private performRenderTest(): void {
    const startTime = performance.now();
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Test de rendu simple
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Rendu de test
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();

    const renderTime = performance.now() - startTime;
    
    if (renderTime > 16) { // Plus de 16ms pour un rendu simple
      this.isLowPerformanceDevice = true;
    }

    canvas.remove();
  }

  getOptimizedConfig(): ThreeJSConfig {
    if (this.isLowPerformanceDevice) {
      return {
        antialias: false,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        powerPreference: 'low-power',
        shadowMapEnabled: false,
        maxLights: 2
      };
    }

    // Configuration normale
    return {
      ...this.config,
      pixelRatio: Math.min(window.devicePixelRatio, 2)
    };
  }

  adaptiveQuality(renderer: any, scene: any): void {
    const metrics = this.performanceUtils.getMetrics();
    
    if (metrics.fps < this.frameDropThreshold) {
      this.reducePerfomance(renderer, scene);
    } else if (metrics.fps > 55 && this.canIncreaseQuality()) {
      this.increasePerformance(renderer, scene);
    }
  }

  private reducePerfomance(renderer: any, scene: any): void {
    // Réduire la résolution
    const canvas = renderer.domElement;
    const currentPixelRatio = renderer.getPixelRatio();
    
    if (currentPixelRatio > 0.5) {
      renderer.setPixelRatio(Math.max(0.5, currentPixelRatio - 0.25));
    }

    // Désactiver les ombres si nécessaire
    if (renderer.shadowMap.enabled) {
      renderer.shadowMap.enabled = false;
      scene.traverse((child: any) => {
        if (child.material) {
          child.material.needsUpdate = true;
        }
      });
    }

    // Réduire l'antialiasing
    if (renderer.antialias) {
      // Note: On ne peut pas désactiver l'antialiasing après la création
      console.warn('Consider recreating renderer without antialiasing for better performance');
    }
  }

  private increasePerformance(renderer: any, scene: any): void {
    const currentPixelRatio = renderer.getPixelRatio();
    const maxPixelRatio = Math.min(window.devicePixelRatio, 2);
    
    if (currentPixelRatio < maxPixelRatio) {
      renderer.setPixelRatio(Math.min(maxPixelRatio, currentPixelRatio + 0.25));
    }
  }

  private canIncreaseQuality(): boolean {
    const currentPixelRatio = this.getCurrentPixelRatio();
    const maxPixelRatio = Math.min(window.devicePixelRatio, 2);
    
    return currentPixelRatio < maxPixelRatio;
  }

  private getCurrentPixelRatio(): number {
    // Cette méthode devrait être appelée avec le renderer actuel
    return 1; // Placeholder
  }

  // Gestionnaire de mémoire pour les textures
  optimizeTextures(textures: any[]): void {
    textures.forEach(texture => {
      // Compression automatique des textures
      if (texture.image && texture.image.width > 1024) {
        texture.minFilter = texture.constructor.LinearFilter;
        texture.magFilter = texture.constructor.LinearFilter;
      }

      // Libérer les textures non utilisées
      if (!texture.inUse) {
        texture.dispose();
      }
    });
  }

  // Optimisation des géométries
  optimizeGeometries(geometries: any[]): void {
    geometries.forEach(geometry => {
      if (geometry.index === null && geometry.attributes.position.count > 10000) {
        // Merger les vertices pour réduire les draw calls
        geometry.mergeVertices?.();
      }
    });
  }

  // LOD (Level of Detail) automatique
  setupLOD(object: any, distances: number[] = [50, 100, 200]): any {
    const lod = new (window as any).THREE.LOD();
    
    // Ajouter différents niveaux de détail
    lod.addLevel(object, 0);
    
    // Créer des versions simplifiées
    distances.forEach((distance, index) => {
      const simplifiedObject = this.createSimplifiedVersion(object, (index + 1) * 0.5);
      lod.addLevel(simplifiedObject, distance);
    });
    
    return lod;
  }

  private createSimplifiedVersion(object: any, factor: number): any {
    // Créer une version simplifiée de l'objet
    const simplified = object.clone();
    
    // Réduire la géométrie
    if (simplified.geometry) {
      const positions = simplified.geometry.attributes.position.array;
      const simplifiedPositions = new Float32Array(Math.floor(positions.length * factor));
      
      for (let i = 0; i < simplifiedPositions.length; i += 3) {
        const sourceIndex = Math.floor((i / simplifiedPositions.length) * positions.length);
        simplifiedPositions[i] = positions[sourceIndex];
        simplifiedPositions[i + 1] = positions[sourceIndex + 1];
        simplifiedPositions[i + 2] = positions[sourceIndex + 2];
      }
      
      simplified.geometry.setAttribute('position', 
        new (window as any).THREE.BufferAttribute(simplifiedPositions, 3));
    }
    
    return simplified;
  }
}
