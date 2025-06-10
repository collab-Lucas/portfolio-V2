import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { AnimationMixer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AnimationProperties {
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
  loop?: boolean;
  yoyo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnimationService {
  private mixers: THREE.AnimationMixer[] = [];
  private clock = new THREE.Clock();

  /**
   * Crée un mixer d'animation pour un modèle 3D
   * @param model Objet 3D à animer
   * @returns AnimationMixer créé
   */
  createMixer(model: THREE.Object3D): THREE.AnimationMixer {
    const mixer = new THREE.AnimationMixer(model);
    this.mixers.push(mixer);
    return mixer;
  }

  /**
   * Gère les animations d'un modèle GLTF
   * @param gltf Modèle GLTF chargé
   * @param autoplay Démarrer les animations automatiquement
   * @returns Le mixer créé et les actions d'animation
   */
  setupGLTFAnimations(gltf: GLTF, autoplay: boolean = true): { 
    mixer: THREE.AnimationMixer, 
    actions: THREE.AnimationAction[] 
  } {
    if (!gltf.animations || gltf.animations.length === 0) {
      return { mixer: new THREE.AnimationMixer(gltf.scene), actions: [] };
    }
    
    const mixer = this.createMixer(gltf.scene);
    const actions: THREE.AnimationAction[] = [];
    
    gltf.animations.forEach(clip => {
      const action = mixer.clipAction(clip);
      actions.push(action);
      
      if (autoplay) {
        action.play();
      }
    });
    
    return { mixer, actions };
  }

  /**
   * Met à jour tous les mixers d'animation
   * @param delta Delta de temps (optionnel, sinon utilise l'horloge interne)
   */
  update(delta?: number): void {
    const dt = delta !== undefined ? delta : this.clock.getDelta();
    
    this.mixers.forEach(mixer => {
      mixer.update(dt);
    });
  }

  /**
   * Anime un objet 3D avec interpolation
   * @param object Objet 3D à animer
   * @param targetProps Propriétés cibles (position, rotation, scale)
   * @param animProperties Propriétés d'animation (durée, easing, etc.)
   */
  animateObject(
    object: THREE.Object3D, 
    targetProps: Partial<{
      position: { x?: number, y?: number, z?: number },
      rotation: { x?: number, y?: number, z?: number },
      scale: { x?: number, y?: number, z?: number }
    }>,
    animProperties: AnimationProperties = {}
  ): void {
    const duration = animProperties.duration || 1000;
    const easing = animProperties.easing || ((t) => t); // Linear par défaut
    const delay = animProperties.delay || 0;
    const loop = animProperties.loop || false;
    const yoyo = animProperties.yoyo || false;
    
    const startProps = {
      position: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      },
      rotation: {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z
      },
      scale: {
        x: object.scale.x,
        y: object.scale.y,
        z: object.scale.z
      }
    };

    let startTime = Date.now() + delay;
    let reversed = false;
    
    const animate = () => {
      const now = Date.now();
      if (now < startTime) {
        requestAnimationFrame(animate);
        return;
      }
      
      let elapsed = now - startTime;
      let t = Math.min(1, elapsed / duration);
      
      if (reversed) t = 1 - t;
      
      const easedT = easing(t);
      
      // Mettre à jour les propriétés avec interpolation
      this.updateObjectProperties(object, startProps, targetProps, easedT);
      
      if (t < 1 || loop || (yoyo && !reversed)) {
        requestAnimationFrame(animate);
      } else if (animProperties.onComplete) {
        animProperties.onComplete();
      }
      
      // Gérer le comportement de boucle et yoyo
      if (t >= 1) {
        if (yoyo && !reversed) {
          reversed = true;
          startTime = now;
        } else if (loop) {
          startTime = now;
          if (yoyo) reversed = false;
        }
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  /**
   * Met à jour les propriétés d'un objet avec interpolation
   */
  private updateObjectProperties(
    object: THREE.Object3D,
    startProps: any,
    targetProps: any,
    t: number
  ) {
    // Interpoler la position si spécifiée
    if (targetProps.position) {
      if (targetProps.position.x !== undefined) {
        object.position.x = startProps.position.x + (targetProps.position.x - startProps.position.x) * t;
      }
      if (targetProps.position.y !== undefined) {
        object.position.y = startProps.position.y + (targetProps.position.y - startProps.position.y) * t;
      }
      if (targetProps.position.z !== undefined) {
        object.position.z = startProps.position.z + (targetProps.position.z - startProps.position.z) * t;
      }
    }
    
    // Interpoler la rotation si spécifiée
    if (targetProps.rotation) {
      if (targetProps.rotation.x !== undefined) {
        object.rotation.x = startProps.rotation.x + (targetProps.rotation.x - startProps.rotation.x) * t;
      }
      if (targetProps.rotation.y !== undefined) {
        object.rotation.y = startProps.rotation.y + (targetProps.rotation.y - startProps.rotation.y) * t;
      }
      if (targetProps.rotation.z !== undefined) {
        object.rotation.z = startProps.rotation.z + (targetProps.rotation.z - startProps.rotation.z) * t;
      }
    }
    
    // Interpoler l'échelle si spécifiée
    if (targetProps.scale) {
      if (targetProps.scale.x !== undefined) {
        object.scale.x = startProps.scale.x + (targetProps.scale.x - startProps.scale.x) * t;
      }
      if (targetProps.scale.y !== undefined) {
        object.scale.y = startProps.scale.y + (targetProps.scale.y - startProps.scale.y) * t;
      }
      if (targetProps.scale.z !== undefined) {
        object.scale.z = startProps.scale.z + (targetProps.scale.z - startProps.scale.z) * t;
      }
    }
  }
  
  /**
   * Nettoie les ressources d'animation
   */
  dispose(): void {
    this.mixers.forEach(mixer => {
      mixer.stopAllAction();
    });
    this.mixers = [];
  }
}
