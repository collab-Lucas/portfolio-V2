import * as THREE from 'three';

export abstract class ThreeCoreService {
  protected scene!: THREE.Scene;
  protected camera!: THREE.PerspectiveCamera;
  protected renderer!: THREE.WebGLRenderer;
  protected animationId: number | null = null;
  protected initialized = false;
  protected lastWidth = 0;
  protected lastHeight = 0;
  protected resizeTimeout: any = null;

  /**
   * Initialise la scène de base
   */
  protected initializeScene(canvas: HTMLCanvasElement, fov = 75, near = 0.1, far = 1000): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      near,
      far
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0xffffff, 0);
  }

  /**
   * Nettoie les ressources pour éviter les fuites mémoire
   */
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => this.disposeMaterial(material));
            } else {
              this.disposeMaterial(object.material);
            }
          }
          object.parent?.remove(object);
        }
      });
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement?.remove();
    }
    this.initialized = false;
  }

  /**
   * Nettoie un matériau
   */
  protected disposeMaterial(material: THREE.Material): void {
    if (material instanceof THREE.MeshBasicMaterial) {
      if (material.map) material.map.dispose();
      if (material.lightMap) material.lightMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.envMap) material.envMap.dispose();
    }
    if (material instanceof THREE.MeshStandardMaterial) {
      if (material.map) material.map.dispose();
      if (material.lightMap) material.lightMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();
      if (material.metalnessMap) material.metalnessMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.envMap) material.envMap.dispose();
    }
    if (material instanceof THREE.MeshPhongMaterial) {
      if (material.map) material.map.dispose();
      if (material.lightMap) material.lightMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.envMap) material.envMap.dispose();
    }
    if (material instanceof THREE.ShaderMaterial) {
      for (const uniformName in material.uniforms) {
        const uniform = material.uniforms[uniformName];
        if (uniform && uniform.value instanceof THREE.Texture) {
          uniform.value.dispose();
        }
      }
    }
    material.dispose();
  }
}
