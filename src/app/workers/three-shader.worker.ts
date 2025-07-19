/// <reference lib="webworker" />

interface ShaderData {
  type: 'CALCULATE_UNIFORMS' | 'UPDATE_GEOMETRY' | 'OPTIMIZE_MESH';
  payload: any;
}

addEventListener('message', ({ data }: MessageEvent<ShaderData>) => {
  switch (data.type) {
    case 'CALCULATE_UNIFORMS':
      calculateUniforms(data.payload);
      break;
    case 'UPDATE_GEOMETRY':
      updateGeometry(data.payload);
      break;
    case 'OPTIMIZE_MESH':
      optimizeMesh(data.payload);
      break;
  }
});

function calculateUniforms(payload: any) {
  // Calculs lourds pour les uniforms de shader
  const time = performance.now() * 0.001;
  const uniforms = {
    u_time: time,
    u_resolution: payload.resolution,
    u_mouse: payload.mouse,
    // Précalculs mathématiques coûteux
    u_sinTime: Math.sin(time),
    u_cosTime: Math.cos(time),
    u_noise: generateNoise(payload.noiseParams)
  };
  
  postMessage({ type: 'UNIFORMS_CALCULATED', uniforms });
}

function updateGeometry(payload: any) {
  // Mise à jour de géométrie en arrière-plan
  const vertices = [];
  const { width, height, segments } = payload;
  
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= segments; j++) {
      const x = (i / segments) * width - width / 2;
      const z = (j / segments) * height - height / 2;
      const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 5;
      
      vertices.push(x, y, z);
    }
  }
  
  postMessage({ type: 'GEOMETRY_UPDATED', vertices });
}

function optimizeMesh(payload: any) {
  // Optimisation de mesh pour réduire la charge GPU
  const { vertices, indices } = payload;
  const optimizedVertices = [];
  const optimizedIndices = [];
  
  // Algorithme de simplification simple
  for (let i = 0; i < vertices.length; i += 9) { // Chaque triangle
    const distance = Math.sqrt(
      Math.pow(vertices[i], 2) + 
      Math.pow(vertices[i + 1], 2) + 
      Math.pow(vertices[i + 2], 2)
    );
    
    // Garder seulement les triangles dans la distance de rendu
    if (distance < payload.maxDistance) {
      optimizedVertices.push(...vertices.slice(i, i + 9));
      optimizedIndices.push(...indices.slice(i / 3, (i / 3) + 3));
    }
  }
  
  postMessage({ 
    type: 'MESH_OPTIMIZED', 
    vertices: optimizedVertices, 
    indices: optimizedIndices 
  });
}

function generateNoise(params: any): number[][] {
  const { width, height, scale } = params;
  const noise: number[][] = [];
  
  for (let x = 0; x < width; x++) {
    noise[x] = [];
    for (let y = 0; y < height; y++) {
      // Génération de bruit simple (remplacer par Perlin noise si nécessaire)
      noise[x][y] = Math.random() * 2 - 1;
    }
  }
  
  return noise;
}
