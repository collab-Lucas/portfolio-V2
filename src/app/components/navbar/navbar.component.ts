import { Component, ElementRef, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeService } from '../../services/three.service';
import { SimpleLight } from '../../services/three.service';
import { ColorService } from '../../services/color.service';
import { NavbarEffectsService } from '../../services/navbar-effects.service';
import { Observable, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],  template: `    <nav class="navbar navbar-expand-lg navbar-dark fixed-top px-3"
         [class.shrink-navbar]="isShrunk$ | async"
         [class.large-navbar]="!(isShrunk$ | async)"
         (click)="toggleNavbar($event)">
      <div class="canvas-container">
        <canvas #threeNavbarCanvas class="navbar-canvas"></canvas>
      </div>

      <!-- Panneau de contrôle des lumières -->
      <div class="light-settings-panel" [class.show]="isLightControlsOpen">
        <div class="panel-header">
          <h6 class="text-white mb-0">Paramètres d'éclairage</h6>          <div class="tab-selector">
            <button class="tab-button" 
                   [class.active]="activeTab === 'navbar'"
                   (click)="setActiveTab('navbar')">
              Navbar
            </button>
            <button class="tab-button" 
                   [class.active]="activeTab === 'background'"
                   (click)="setActiveTab('background')">
              Fond
            </button>
          </div>          <button class="btn-close-panel" (click)="toggleLightControls($event)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="panel-content">          <div class="light-control" *ngFor="let light of filteredLights">
            <div class="light-header">
              <label class="text-white d-flex align-items-center">
                <img [src]="getLightIcon(light.type)" class="light-icon me-2" alt="{{ light.name }}" />
                {{ light.name }}
              </label>
              <div class="light-actions">
                <input type="color" 
                       class="form-control form-control-color btn-icon"
                       [value]="light.color"
                       (change)="onLightColorChange(light.name, $event)"
                       [title]="'Couleur de ' + light.name"><button class="btn-toggle" 
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
        <div class="d-flex align-items-center">          <button class="btn btn-icon me-2" 
                  (click)="toggleLightControls($event)"
                  title="Contrôles d'éclairage">
            <img src="assets/img/brands/logo site.png" alt="Paramètres" class="logo-settings" />
          </button>
          <span class="navbar-brand">Lucas Bonneau</span>
        </div>
      </div>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto align-items-center">          <li class="nav-item me-3">
            <a class="nav-link" 
               href="#about" 
               (click)="onNavLinkClick($event, 'about')">À propos</a>
          </li>
          <li class="nav-item me-3">
            <a class="nav-link" 
               href="#skills" 
               (click)="onNavLinkClick($event, 'skills')">Compétences</a>
          </li>
          <li class="nav-item me-3">
            <a class="nav-link" 
               href="#contact" 
               (click)="onNavLinkClick($event, 'contact')">Contact</a>
          </li>
          <li class="nav-item ms-4">
            <button class="btn btn-outline-light" 
                    (click)="downloadCV($event)">
              Télécharger CV
            </button>
          </li>
        </ul>
      </div>

      <div class="scroll-indicator" [class.hidden]="isShrunk$ | async">
        <div class="scroll-text">Scroll</div>
        <div class="scroll-arrow"></div>
      </div>
    </nav>
  `,
  styles: [`    .navbar {
      transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1030;
      overflow: visible;
      cursor: grab;
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
    }    /* Améliorations pour le mode navbar large avec espacement et texte plus blanc */
    .large-navbar .nav-link,
    .large-navbar .navbar-brand,
    .large-navbar .btn {
      font-size: 1.2rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      color: rgba(255, 255, 255, 0.95) !important;
    }

    .large-navbar .nav-link {
      margin: -0.25rem 0.75rem; /* Plus d'espacement en mode large */
      font-weight: 500;
    }

    .large-navbar .nav-link:hover,
    .large-navbar .navbar-brand:hover {
      text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
      transform: translateY(-2px);
      color: rgba(255, 255, 255, 1) !important;
    }/* Amélioration du bouton CV - Zone de hover agrandie et contour retiré + Texte plus blanc */
    .btn-outline-light {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
      padding: 0.75rem 1.5rem;
      margin: -0.25rem; /* Agrandit la zone de hover */
      border-radius: 8px;
      border: 2px solid rgba(255, 255, 255, 0.9);
      color: rgba(255, 255, 255, 0.95) !important;
      font-weight: 500;
    }

    /* Retirer tous les contours au focus/active */
    .btn-outline-light:focus,
    .btn-outline-light:active,
    .btn-outline-light:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      border-color: rgba(255, 255, 255, 0.9);
      color: rgba(255, 255, 255, 0.95) !important;
    }

    .btn-outline-light:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
      background-color: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 1);
      color: rgba(255, 255, 255, 1) !important;
    }

    .large-navbar .btn-outline-light {
      padding: 0.9rem 1.8rem;
      border-width: 2px;
      margin: -0.3rem; /* Zone de hover encore plus grande en mode large */
      font-size: 1.1rem;
    }    /* Effet de survol sur les liens de navigation - Option 1: Soulignage + Fond subtil au hover + Zone agrandie + Texte plus blanc */
    .nav-link {
      position: relative;
      padding: 0.75rem 1.25rem;
      margin: -0.25rem 0.5rem; /* Agrandit la zone de hover et ajoute espacement horizontal */
      border-radius: 8px;
      transition: all 0.3s ease;
      color: rgba(255, 255, 255, 0.9) !important;
      font-weight: 500;
    }

    /* Retirer le contour au focus pour les liens */
    .nav-link:focus,
    .nav-link:active,
    .nav-link:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }

    /* Fond subtil au hover uniquement avec zone agrandie + texte plus blanc */
    .nav-link:hover {
      background-color: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
      color: rgba(255, 255, 255, 1) !important;
    }

    /* Effet de soulignage (conservé de l'original) */
    .nav-link::after {
      content: '';
      position: absolute;
      bottom: 0.25rem;
      left: 50%;
      width: 0;
      height: 2px;
      background: currentColor;
      transition: all 0.3s ease;
      transform: translateX(-50%);
    }

    .nav-link:hover::after {
      width: calc(100% - 0.5rem);
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
    }    /* Style pour le logo des paramètres */
    .logo-settings {
      width: 24px;
      height: 24px;
      object-fit: contain;
      transition: transform 0.3s ease;
    }

    .logo-settings:hover {
      transform: rotate(30deg);
    }
    
    /* Style pour les icônes de lumière dans le panneau */
    .light-icon {
      width: 20px;
      height: 20px;
      object-fit: contain;
      filter: brightness(1.2);
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

    .tab-selector {
      display: flex;
      gap: 5px;
      margin: 0 15px;
    }
    
    .tab-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 5px 15px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
    }
    
    .tab-button:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    
    .tab-button.active {
      background: rgba(102, 204, 255, 0.2);
      border-color: #66ccff;
      color: #66ccff;
    }
    .shadow-toggle {
      margin-left: 5px;
    }
    
    .shadow-toggle.active {
      background: rgba(255, 223, 100, 0.3);
      border-color: #ffdf64;
      color: #ffdf64;
    }
    .shadow-toggle {
      position: relative;
    }
    
    .shadow-toggle.active {
      background: rgba(92, 92, 92, 0.3);
      border-color: #888;
      color: #ddd;
    }
    
    .shadow-toggle .fa-moon {
      font-size: 0.9rem;
    }
      .shadow-toggle:hover::after {
      content: 'Ombres';
      position: absolute;
      bottom: -25px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0.9;
    }

    /* ===== STYLES OPTIMISÉS POUR LA NAVIGATION ===== */
    
    /* Fond pour les liens de navigation */
    .nav-link-with-bg {
      position: relative;
      border-radius: 8px;
      padding: 0.75rem 1.25rem !important;
      margin: 0 0.25rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    
    .nav-link-with-bg::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
      opacity: 0;
      transition: opacity 0.3s ease;
      border-radius: 8px;
    }
    
    .nav-link-with-bg:hover::before {
      opacity: 1;
    }
    
    .nav-link-with-bg:hover {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    
    .nav-link-with-bg:active {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(0);
    }
    
    /* Animation de clic pour feedback */
    .nav-link-with-bg::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transition: width 0.6s, height 0.6s;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    
    .nav-link-with-bg:active::after {
      width: 200px;
      height: 200px;
    }
    
    /* Curseur optimisé pour les différentes zones */
    .navbar {
      cursor: pointer;
    }
    
    .navbar .nav-link-with-bg,
    .navbar .btn-outline-light,
    .navbar .btn-icon,
    .navbar .navbar-brand-section {
      cursor: pointer;
    }
    
    .shrink-navbar {
      cursor: default;
    }
    
    /* Amélioration du bouton CV avec protection contre toggle */
    .btn-outline-light {
      position: relative;
      z-index: 10;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-width: 2px;
      padding: 0.75rem 1.5rem;
      font-weight: 500;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }
    
    .btn-outline-light:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.8);
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
    
    .btn-outline-light:active {
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
    }
    
    /* Zone interactive clarifiée */
    .navbar-nav {
      position: relative;
      z-index: 5;
    }
    
    .navbar-brand-section {
      position: relative;
      z-index: 5;
    }
    
    /* Responsive amélioré */
    @media (max-width: 991.98px) {
      .nav-link-with-bg {
        margin: 0.25rem 0;
        padding: 0.75rem 1rem !important;
      }
      
      .btn-outline-light {
        margin-top: 0.5rem;
        width: 100%;
      }
    }
    
    /* Performance optimizations */
    .navbar,
    .nav-link-with-bg,
    .btn-outline-light {
      will-change: transform;
    }
    
    /* Improved focus states for accessibility */
    .nav-link-with-bg:focus,
    .btn-outline-light:focus {
      outline: 2px solid rgba(255, 255, 255, 0.5);
      outline-offset: 2px;
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  @ViewChild('threeNavbarCanvas') navbarCanvas!: ElementRef<HTMLCanvasElement>;
    isLightControlsOpen = false;
  currentColor$: Observable<string>;
  lights: SimpleLight[] = []; // Utiliser SimpleLight au lieu de any[]
  private subscriptions: Subscription[] = [];
  
  // Les anciennes propriétés sont conservées pour la rétrocompatibilité
  // mais ne sont plus directement utilisées
  ambientLightIntensity = 0.4; // Initialisation à 0.4 comme demandé
  directionalLightIntensity = 0.05; // Initialisation à 0.05 comme demandé
  pointLightIntensity = 0.3;
  backgroundLightIntensity = 0.5;

  ambientLightColor = '#ffffff';
  directionalLightColor = '#ffffff';
  pointLightColor = '#ffffff';
  backgroundLightColor = '#ffffff';

  colorOptions: any[];  cvAvailable = false;
  isShrunk$: Observable<boolean>;
  private mouseX = 0;
  private mouseY = 0;
  private currentShrinkState = true; // Cache pour l'état actuel

  showLightSettings: boolean = false;
  activeTab: 'navbar' | 'background' = 'navbar';// Définition des valeurs d'initialisation des lumières spécifiques
  private initialLightValues = {
    'Lumière ambiante': 0.4,
    'Lumière directionnelle': 0.05,
    'SpotBD': 0.5,
    'SpotHD': 20.0,
    'Spotprincipal': 100.0, 
    'Spotrouge': 1000.0,
    'Sun': 0.9
  };

  constructor(
    private threeService: ThreeService,
    private colorService: ColorService,
    private navbarEffects: NavbarEffectsService
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
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));    // S'abonner aux changements d'état de la navbar
    this.subscriptions.push(
      this.navbarEffects.isShrunk$.subscribe(isShrunk => {
        this.currentShrinkState = isShrunk; // Mettre à jour le cache
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
    
    // Charger la liste initiale des lumières
    this.updateLightsList();
    
    // Initialiser les lumières avec les valeurs par défaut
    this.initializeLights();
      
    // S'abonner aux changements de lumières
    this.subscriptions.push(
      this.threeService.getLights().subscribe((lights: SimpleLight[]) => {
        this.lights = lights;
      })
    );
  }
  
  /**
   * Initialise les lumières avec les valeurs prédéfinies
   */
  private initializeLights(): void {
    // Attendre un peu pour s'assurer que toutes les lumières sont chargées
    setTimeout(() => {
      // Pour chaque lumière dans notre liste d'initialisation
      Object.entries(this.initialLightValues).forEach(([lightName, intensity]) => {
        // Trouver la lumière correspondante
        const light = this.lights.find(l => l.name === lightName);
        if (light) {
          // Définir l'intensité et s'assurer que la lumière est activée
          this.threeService.setLightIntensity(lightName, intensity);
          this.threeService.setLightVisibility(lightName, true);
          
          // Mettre à jour la valeur locale si c'est une des lumières principales
          switch (lightName) {
            case 'Lumière ambiante':
              this.ambientLightIntensity = intensity;
              break;
            case 'Lumière directionnelle':
              this.directionalLightIntensity = intensity;
              break;
            case 'Lumière ponctuelle':
              this.pointLightIntensity = intensity;
              break;
            case 'Lumière de fond':
              this.backgroundLightIntensity = intensity;
              break;
          }
        }
      });
      
      console.log('Lumières initialisées avec les valeurs par défaut');
    }, 500); // Délai pour s'assurer que toutes les lumières sont chargées
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
  }  /**
   * Gère le clic sur les liens de navigation (version optimisée)
   */
  onNavLinkClick(event: Event, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    
    // Utiliser le cache au lieu d'une subscription
    const wasExpanded = !this.currentShrinkState;
    
    // Si la navbar est grande, la réduire
    if (wasExpanded) {
      this.navbarEffects.setNavbarState(true);
    }
    
    // Navigation vers la section avec un délai optimisé
    const delay = wasExpanded ? 300 : 0;
    setTimeout(() => {
      this.navigateToSection(targetId);
    }, delay);
  }

  /**
   * Navigation vers une section spécifique
   */
  private navigateToSection(targetId: string) {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
  downloadCV(event?: Event) {
    // Empêcher la propagation pour éviter l'agrandissement de la navbar
    if (event) {
      event.stopPropagation();
    }
    
    if (this.cvAvailable) {
      window.open('assets/CV_Bonneau_Lucas.pdf', '_blank');
    }
  }

  onAmbientLightChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.ambientLightIntensity = parseFloat(input.value);
    this.threeService.setAmbientLightIntensity(this.ambientLightIntensity);
  }

  onDirectionalLightChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.directionalLightIntensity = parseFloat(input.value);
    this.threeService.setDirectionalLightIntensity(this.directionalLightIntensity);
  }

  onPointLightChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pointLightIntensity = parseFloat(input.value);
    this.threeService.setPointLightIntensity(this.pointLightIntensity);
  }

  onBackgroundLightChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.backgroundLightIntensity = parseFloat(input.value);
    this.threeService.setBackgroundLightIntensity(this.backgroundLightIntensity);
  }

  // Méthodes pour les inputs numériques
  onAmbientLightIntensityInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.ambientLightIntensity = parseFloat(input.value);
    this.threeService.setAmbientLightIntensity(this.ambientLightIntensity);
  }

  onDirectionalLightIntensityInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.directionalLightIntensity = parseFloat(input.value);
    this.threeService.setDirectionalLightIntensity(this.directionalLightIntensity);
  }

  onPointLightIntensityInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pointLightIntensity = parseFloat(input.value);
    this.threeService.setPointLightIntensity(this.pointLightIntensity);
  }

  onBackgroundLightIntensityInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.backgroundLightIntensity = parseFloat(input.value);
    this.threeService.setBackgroundLightIntensity(this.backgroundLightIntensity);
  }

  // Méthodes pour les changements de couleur
  onAmbientLightColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.ambientLightColor = input.value;
    this.threeService.setAmbientLightColor(this.ambientLightColor);
  }

  onDirectionalLightColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.directionalLightColor = input.value;
    this.threeService.setDirectionalLightColor(this.directionalLightColor);
  }

  onPointLightColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pointLightColor = input.value;
    this.threeService.setPointLightColor(this.pointLightColor);
  }

  onBackgroundLightColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.backgroundLightColor = input.value;
    this.threeService.setBackgroundLightColor(this.backgroundLightColor);
  }  toggleLightControls(event: Event) {
    // Prevent event bubbling to avoid triggering navbar toggle
    event.stopPropagation();
    
    this.isLightControlsOpen = !this.isLightControlsOpen;
    if (this.isLightControlsOpen) {
      this.updateLightsList();
      this.navbarEffects.setNavbarState(false);  // Expand navbar
    } else {
      this.navbarEffects.setNavbarState(true);   // Shrink navbar
    }
  }
  updateLightsList() {
    this.lights = this.threeService.getAllLights();
    
    // Mettre à jour les propriétés pour la rétrocompatibilité
    const ambientLight = this.lights.find(l => l.name === 'Lumière ambiante');
    if (ambientLight) {
      this.ambientLightIntensity = ambientLight.intensity;
      this.ambientLightColor = ambientLight.color;
    }
    
    const directionalLight = this.lights.find(l => l.name === 'Lumière directionnelle');
    if (directionalLight) {
      this.directionalLightIntensity = directionalLight.intensity;
      this.directionalLightColor = directionalLight.color;
    }
    
    const pointLight = this.lights.find(l => l.name === 'Lumière ponctuelle');
    if (pointLight) {
      this.pointLightIntensity = pointLight.intensity;
      this.pointLightColor = pointLight.color;
    }
    
    const backgroundLight = this.lights.find(l => l.name === 'Lumière de fond');
    if (backgroundLight) {
      this.backgroundLightIntensity = backgroundLight.intensity;
      this.backgroundLightColor = backgroundLight.color;
    }
  }
  
  /**
   * Récupération des lumières filtrées par la scène active
   * Cette propriété getter retourne les lumières correspondant à l'onglet actif
   */
  get filteredLights() {
    return this.threeService.getLightsByScene(this.activeTab);
  }
  
  /**
   * Change d'onglet et actualise les lumières
   * @param tab Onglet à activer ('navbar' ou 'background')
   */
  setActiveTab(tab: 'navbar' | 'background') {
    this.activeTab = tab;
    this.threeService.setActiveTab(tab);
  }
  
  /**
   * Modifie l'intensité d'une lumière
   * @param lightName Nom de la lumière
   * @param event Événement d'input
   */
  onLightIntensityChange(lightName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const intensity = parseFloat(input.value);
    
    // Utiliser la méthode du service pour modifier l'intensité
    this.threeService.setLightIntensity(lightName, intensity);
    
    // Mise à jour des propriétés de rétrocompatibilité
    switch (lightName) {
      case 'Lumière ambiante':
        this.ambientLightIntensity = intensity;
        break;
      case 'Lumière directionnelle':
        this.directionalLightIntensity = intensity;
        break;
      case 'Lumière ponctuelle':
        this.pointLightIntensity = intensity;
        break;
      case 'Lumière de fond':
        this.backgroundLightIntensity = intensity;
        break;
    }
  }
  
  /**
   * Modifie la couleur d'une lumière
   * @param lightName Nom de la lumière
   * @param event Événement de changement de couleur
   */
  onLightColorChange(lightName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    
    // Utiliser la méthode du service pour modifier la couleur
    this.threeService.setLightColor(lightName, color);
    
    // Mise à jour des propriétés de rétrocompatibilité
    switch (lightName) {
      case 'Lumière ambiante':
        this.ambientLightColor = color;
        break;
      case 'Lumière directionnelle':
        this.directionalLightColor = color;
        break;
      case 'Lumière ponctuelle':
        this.pointLightColor = color;
        break;
      case 'Lumière de fond':
        this.backgroundLightColor = color;
        break;
    }
  }
  
  /**
   * Active ou désactive une lumière
   * @param lightName Nom de la lumière
   */
  toggleLight(lightName: string) {
    const light = this.lights.find(l => l.name === lightName);
    if (light) {
      // Inverser l'état actuel
      const newState = !light.enabled;
      
      // Utiliser la méthode du service pour modifier la visibilité
      this.threeService.setLightVisibility(lightName, newState);
      
      // Mettre à jour l'état local
      light.enabled = newState;
    }
  }
  // Méthode pour obtenir l'icône ou l'image en fonction du type de lumière
  getLightIcon(type: string): string {
    switch (type) {
      case 'AmbientLight':
        return 'assets/img/brands/logo ambient.png'; // Image pour lumière ambiante
      case 'DirectionalLight':
        return 'assets/img/brands/logo direct.png';  // Image pour lumière directionnelle
      case 'PointLight':
        return 'assets/img/brands/logo site2.png';   // Image pour lumière ponctuelle
      case 'SpotLight':
        return 'assets/img/brands/logo spotlight-clear.png'; // Image pour spotlight
      case 'HemisphereLight':
        return 'assets/img/brands/logo sun.png';     // Image pour hemisphère
      case 'RectAreaLight':
        return 'assets/img/brands/logo site.png';    // Image générique pour autres lumières
      default:
        return 'assets/img/brands/logo site.png';    // Image par défaut
    }
  }  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const panel = document.querySelector('.light-settings-panel');
    const toggleButton = document.querySelector('.btn-icon img.logo-settings');

    // Only close panel if clicking outside panel and not on the toggle button
    if (panel && !panel.contains(target) && 
        toggleButton && !toggleButton.contains(target) && 
        !target.closest('.btn-icon')) {
      this.isLightControlsOpen = false;
      // Don't auto-shrink navbar when closing panel by clicking elsewhere
    }
  }  /**
   * Toggle navbar between expanded and shrunk states avec gestion optimisée des clics
   */
  toggleNavbar(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Tableau des sélecteurs qui empêchent le toggle
    const preventToggleSelectors = [
      '.light-settings-panel',
      '.btn-icon',
      '.navbar-brand-section',
      '.nav-link',
      '.btn-outline-light',
      '.navbar-nav',
      '.navbar-toggler'
    ];
    
    // Vérifier si le clic est sur un élément qui doit empêcher le toggle
    const shouldPreventToggle = preventToggleSelectors.some(selector => 
      target.closest(selector)
    );
    
    if (shouldPreventToggle) {
      return;
    }
    
    // Faire le toggle seulement si aucun élément bloquant n'est cliqué
    this.navbarEffects.toggleNavbar();
  }
}
