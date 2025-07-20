// Déclarations d'extensions pour l'objet Window global
import * as THREE from 'three';

declare global {
  interface Window {
    registerScene?: (scene: THREE.Scene, type: string, camera: THREE.Camera) => void;
    lightServiceInstance?: any;
  }
}

export {};
