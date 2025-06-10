// Fichier de déclaration pour ajouter des propriétés à l'objet Window
interface Window {
  registerScene: (scene: THREE.Scene, type: string, renderer: THREE.WebGLRenderer) => void;
  currentSceneInstances: Array<{
    scene: THREE.Scene;
    type: string;
    renderer?: THREE.WebGLRenderer;
  }>;
  lightServiceInstance: any; // Le type exact dépend de votre implémentation du LightService
}
