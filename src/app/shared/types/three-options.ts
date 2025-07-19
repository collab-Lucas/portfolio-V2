import * as THREE from 'three';

/**
 * Options de configuration pour la scène Three.js
 */
export interface SceneOptions {
  fog?: {
    color?: number;
    near?: number;
    far?: number;
  };
}

/**
 * Options de configuration pour la caméra Three.js
 */
export interface CameraOptions {
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
  position?: { x: number; y: number; z: number };
}

/**
 * Options de configuration pour les lumières directionnelles
 */
export interface DirectionalLightOptions {
  color?: number;
  intensity?: number;
  position?: { x: number; y: number; z: number };
  castShadow?: boolean;
  shadowConfig?: {
    mapSize?: { width: number; height: number };
    camera?: { near: number; far: number; left: number; right: number; top: number; bottom: number };
    bias?: number;
  };
}

/**
 * Options de configuration pour les lumières ponctuelles
 */
export interface PointLightOptions {
  color?: number;
  intensity?: number;
  position?: { x: number; y: number; z: number };
  distance?: number;
  decay?: number;
  castShadow?: boolean;
  shadowConfig?: {
    mapSize?: { width: number; height: number };
    camera?: { near: number; far: number };
    bias?: number;
  };
}

/**
 * Options de configuration pour les lumières ambiantes
 */
export interface AmbientLightOptions {
  color?: number;
  intensity?: number;
}

/**
 * Options de configuration pour le renderer WebGL
 */
export interface RendererOptions {
  alpha?: boolean;
  antialias?: boolean;
  precision?: string;
  powerPreference?: string;
  shadowMapEnabled?: boolean;
  shadowMapType?: THREE.ShadowMapType;
  pixelRatio?: number;
  size?: { width: number; height: number };
}
