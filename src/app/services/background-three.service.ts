import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Injectable({ providedIn: 'root' })
export class BackgroundThreeService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId: number | null = null;
  private models: { [key: string]: THREE.Group } = {};

  init(canvas: HTMLCanvasElement) {
    // Scène
    this.scene = new THREE.Scene();

    // Caméra
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.setZ(30);
    this.camera.position.setX(-3);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera);

    // Lumières
    const pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(5, 5, 5);
    const ambientLight = new THREE.AmbientLight(0xffffff);
    this.scene.add(pointLight, ambientLight);

    // Helpers
    const lightHelper = new THREE.PointLightHelper(pointLight);
    const gridHelper = new THREE.GridHelper(200, 50);
    this.scene.add(lightHelper, gridHelper);

    // Contrôles
    //const controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Chargement et manipulation des modèles GLB
    this.loadGLB('prisme', 'assets/models/prisme.glb', { x: 0, y: 0, z: 0 }, 1, (prisme) => {
      // Ici tu peux manipuler prisme après chargement
      prisme.position.set(10, 0, 0);
      prisme.rotation.y = Math.PI / 4;
      // Exemple : dupliquer le prisme à des positions aléatoires
      for (let i = 0; i < 10; i++) {
        const clone = prisme.clone();
        clone.position.set(
          THREE.MathUtils.randFloatSpread(100),
          THREE.MathUtils.randFloatSpread(100),
          THREE.MathUtils.randFloatSpread(100)
        );
        this.scene.add(clone);
      }
    });

    this.loadGLB('scene_bureau', 'assets/models/scene_bureau.glb', { x: 0, y: 0, z: 0 }, 1, (bureau) => {
      // Ici tu peux manipuler bureau après chargement
      bureau.position.z = 0;
      bureau.position.x = 0;
    });




    const moveCamera = () => {
      const t = document.body.getBoundingClientRect().top;

      this.camera.position.z = t *5* -0.1;
      this.camera.position.x = t * -0.2;
      this.camera.rotation.y = t * -0.2;
    };

    document.body.onscroll = moveCamera;
    moveCamera();

    // Animation
    const animate = () => {
      this.renderer.render(this.scene, this.camera);
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  loadGLB(
    key: string,
    path: string,
    position = { x: 0, y: 0, z: 0 },
    scale = 1,
    callback?: (model: THREE.Group) => void
  ) {
    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        gltf.scene.position.set(position.x, position.y, position.z);
        gltf.scene.scale.set(scale, scale, scale);
        this.scene.add(gltf.scene);
        this.models[key] = gltf.scene;
        if (callback) callback(gltf.scene);
      },
      undefined,
      (error) => console.error('Erreur chargement GLB', error)
    );
  }

  dispose() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.renderer) this.renderer.dispose();
    Object.values(this.models).forEach(model => this.scene.remove(model));
    this.models = {};
  }
}