import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class ThreeCoreService {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Initialise la scène principale
   */
  initScene(canvas: HTMLCanvasElement): void {
    canvas.appendChild(this.renderer.domElement);
    this.camera.position.z = 5;
  }

  /**
   * Rendu de la scène
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Gestion du redimensionnement
   */
  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Libère les ressources
   */
  dispose(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.scene.clear();
    this.renderer.dispose();
  }
}
