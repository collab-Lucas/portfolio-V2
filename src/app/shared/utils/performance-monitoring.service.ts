import { Injectable } from '@angular/core';

/**
 * Métriques de performance
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  timestamp: number;
}

/**
 * Configuration de monitoring
 */
export interface MonitoringConfig {
  enabled: boolean;
  sampleInterval: number; // en millisecondes
  maxSamples: number;
  alertThresholds: {
    minFPS: number;
    maxFrameTime: number;
    maxMemoryMB: number;
  };
}

/**
 * Service de monitoring des performances Three.js
 * Surveille les métriques de performance et détecte les problèmes
 */
@Injectable({ providedIn: 'root' })
export class PerformanceMonitoringService {
  private config: MonitoringConfig = {
    enabled: true,
    sampleInterval: 1000, // 1 seconde
    maxSamples: 60, // 1 minute d'historique
    alertThresholds: {
      minFPS: 30,
      maxFrameTime: 33.33, // ~30fps
      maxMemoryMB: 512
    }
  };

  private metrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval?: number;
  
  // Variables pour le calcul des FPS
  private frameCount = 0;
  private lastTime = performance.now();
  private currentFPS = 0;
  private frameTimeSum = 0;
  private frameTimeCount = 0;

  // Callbacks d'alerte
  private alertCallbacks: ((metric: string, value: number, threshold: number) => void)[] = [];

  constructor() {
    this.detectOptimalConfig();
  }

  /**
   * Détecte la configuration optimale selon l'appareil
   */
  private detectOptimalConfig(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Configuration plus légère pour mobile
      this.config.sampleInterval = 2000; // 2 secondes
      this.config.maxSamples = 30; // 1 minute d'historique
      this.config.alertThresholds.minFPS = 20;
      this.config.alertThresholds.maxMemoryMB = 256;
    }
  }

  /**
   * Démarre le monitoring des performances
   */
  startMonitoring(): void {
    if (this.isMonitoring || !this.config.enabled) return;

    this.isMonitoring = true;
    this.metrics = [];
    this.frameCount = 0;
    this.lastTime = performance.now();

    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);
  }

  /**
   * Arrête le monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Met à jour le compteur de frames (à appeler dans la boucle de rendu)
   */
  updateFrame(frameTime?: number): void {
    if (!this.isMonitoring) return;

    this.frameCount++;
    
    if (frameTime) {
      this.frameTimeSum += frameTime;
      this.frameTimeCount++;
    }
  }

  /**
   * Collecte les métriques de performance
   */
  private collectMetrics(): void {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    
    // Calculer les FPS
    this.currentFPS = (this.frameCount * 1000) / deltaTime;
    
    // Calculer le temps de frame moyen
    const avgFrameTime = this.frameTimeCount > 0 
      ? this.frameTimeSum / this.frameTimeCount 
      : 1000 / this.currentFPS;

    // Collecter les métriques mémoire
    const memoryUsage = this.getMemoryUsage();

    // Collecter les métriques de rendu (si disponibles)
    const renderMetrics = this.getRenderMetrics();

    const metrics: PerformanceMetrics = {
      fps: Math.round(this.currentFPS * 10) / 10,
      frameTime: Math.round(avgFrameTime * 100) / 100,
      memoryUsage,
      drawCalls: renderMetrics.drawCalls,
      triangles: renderMetrics.triangles,
      geometries: renderMetrics.geometries,
      textures: renderMetrics.textures,
      timestamp: now
    };

    // Ajouter aux métriques
    this.metrics.push(metrics);
    
    // Limiter la taille de l'historique
    if (this.metrics.length > this.config.maxSamples) {
      this.metrics.shift();
    }

    // Vérifier les seuils d'alerte
    this.checkAlerts(metrics);

    // Réinitialiser les compteurs
    this.frameCount = 0;
    this.frameTimeSum = 0;
    this.frameTimeCount = 0;
    this.lastTime = now;
  }

  /**
   * Obtient l'utilisation mémoire (si disponible)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024 * 10) / 10; // MB
    }
    return 0;
  }

  /**
   * Obtient les métriques de rendu Three.js (estimées)
   */
  private getRenderMetrics(): { drawCalls: number; triangles: number; geometries: number; textures: number } {
    // Ces métriques nécessiteraient une intégration plus poussée avec Three.js
    // Pour l'instant, on retourne des valeurs par défaut
    return {
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0
    };
  }

  /**
   * Vérifie les seuils d'alerte
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const { alertThresholds } = this.config;

    if (metrics.fps < alertThresholds.minFPS) {
      this.triggerAlert('fps', metrics.fps, alertThresholds.minFPS);
    }

    if (metrics.frameTime > alertThresholds.maxFrameTime) {
      this.triggerAlert('frameTime', metrics.frameTime, alertThresholds.maxFrameTime);
    }

    if (metrics.memoryUsage > alertThresholds.maxMemoryMB) {
      this.triggerAlert('memory', metrics.memoryUsage, alertThresholds.maxMemoryMB);
    }
  }

  /**
   * Déclenche une alerte
   */
  private triggerAlert(metric: string, value: number, threshold: number): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(metric, value, threshold);
      } catch (error) {
        console.error('Error in performance alert callback:', error);
      }
    });
  }

  /**
   * Ajoute un callback d'alerte
   */
  onAlert(callback: (metric: string, value: number, threshold: number) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Retire un callback d'alerte
   */
  removeAlert(callback: (metric: string, value: number, threshold: number) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Obtient les métriques actuelles
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Obtient l'historique des métriques
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Obtient les statistiques moyennes sur une période
   */
  getAverageMetrics(lastNSamples?: number): Partial<PerformanceMetrics> {
    const samples = lastNSamples ? this.metrics.slice(-lastNSamples) : this.metrics;
    
    if (samples.length === 0) return {};

    const totals = samples.reduce((acc, metric) => ({
      fps: acc.fps + metric.fps,
      frameTime: acc.frameTime + metric.frameTime,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      drawCalls: acc.drawCalls + metric.drawCalls,
      triangles: acc.triangles + metric.triangles
    }), { fps: 0, frameTime: 0, memoryUsage: 0, drawCalls: 0, triangles: 0 });

    const count = samples.length;
    return {
      fps: Math.round(totals.fps / count * 10) / 10,
      frameTime: Math.round(totals.frameTime / count * 100) / 100,
      memoryUsage: Math.round(totals.memoryUsage / count * 10) / 10,
      drawCalls: Math.round(totals.drawCalls / count),
      triangles: Math.round(totals.triangles / count)
    };
  }

  /**
   * Détecte si les performances sont dégradées
   */
  isPerformanceDegraded(): boolean {
    const recent = this.getAverageMetrics(5); // 5 derniers échantillons
    
    return (recent.fps || 60) < this.config.alertThresholds.minFPS ||
           (recent.frameTime || 0) > this.config.alertThresholds.maxFrameTime ||
           (recent.memoryUsage || 0) > this.config.alertThresholds.maxMemoryMB;
  }

  /**
   * Obtient des recommandations d'optimisation
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const current = this.getCurrentMetrics();
    const average = this.getAverageMetrics(10);

    if (!current || !average.fps) return recommendations;

    if (average.fps < 40) {
      recommendations.push('Réduire le nombre de particules ou objets 3D');
      recommendations.push('Diminuer la complexité des géométries');
      recommendations.push('Utiliser un niveau de qualité inférieur');
    }

    if (average.frameTime && average.frameTime > 25) {
      recommendations.push('Optimiser les shaders et matériaux');
      recommendations.push('Réduire la résolution des shadow maps');
    }

    if (average.memoryUsage && average.memoryUsage > 400) {
      recommendations.push('Libérer les ressources inutilisées');
      recommendations.push('Optimiser les textures et géométries');
      recommendations.push('Implémenter un système de cache avec limites');
    }

    return recommendations;
  }

  /**
   * Configure le monitoring
   */
  configure(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.stopMonitoring();
    this.metrics = [];
    this.alertCallbacks = [];
  }
}
