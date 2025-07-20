// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';

// Mesurer le temps de démarrage
const startTime = performance.now();

// Preload critical resources
const criticalResources = [
  '/assets/models/navbar_scene.glb',
  '/assets/css/animations.css'
];

// Définir tes routes si tu en utilises (à modifier selon ton application)

// Optimized bootstrap with performance monitoring
Promise.all([
  // Load critical resources in parallel
  ...criticalResources.map(resource => 
    fetch(resource).catch(() => console.warn(`Failed to preload: ${resource}`))
  ),
  // Bootstrap the application
  bootstrapApplication(AppComponent, {
    providers: [
      importProvidersFrom(
        BrowserModule,
        BrowserAnimationsModule,
        BsDropdownModule.forRoot(),
        ButtonsModule.forRoot(),
        FormsModule
      ),
    ]
  })
]).then((results) => {
  const app = results[results.length - 1]; // Last element is the app
  // PerformanceUtils is missing, so we fallback to basic performance logging
  const loadTime = performance.now() - startTime;
  console.log(`🚀 Portfolio loaded in ${loadTime.toFixed(2)}ms`);
  
  // Optionally, add your own performance logging here
  setTimeout(() => {
    console.log('Performance metrics logging placeholder.');
  }, 5000);
  
  return app;
}).catch(err => {
  console.error('Failed to start application:', err);
});