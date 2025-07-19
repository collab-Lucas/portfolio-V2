import { Injectable } from '@angular/core';
import { GeometryOptimizationService } from './geometry-optimization.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import * as THREE from 'three';

/**
 * Résultats de test de performance
 */
export interface PerformanceTestResult {
  testName: string;
  originalVertices: number;
  optimizedVertices: number;
  reductionPercentage: number;
  creationTime: number;
  memoryUsage: number;
  cacheHit?: boolean;
}

/**
 * Service de test des optimisations de performance
 * Valide l'efficacité des optimisations géométriques
 */
@Injectable({ providedIn: 'root' })
export class PerformanceTestService {
  private testResults: PerformanceTestResult[] = [];

  constructor(
    private geometryOptimizationService: GeometryOptimizationService,
    private performanceMonitoringService: PerformanceMonitoringService
  ) {}

  /**
   * Lance une suite complète de tests de performance
   */
  async runPerformanceTestSuite(): Promise<PerformanceTestResult[]> {
    console.log('🚀 Starting performance test suite...');
    
    this.testResults = [];
    
    // Tests des géométries de base
    await this.testSphereOptimization();
    await this.testTorusOptimization();
    await this.testBoxOptimization();
    await this.testCylinderOptimization();
    
    // Tests du cache
    await this.testGeometryCache();
    
    // Tests des différents niveaux de qualité
    await this.testQualityLevels();
    
    // Test d'optimisation de géométries complexes
    await this.testComplexGeometryOptimization();
    
    this.printTestResults();
    return this.testResults;
  }

  /**
   * Test d'optimisation des sphères
   */
  private async testSphereOptimization(): Promise<void> {
    const testName = 'Sphere Optimization';
    console.log(`📐 Testing ${testName}...`);
    
    const startTime = performance.now();
    
    // Géométrie standard (non optimisée)
    const standardSphere = new THREE.SphereGeometry(1, 32, 32);
    const originalVertices = standardSphere.attributes['position']?.count || 0;
    
    // Géométrie optimisée
    const optimizedSphere = this.geometryOptimizationService.createOptimizedSphere(1, 'test_sphere');
    const optimizedVertices = optimizedSphere.attributes['position']?.count || 0;
    
    const creationTime = performance.now() - startTime;
    const reductionPercentage = ((originalVertices - optimizedVertices) / originalVertices) * 100;
    
    this.testResults.push({
      testName,
      originalVertices,
      optimizedVertices,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100,
      creationTime: Math.round(creationTime * 100) / 100,
      memoryUsage: this.estimateGeometryMemory(optimizedSphere)
    });
    
    // Nettoyage
    standardSphere.dispose();
    optimizedSphere.dispose();
  }

  /**
   * Test d'optimisation des tores
   */
  private async testTorusOptimization(): Promise<void> {
    const testName = 'Torus Optimization';
    console.log(`🍩 Testing ${testName}...`);
    
    const startTime = performance.now();
    
    // Géométrie standard
    const standardTorus = new THREE.TorusGeometry(1, 0.4, 16, 100);
    const originalVertices = standardTorus.attributes['position']?.count || 0;
    
    // Géométrie optimisée
    const optimizedTorus = this.geometryOptimizationService.createOptimizedTorus(1, 0.4, 'test_torus');
    const optimizedVertices = optimizedTorus.attributes['position']?.count || 0;
    
    const creationTime = performance.now() - startTime;
    const reductionPercentage = ((originalVertices - optimizedVertices) / originalVertices) * 100;
    
    this.testResults.push({
      testName,
      originalVertices,
      optimizedVertices,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100,
      creationTime: Math.round(creationTime * 100) / 100,
      memoryUsage: this.estimateGeometryMemory(optimizedTorus)
    });
    
    // Nettoyage
    standardTorus.dispose();
    optimizedTorus.dispose();
  }

  /**
   * Test d'optimisation des boîtes
   */
  private async testBoxOptimization(): Promise<void> {
    const testName = 'Box Optimization';
    console.log(`📦 Testing ${testName}...`);
    
    const startTime = performance.now();
    
    // Géométrie standard avec beaucoup de segments
    const standardBox = new THREE.BoxGeometry(1, 1, 1, 10, 10, 10);
    const originalVertices = standardBox.attributes['position']?.count || 0;
    
    // Géométrie optimisée
    const optimizedBox = this.geometryOptimizationService.createOptimizedBox(1, 1, 1, 'test_box');
    const optimizedVertices = optimizedBox.attributes['position']?.count || 0;
    
    const creationTime = performance.now() - startTime;
    const reductionPercentage = ((originalVertices - optimizedVertices) / originalVertices) * 100;
    
    this.testResults.push({
      testName,
      originalVertices,
      optimizedVertices,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100,
      creationTime: Math.round(creationTime * 100) / 100,
      memoryUsage: this.estimateGeometryMemory(optimizedBox)
    });
    
    // Nettoyage
    standardBox.dispose();
    optimizedBox.dispose();
  }

  /**
   * Test d'optimisation des cylindres
   */
  private async testCylinderOptimization(): Promise<void> {
    const testName = 'Cylinder Optimization';
    console.log(`🥤 Testing ${testName}...`);
    
    const startTime = performance.now();
    
    // Géométrie standard
    const standardCylinder = new THREE.CylinderGeometry(1, 1, 2, 32, 4);
    const originalVertices = standardCylinder.attributes['position']?.count || 0;
    
    // Géométrie optimisée
    const optimizedCylinder = this.geometryOptimizationService.createOptimizedCylinder(1, 1, 2, 'test_cylinder');
    const optimizedVertices = optimizedCylinder.attributes['position']?.count || 0;
    
    const creationTime = performance.now() - startTime;
    const reductionPercentage = ((originalVertices - optimizedVertices) / originalVertices) * 100;
    
    this.testResults.push({
      testName,
      originalVertices,
      optimizedVertices,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100,
      creationTime: Math.round(creationTime * 100) / 100,
      memoryUsage: this.estimateGeometryMemory(optimizedCylinder)
    });
    
    // Nettoyage
    standardCylinder.dispose();
    optimizedCylinder.dispose();
  }

  /**
   * Test du système de cache
   */
  private async testGeometryCache(): Promise<void> {
    const testName = 'Geometry Cache Performance';
    console.log(`💾 Testing ${testName}...`);
    
    const cacheKey = 'cache_test_sphere';
    
    // Premier appel - création
    const startTime1 = performance.now();
    const sphere1 = this.geometryOptimizationService.createOptimizedSphere(1, cacheKey);
    const creationTime1 = performance.now() - startTime1;
    
    // Deuxième appel - cache hit
    const startTime2 = performance.now();
    const sphere2 = this.geometryOptimizationService.createOptimizedSphere(1, cacheKey);
    const creationTime2 = performance.now() - startTime2;
    
    const speedup = creationTime1 / creationTime2;
    
    this.testResults.push({
      testName: `${testName} - First Call`,
      originalVertices: 0,
      optimizedVertices: sphere1.attributes['position']?.count || 0,
      reductionPercentage: 0,
      creationTime: Math.round(creationTime1 * 100) / 100,
      memoryUsage: this.estimateGeometryMemory(sphere1),
      cacheHit: false
    });
    
    this.testResults.push({
      testName: `${testName} - Cached Call (${Math.round(speedup * 10) / 10}x faster)`,
      originalVertices: 0,
      optimizedVertices: sphere2.attributes['position']?.count || 0,
      reductionPercentage: 0,
      creationTime: Math.round(creationTime2 * 100) / 100,
      memoryUsage: this.estimateGeometryMemory(sphere2),
      cacheHit: true
    });
    
    // Nettoyage
    sphere1.dispose();
    sphere2.dispose();
  }

  /**
   * Test des différents niveaux de qualité
   */
  private async testQualityLevels(): Promise<void> {
    console.log('🎯 Testing quality levels...');
    
    const levels: ('ultra_low' | 'low' | 'medium' | 'high')[] = ['ultra_low', 'low', 'medium', 'high'];
    const originalLOD = this.geometryOptimizationService.getCurrentLOD();
    
    for (const level of levels) {
      this.geometryOptimizationService.setLODLevel(level);
      const currentLOD = this.geometryOptimizationService.getCurrentLOD();
      
      const startTime = performance.now();
      const sphere = this.geometryOptimizationService.createOptimizedSphere(1, `test_${level}`);
      const creationTime = performance.now() - startTime;
      
      this.testResults.push({
        testName: `Quality Level: ${level.toUpperCase()}`,
        originalVertices: 32 * 32, // Référence sphère standard
        optimizedVertices: sphere.attributes['position']?.count || 0,
        reductionPercentage: ((32 * 32 - (sphere.attributes['position']?.count || 0)) / (32 * 32)) * 100,
        creationTime: Math.round(creationTime * 100) / 100,
        memoryUsage: this.estimateGeometryMemory(sphere)
      });
      
      sphere.dispose();
    }
    
    // Restaurer le niveau original
    this.geometryOptimizationService.setLODLevel('medium');
  }

  /**
   * Test d'optimisation de géométries complexes
   */
  private async testComplexGeometryOptimization(): Promise<void> {
    const testName = 'Complex Geometry Optimization';
    console.log(`🔧 Testing ${testName}...`);
    
    // Créer une géométrie très complexe
    const complexSphere = new THREE.SphereGeometry(1, 64, 64); // 4096 vertices
    const originalVertices = complexSphere.attributes['position']?.count || 0;
    
    const startTime = performance.now();
    const optimizedGeometry = this.geometryOptimizationService.optimizeExistingGeometry(complexSphere);
    const optimizationTime = performance.now() - startTime;
    
    const optimizedVertices = optimizedGeometry.attributes['position']?.count || 0;
    const reductionPercentage = ((originalVertices - optimizedVertices) / originalVertices) * 100;
    
    this.testResults.push({
      testName,
      originalVertices,
      optimizedVertices,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100,
      creationTime: Math.round(optimizationTime * 100) / 100,
      memoryUsage: this.estimateGeometryMemory(optimizedGeometry)
    });
    
    // Nettoyage
    complexSphere.dispose();
    if (optimizedGeometry !== complexSphere) {
      optimizedGeometry.dispose();
    }
  }

  /**
   * Estime l'utilisation mémoire d'une géométrie
   */
  private estimateGeometryMemory(geometry: THREE.BufferGeometry): number {
    let totalBytes = 0;
    
    Object.keys(geometry.attributes).forEach(key => {
      const attribute = geometry.attributes[key] as THREE.BufferAttribute;
      if (attribute && attribute.array) {
        totalBytes += attribute.array.byteLength;
      }
    });
    
    return Math.round(totalBytes / 1024); // KB
  }

  /**
   * Affiche les résultats de test
   */
  private printTestResults(): void {
    console.log('\n📊 Performance Test Results Summary:');
    console.log('='.repeat(80));
    
    this.testResults.forEach(result => {
      console.log(`\n🔹 ${result.testName}`);
      console.log(`   Original vertices: ${result.originalVertices.toLocaleString()}`);
      console.log(`   Optimized vertices: ${result.optimizedVertices.toLocaleString()}`);
      if (result.reductionPercentage > 0) {
        console.log(`   Reduction: ${result.reductionPercentage}%`);
      }
      console.log(`   Creation time: ${result.creationTime}ms`);
      console.log(`   Memory usage: ${result.memoryUsage}KB`);
      if (result.cacheHit !== undefined) {
        console.log(`   Cache hit: ${result.cacheHit ? '✅' : '❌'}`);
      }
    });
    
    // Statistiques globales
    const totalReduction = this.testResults
      .filter(r => r.reductionPercentage > 0)
      .reduce((sum, r) => sum + r.reductionPercentage, 0);
    const avgReduction = totalReduction / this.testResults.filter(r => r.reductionPercentage > 0).length;
    
    console.log('\n📈 Global Statistics:');
    console.log(`   Average vertex reduction: ${Math.round(avgReduction * 100) / 100}%`);
    console.log(`   Total tests: ${this.testResults.length}`);
    console.log(`   Cache stats: ${this.geometryOptimizationService.getCacheStats().size}/${this.geometryOptimizationService.getCacheStats().maxSize} entries`);
  }

  /**
   * Obtient les résultats des tests
   */
  getTestResults(): PerformanceTestResult[] {
    return [...this.testResults];
  }

  /**
   * Lance un test de performance en conditions réelles
   */
  async testRealWorldPerformance(duration: number = 5000): Promise<any> {
    console.log(`🌍 Starting real-world performance test for ${duration}ms...`);
    
    this.performanceMonitoringService.startMonitoring();
    
    // Créer de nombreuses géométries comme en conditions réelles
    const geometries: THREE.BufferGeometry[] = [];
    
    const startTime = performance.now();
    
    while (performance.now() - startTime < duration) {
      // Créer des géométries variées
      const geometryType = Math.floor(Math.random() * 4);
      let geometry: THREE.BufferGeometry;
      
      switch (geometryType) {
        case 0:
          geometry = this.geometryOptimizationService.createOptimizedSphere(
            Math.random() * 2 + 0.5,
            `realworld_sphere_${Date.now()}`
          );
          break;
        case 1:
          geometry = this.geometryOptimizationService.createOptimizedTorus(
            Math.random() * 2 + 1,
            Math.random() * 0.5 + 0.2,
            `realworld_torus_${Date.now()}`
          );
          break;
        case 2:
          geometry = this.geometryOptimizationService.createOptimizedBox(
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5,
            `realworld_box_${Date.now()}`
          );
          break;
        default:
          geometry = this.geometryOptimizationService.createOptimizedCylinder(
            Math.random() * 1 + 0.3,
            Math.random() * 1 + 0.3,
            Math.random() * 3 + 1,
            `realworld_cylinder_${Date.now()}`
          );
          break;
      }
      
      geometries.push(geometry);
      
      // Limiter pour éviter la surcharge
      if (geometries.length > 100) {
        geometries.shift()?.dispose();
      }
      
      // Petit délai pour simuler une utilisation réelle
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.performanceMonitoringService.stopMonitoring();
    
    // Nettoyage
    geometries.forEach(g => g.dispose());
    
    const metrics = this.performanceMonitoringService.getAverageMetrics();
    const recommendations = this.performanceMonitoringService.getOptimizationRecommendations();
    
    console.log('🎯 Real-world test completed!');
    console.log('Average metrics:', metrics);
    console.log('Recommendations:', recommendations);
    
    return { metrics, recommendations };
  }
}
