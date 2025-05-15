import { Component, ElementRef, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeService } from '../../services/three.service';
import { ColorService } from '../../services/color.service';
import { NavbarEffectsService } from '../../services/navbar-effects.service';
import { Observable, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark fixed-top px-3"
         [class.shrink-navbar]="isShrunk$ | async"
         [class.large-navbar]="!(isShrunk$ | async)">
      <div class="canvas-container">
        <canvas #threeNavbarCanvas class="navbar-canvas"></canvas>
      </div>

      <!-- Panneau de contrôle des lumières -->
      <div class="light-settings-panel" 
           [class.show]="isLightControlsOpen"
           (mouseenter)="keepNavbarOpen()">
        <div class="panel-header">
          <h6 class="text-white mb-0">Paramètres d'éclairage</h6>
          <div class="tab-selector">
            <button class="tab-button" 
                   [class.active]="activeTab === 'navbar'"
                   (click)="activeTab = 'navbar'">
              Navbar
            </button>
            <button class="tab-button" 
                   [class.active]="activeTab === 'background'"
                   (click)="activeTab = 'background'">
              Fond
            </button>
          </div>
          <button class="btn-close-panel" (click)="toggleLightControls()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="panel-content">
          <div class="light-control" *ngFor="let light of filteredLights">
            <div class="light-header">
              <label class="text-white d-flex align-items-center">
                <i [class]="getLightIcon(light.type)" class="me-2"></i>
                {{ light.name }}
              </label>
              <div class="light-actions">
                <input type="color" 
                       class="form-control form-control-color btn-icon"
                       [value]="light.color"
                       (change)="onLightColorChange(light.name, $event)"
                       [title]="'Couleur de ' + light.name">
                <button class="btn-toggle" 
                        [class.active]="light.enabled"
                        (click)="toggleLight(light.name)">
                  <i class="fas" [class.fa-eye]="light.enabled" [class.fa-eye-slash]="!light.enabled"></i>
                </button>
              </div>
            </div>
            <div class="light-controls">
              <input type="range" 
                     class="form-range light-slider" 
                     [min]="0" 
                     [max]="light.type === 'DirectionalLight' ? 1.5 : 1" 
                     step="0.05" 
                     [value]="light.intensity"
                     (input)="onLightIntensityChange(light.name, $event)">
              <input type="number" 
                     class="form-control form-control-sm intensity-input" 
                     [value]="light.intensity"
                     [min]="0" 
                     [max]="light.type === 'DirectionalLight' ? 1.5 : 1"
                     step="0.05"
                     (input)="onLightIntensityChange(light.name, $event)">
            </div>
          </div>
        </div>
      </div>
      
      <div class="navbar-brand-section">
        <div class="d-flex align-items-center">
          <button class="btn btn-icon me-2" 
                  (click)="toggleLightControls()"
                  title="Contrôles d'éclairage">
            <i class="fas fa-lightbulb"></i>
          </button>
          <span class="navbar-brand">Lucas Bonneau</span>
        </div>
      </div>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto align-items-center">
          <li class="nav-item"><a class="nav-link" href="#about">À propos</a></li>
          <li class="nav-item"><a class="nav-link" href="#skills">Compétences</a></li>
          <li class="nav-item"><a class="nav-link" href="#contact">Contact</a></li>
          <li class="nav-item ms-2">
            <button class="btn btn-outline-light" (click)="downloadCV()">
              Télécharger CV
            </button>
          </li>
        </ul>
      </div>

      <!-- Indicateur de défilement/clic -->
      <div class="scroll-indicator" 
           [class.hidden]="isShrunk$ | async"
           (click)="navbarEffects.resetForceState()">
        <div class="scroll-text">Scroll</div>
        <div class="scroll-arrow"></div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1030;
      overflow: visible;
      cursor: pointer;
    }

    .large-navbar {
      height: 100vh;
      padding-top: 1.5rem;
      padding-bottom: 1.5rem;
      background: transparent;
    }

    .shrink-navbar {
      height: 60px;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: default;
    }

    .canvas-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      z-index: -1;
      pointer-events: none;
    }

    .navbar-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }

    .shrink-navbar .navbar-canvas {
      transform: translateY(-94vh);
      filter: brightness(0.8);
    }

    .large-navbar .navbar-canvas {
      transform: translateY(0);
      filter: brightness(1.2);
    }

    /* Position du contenu */
    .navbar-brand-section {
      transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .large-navbar .navbar-brand-section {
      transform: translateY(42vh);
      opacity: 0.9;
    }

    .shrink-navbar .navbar-brand-section {
      transform: translateY(0);
      opacity: 1;
    }

    .navbar-collapse {
      transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .large-navbar .navbar-collapse {
      transform: translateY(45vh);
      opacity: 0.9;
    }

    .shrink-navbar .navbar-collapse {
      transform: translateY(0);
      opacity: 1;
    }

    /* Gestion du toggler */
    .large-navbar .navbar-toggler {
      opacity: 0;
      pointer-events: none;
    }

    .shrink-navbar .navbar-toggler {
      opacity: 1;
      pointer-events: all;
      transition: opacity 0.3s ease;
    }

    /* Responsive */
    @media (max-width: 991.98px) {
      .large-navbar .navbar-collapse {
        transform: translateY(40vh);
      }
      
      .navbar-collapse {
        background: rgba(0, 0, 0, 0.9);
        padding: 1rem;
        border-radius: 8px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
    }

    /* Indicateur de scroll/clic */
    .scroll-indicator {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      color: white;
      opacity: 1;
      transition: opacity 0.3s ease;
    }

    .scroll-indicator.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .scroll-text {
      font-size: 0.9rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }

    .scroll-arrow {
      width: 20px;
      height: 20px;
      border-right: 2px solid white;
      border-bottom: 2px solid white;
      transform: rotate(45deg);
      animation: bounce 2s infinite;
      box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0) rotate(45deg);
      }
      40% {
        transform: translateY(-10px) rotate(45deg);
      }
      60% {
        transform: translateY(-5px) rotate(45deg);
      }
    }

    /* Interactions */
    .navbar .navbar-brand-section,
    .navbar .navbar-collapse,
    .navbar .navbar-toggler {
      position: relative;
      z-index: 2;
    }

    .large-navbar .nav-link,
    .large-navbar .navbar-brand,
    .large-navbar .btn {
      font-size: 1.2rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }

    .large-navbar .nav-link:hover,
    .large-navbar .navbar-brand:hover {
      text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
      transform: translateY(-2px);
    }

    /* Amélioration du bouton CV */
    .btn-outline-light {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .btn-outline-light:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .large-navbar .btn-outline-light {
      padding: 0.8rem 1.5rem;
      border-width: 2px;
    }

    /* Effet de survol sur les liens de navigation */
    .nav-link {
      position: relative;
      padding: 0.5rem 1rem;
    }

    .nav-link::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background: currentColor;
      transition: all 0.3s ease;
      transform: translateX(-50%);
    }

    .nav-link:hover::after {
      width: 100%;
    }

    .light-controls {
      background: rgba(0, 0, 0, 0.5);
      padding: 1rem;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .light-control label {
      font-size: 0.8rem;
      margin-bottom: 0.25rem;
    }

    .light-slider {
      width: 150px;
      height: 4px;
      cursor: pointer;
    }

    .light-slider::-webkit-slider-thumb {
      background: white;
    }

    .light-slider::-moz-range-thumb {
      background: white;
    }

    /* Panneau de contrôle des lumières */
    .light-panel {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%) translateY(-90%);
      transition: transform 0.3s ease-in-out;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 0 0 15px 15px;
      padding: 1rem;
      z-index: 1040;
      width: 300px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .light-panel.open {
      transform: translateX(-50%) translateY(0);
    }

    .light-panel-toggle {
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 5px 15px;
      border-radius: 0 0 10px 10px;
      cursor: pointer;
      color: white;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    }

    .light-panel-toggle:hover {
      padding-bottom: 8px;
    }

    .light-section {
      padding: 10px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
    }

    .light-control {
      margin-bottom: 1rem;
    }

    .light-control label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
    }

    .light-slider {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.2);
    }

    .light-slider::-webkit-slider-thumb {
      background: white;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      cursor: pointer;
    }

    .light-slider::-moz-range-thumb {
      background: white;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      cursor: pointer;
    }

    /* Animation pour l'icône */
    @keyframes glow {
      0%, 100% { text-shadow: 0 0 5px rgba(255, 255, 255, 0.8); }
      50% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.8); }
    }

    .fa-lightbulb {
      animation: glow 2s ease-in-out infinite;
    }

    /* Styles pour les contrôles de lumière */
    .light-controls {
      background: rgba(0, 0, 0, 0.9);
      padding: 1rem;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transform: translateY(-100%);
      opacity: 0;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      position: absolute;
      top: 100%;
      left: 0;
      width: 350px;
      visibility: hidden;
    }

    .light-controls.show {
      transform: translateY(0);
      opacity: 1;
      visibility: visible;
    }

    .btn-icon {
      background: none;
      border: none;
      color: white;
      padding: 0.25rem;
      font-size: 1.2rem;
      cursor: pointer;
      transition: color 0.3s ease;
    }

    .btn-icon:hover {
      color: rgba(255, 255, 255, 0.8);
    }

    .light-control {
      margin-bottom: 1.5rem;
    }

    .light-control:last-child {
      margin-bottom: 0;
    }

    .intensity-input {
      width: 70px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      text-align: center;
    }

    .intensity-input:focus {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
      color: white;
      outline: none;
      box-shadow: none;
    }

    .light-slider {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }

    .light-slider::-webkit-slider-thumb {
      background: white;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .light-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .light-slider::-moz-range-thumb {
      background: white;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .light-slider::-moz-range-thumb:hover {
      transform: scale(1.2);
    }

    /* Panneau de paramètres */
    .light-settings-panel {
      position: fixed;
      top: 0;
      left: 0;
      width: 350px;
      background: rgba(0, 0, 0, 0.95);
      border-right: 1px solid rgba(255, 255, 255, 0.2);
      height: 100vh;
      transform: none;
      transition: opacity 0.3s ease-out;
      z-index: 1050;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
    }

    .light-settings-panel.show {
      transform: none;
      opacity: 1;
      pointer-events: all;
    }

    .panel-header {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-close-panel {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      padding: 0.25rem;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .btn-close-panel:hover {
      opacity: 1;
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .light-control {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .light-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .light-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-toggle {
      background: none;
      border: none;
      color: white;
      padding: 0.25rem;
      opacity: 0.7;
      transition: all 0.2s ease;
    }

    .btn-toggle.active {
      opacity: 1;
      color: #66ccff;
    }

    .light-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .light-slider {
      flex: 1;
    }

    .intensity-input {
      width: 70px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      text-align: center;
    }

    .form-control-color {
      width: 32px;
      padding: 0;
      height: 32px;
    }

    .light-slider {
      -webkit-appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.2);
      outline: none;
      margin: 10px 0;
    }

    .light-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    }

    .light-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    }

    .intensity-input {
      width: 70px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      text-align: center;
      padding: 4px 8px;
      border-radius: 4px;
      margin-left: 10px;
    }

    .intensity-input:focus {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
      outline: none;
    }

    .light-controls {
      display: flex;
      align-items: center;
      margin-top: 10px;
    }

    .light-settings-panel {
      position: fixed;
      top: 0;
      left: 0;
      width: 350px;
      background: rgba(0, 0, 0, 0.95);
      border-right: 1px solid rgba(255, 255, 255, 0.2);
      height: 100vh;
      transform: none;
      transition: opacity 0.3s ease-out;
      z-index: 1050;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
    }

    .light-settings-panel.show {
      transform: none;
      opacity: 1;
      pointer-events: all;
    }

    .panel-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .light-control {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .light-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .light-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .form-control-color {
      width: 40px;
      height: 40px;
      padding: 2px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      cursor: pointer;
    }

    .form-control-color::-webkit-color-swatch {
      border-radius: 4px;
      border: none;
    }

    .btn-toggle {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .btn-toggle:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .btn-toggle.active {
      background: rgba(102, 204, 255, 0.2);
      border-color: #66ccff;
      color: #66ccff;
    }

    .light-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: transparent;
      padding: 0;
      position: static;
      transform: none;
      opacity: 1;
      visibility: visible;
      width: 100%;
    }

    .light-slider {
      -webkit-appearance: none;
      appearance: none;
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.2);
      outline: none;
    }

    .light-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #66ccff;
      cursor: pointer;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    }

    .light-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #66ccff;
      cursor: pointer;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    }

    .intensity-input {
      width: 80px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      text-align: center;
      padding: 8px;
      border-radius: 6px;
      font-size: 14px;
    }

    .intensity-input:focus {
      background: rgba(255, 255, 255, 0.15);
      border-color: #66ccff;
      outline: none;
      box-shadow: 0 0 0 2px rgba(102, 204, 255, 0.2);
    }

    .btn-close-panel {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .btn-close-panel:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .light-settings-panel {
      position: fixed;
      top: 0;
      left: 0;
      width: 350px;
      background: rgba(0, 0, 0, 0.95);
      border-right: 1px solid rgba(255, 255, 255, 0.2);
      height: 100vh;
      transform: none;
      transition: opacity 0.3s ease-out;
      z-index: 1050;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
    }

    .light-settings-panel.show {
      transform: none;
      opacity: 1;
      pointer-events: all;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .panel-content {
      padding: 1rem;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    .panel-content::-webkit-scrollbar {
      width: 6px;
    }

    .panel-content::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .light-control {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      transition: background-color 0.2s ease;
    }

    .light-control:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .form-control-color {
      cursor: pointer;
      border: 2px solid rgba(255, 255, 255, 0.2);
      background: transparent;
      transition: border-color 0.2s ease;
    }

    .form-control-color:hover {
      border-color: rgba(255, 255, 255, 0.4);
    }

    .btn-toggle {
      opacity: 0.7;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .btn-toggle:hover {
      opacity: 1;
      transform: scale(1.1);
    }

    .btn-toggle.active {
      opacity: 1;
      color: #66ccff;
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  @ViewChild('threeNavbarCanvas') navbarCanvas!: ElementRef<HTMLCanvasElement>;
  
  isLightControlsOpen = false;
  currentColor$: Observable<string>;
  lights: any[] = [];
  private subscriptions: Subscription[] = [];
  
  colorOptions: any[];
  cvAvailable = false;
  isShrunk$: Observable<boolean>;
  private mouseX = 0;
  private mouseY = 0;

  showLightSettings: boolean = false;
  activeTab: 'navbar' | 'background' = 'navbar';

  constructor(
    private threeService: ThreeService,
    private colorService: ColorService,
    public navbarEffects: NavbarEffectsService
  ) {
    this.currentColor$ = this.threeService.getCurrentColor();
    this.colorOptions = this.colorService.getColorOptions();
    this.isShrunk$ = this.navbarEffects.isShrunk$;
    
    fetch('assets/cv.pdf')
      .then(response => {
        this.cvAvailable = response.ok;
      })
      .catch(() => {
        this.cvAvailable = false;
      });
  }

  ngOnInit() {
    // Ajouter l'écouteur de mouvement de la souris
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));

    // S'abonner aux changements d'état de la navbar
    this.subscriptions.push(
      this.navbarEffects.isShrunk$.subscribe(isShrunk => {
        if (isShrunk && this.isLightControlsOpen) {
          this.isLightControlsOpen = false;
        }
      })
    );
  }

  ngAfterViewInit() {
    this.threeService.initNavbar(this.navbarCanvas.nativeElement);
    // Appeler onResize une fois au démarrage pour gérer la largeur initiale
    this.threeService.onResize();
  }

  ngOnDestroy() {
    // Nettoyage des ressources Three.js
    this.threeService.dispose();
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private handleMouseMove(event: MouseEvent) {
    // Calculer la position relative de la souris (-1 à 1)
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Mettre à jour la rotation du modèle
    this.threeService.updateMousePosition(this.mouseX, this.mouseY);
  }

  changeColor(event: Event) {
    const input = event.target as HTMLInputElement;
    this.threeService.setCurrentColor(input.value);
  }

  downloadCV() {
    if (this.cvAvailable) {
      window.open('assets/cv.pdf', '_blank');
    }
  }


  toggleLightControls() {
    this.isLightControlsOpen = !this.isLightControlsOpen;
    if (this.isLightControlsOpen) {
      this.updateLightsList();
      this.navbarEffects.forceFullscreen(true);
    } else {
      this.navbarEffects.forceFullscreen(false);
    }
  }

  updateLightsList() {
    this.lights = this.threeService.getAllLights();
  }

  get filteredLights() {
    return this.lights.filter(light => 
      (this.activeTab === 'navbar' && light.type !== 'BackgroundLight') ||
      (this.activeTab === 'background' && light.type === 'BackgroundLight')
    );
  }

  getLightIcon(type: string) {
    return type === 'AmbientLight' ? 'fas fa-sun' : 'fas fa-lightbulb';
  }

  onLightIntensityChange(lightName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const intensity = parseFloat(input.value);
    const light = this.lights.find(l => l.name === lightName);
    if (light) {
      light.intensity = intensity;
      // Utiliser la méthode générique plutôt que les méthodes spécifiques
      this.threeService.setLightIntensity(lightName, intensity);
    }
  }

  onLightColorChange(lightName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    const light = this.lights.find(l => l.name === lightName);
    if (light) {
      light.color = color;
      // Utiliser la méthode générique plutôt que les méthodes spécifiques
      this.threeService.setLightColor(lightName, color);
    }
  }

  toggleLight(lightName: string) {
    const light = this.lights.find(l => l.name === lightName);
    if (light) {
      light.enabled = !light.enabled;
      this.threeService.setLightVisibility(lightName, light.enabled);
    }
  }

  // Méthode pour garder la navbar ouverte lors du survol du panneau de contrôle
  keepNavbarOpen() {
    this.navbarEffects.forceFullscreen(true);
  }

  toggleLightSettings() {
    this.showLightSettings = !this.showLightSettings;
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const panel = document.querySelector('.light-settings-panel');
    const toggleButton = document.querySelector('.light-settings-toggle');

    if (panel && !panel.contains(target) && toggleButton && !toggleButton.contains(target)) {
      this.showLightSettings = false;
    }
  }
}
