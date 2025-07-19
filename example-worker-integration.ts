// Exemple d'intégration du ShaderWorkerService dans background-three.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { ShaderWorkerService } from '../services/shader-worker.service';
import { Subscription } from 'rxjs';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class BackgroundThreeService implements OnDestroy {
  private subscriptions: Subscription[] = [];
  private uniforms: any;
  private geometry?: THREE.BufferGeometry;
  private material?: THREE.ShaderMaterial;
  
  constructor(private shaderWorker: ShaderWorkerService) {
    this.initWorkerSubscriptions();
  }

  private initWorkerSubscriptions() {
    // Écouter les uniforms calculés par le worker
    this.subscriptions.push(
      this.shaderWorker.uniforms$.subscribe(uniforms => {
        if (uniforms && this.material) {
          // Mettre à jour les uniforms du shader
          Object.keys(uniforms).forEach(key => {
            if (this.material!.uniforms[key]) {
              this.material!.uniforms[key].value = uniforms[key];
            }
          });
        }
      })
    );

    // Écouter la géométrie mise à jour
    this.subscriptions.push(
      this.shaderWorker.geometry$.subscribe(vertices => {
        if (vertices && this.geometry) {
          this.geometry.setAttribute('position', 
            new THREE.Float32BufferAttribute(vertices, 3)
          );
          this.geometry.attributes.position.needsUpdate = true;
        }
      })
    );

    // Écouter les mesh optimisés
    this.subscriptions.push(
      this.shaderWorker.mesh$.subscribe(meshData => {
        if (meshData && this.geometry) {
          // Appliquer les optimisations de mesh
          this.geometry.setAttribute('position', 
            new THREE.Float32BufferAttribute(meshData.vertices, 3)
          );
          this.geometry.setIndex(meshData.indices);
          this.geometry.attributes.position.needsUpdate = true;
        }
      })
    );
  }

  public initScene(canvas: HTMLCanvasElement) {
    // Initialisation Three.js normale...
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); // Désactiver l'antialiasing pour les performances
    
    // Créer la géométrie et le matériau
    this.geometry = new THREE.PlaneGeometry(10, 10, 32, 32);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_mouse: { value: new THREE.Vector2() },
        u_sinTime: { value: 0 },
        u_cosTime: { value: 0 },
        u_noise: { value: null }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_sinTime;
        uniform float u_cosTime;
        varying vec2 vUv;
        
        void main() {
          vec2 st = gl_FragCoord.xy / u_resolution.xy;
          vec3 color = vec3(0.0);
          
          // Utiliser les valeurs précalculées du worker
          color.r = u_sinTime * st.x;
          color.g = u_cosTime * st.y;
          color.b = sin(u_time) * 0.5 + 0.5;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(this.geometry, this.material);
    scene.add(mesh);

    // Animation loop optimisée
    const animate = () => {
      requestAnimationFrame(animate);

      // Déléguer les calculs lourds au worker
      const resolution: [number, number] = [window.innerWidth, window.innerHeight];
      const mouse: [number, number] = [0, 0]; // À remplacer par la vraie position de la souris
      const noiseParams = { width: 32, height: 32, scale: 0.1 };

      this.shaderWorker.calculateUniforms(resolution, mouse, noiseParams);

      // Mise à jour légère de la géométrie si nécessaire
      if (performance.now() % 1000 < 16) { // Toutes les secondes environ
        this.shaderWorker.updateGeometry(10, 10, 32);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Gestion du redimensionnement
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.shaderWorker.destroy();
  }
}
