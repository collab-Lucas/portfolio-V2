// Temporary script to restore Light Service functionality

// Execute this in the console of your Angular app or add it to your code
(() => {
  console.log("Initializing Scene Registration for LightService...");
  
  // Declare a global variable to store scene references
  window.currentSceneInstances = [];
  
  // Function to register a scene with LightService
  window.registerScene = function(scene, type, renderer) {
    if (!window.currentSceneInstances) {
      window.currentSceneInstances = [];
    }
    
    // Check if scene already exists
    const exists = window.currentSceneInstances.some(
      s => s.scene === scene && s.type === type
    );
    
    if (!exists) {
      console.log(`Registering ${type} scene`);
      window.currentSceneInstances.push({
        scene,
        type,
        renderer
      });
    }
  };
  
  // Initialize updater
  setInterval(() => {
    // Check if there is a LightService instance
    const lightService = window.lightServiceInstance;
    if (lightService && typeof lightService.refreshLights === 'function') {
      try {
        // Update lights from all registered scenes
        lightService.refreshLights(window.currentSceneInstances);
        console.log("Lights refreshed from registered scenes");
        
        // Clear the interval once we've successfully updated
        clearInterval(this);
      } catch (e) {
        console.error("Error updating lights:", e);
      }
    }
  }, 2000);
  
  console.log("Scene Registration initialized.");
})();
