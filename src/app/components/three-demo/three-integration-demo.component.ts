import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarThreeService } from '../../services/navbar-three.service';
import { BackgroundThreeService } from '../../services/background-three.service';
import { Observable, Subscription } from 'rxjs';

/**
 * Composant de démonstration intégrant les deux services Three.js (navbar et background)
 * Ce composant illustre comment utiliser les services NavbarThreeService et 
 * BackgroundThreeService ensemble dans une seule interface.
 */
@Component({
  selector: 'app-three-integration-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="three-container">
      <!-- Canvas pour la navbar -->
      <canvas #navbarCanvas class="navbar-canvas"></canvas>
      
      <!-- Canvas pour le background -->
      <canvas #backgroundCanvas class="background-canvas"></canvas>
      
      <!-- Contenu de démo pour montrer l'effet de défilement -->
      <div class="content">
        <section class="demo-section">
          <h1>Démonstration d'intégration Three.js</h1>
          <p>Cette page démontre l'utilisation combinée des services Three.js spécialisés</p>
        </section>
        
        <section class="demo-section">
          <h2>NavbarThreeService</h2>
          <p>Gère les animations 3D de la barre de navigation</p>
          <p><em>👆 Déplacez votre souris au-dessus de la barre pour voir les effets</em></p>
        </section>
        
        <section class="demo-section">
          <h2>BackgroundThreeService</h2>
          <p>Contrôle les effets d'arrière-plan qui répondent au défilement</p>
          <p><em>📜 Continuez à défiler pour voir les effets de parallaxe</em></p>
        </section>
        
        <section class="demo-section">
          <h2>Architecture modulaire</h2>
          <p>Les services séparés permettent une meilleure organisation du code</p>
          <p>Chaque service gère sa propre scène Three.js indépendamment</p>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .three-container {
      position: relative;
      width: 100%;
      height: 100vh;
    }
    
    .navbar-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 60px; /* Hauteur de la navbar */
      z-index: 100;
      pointer-events: none;
    }
    
    .background-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }
    
    .content {
      position: relative;
      z-index: 1;
      padding-top: 60px; /* Correspond à la hauteur de la navbar */
    }
    
    .demo-section {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      color: white;
      text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
      text-align: center;
    }

    h1, h2 {
      margin-bottom: 1rem;
    }

    p {
      margin-bottom: 0.5rem;
      max-width: 600px;
    }
  `]
})
export class ThreeIntegrationDemoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navbarCanvas') navbarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('backgroundCanvas') backgroundCanvas!: ElementRef<HTMLCanvasElement>;
  
  private subscriptions: Subscription[] = [];
  
  constructor(
    private navbarThreeService: NavbarThreeService,
    private backgroundThreeService: BackgroundThreeService
  ) {}
  
  ngOnInit() {
    // Ajouter l'écouteur d'événement pour le défilement
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }
  
  ngAfterViewInit() {
    // Initialiser le service Three.js pour la navbar
    if (this.navbarCanvas) {
      this.navbarThreeService.initNavbar(this.navbarCanvas.nativeElement);
    }
    
    // Initialiser le service Three.js pour le background
    if (this.backgroundCanvas) {
      this.backgroundThreeService.initBackground(this.backgroundCanvas.nativeElement);
      
      // Initialiser avec la position de défilement actuelle
      this.backgroundThreeService.updateScrollPosition(window.scrollY);
    }
    
    // Gérer le redimensionnement
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Initialiser les dimensions une première fois
    this.handleResize();
  }
  
  ngOnDestroy() {
    // Nettoyer les écouteurs d'événements et les abonnements
    window.removeEventListener('scroll', this.handleScroll.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Nettoyer les ressources Three.js
    this.navbarThreeService.dispose();
    this.backgroundThreeService.dispose();
  }
  
  /**
   * Gère l'événement de défilement
   */
  private handleScroll() {
    // Mettre à jour la position de défilement dans le service de background
    this.backgroundThreeService.updateScrollPosition(window.scrollY);
  }
  
  /**
   * Gère le redimensionnement de la fenêtre
   */
  private handleResize() {
    this.navbarThreeService.onResize();
    this.backgroundThreeService.onResize();
  }
  
  /**
   * Gère le mouvement de la souris pour les effets interactifs
   */
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Calculer la position normalisée de la souris (-1 à 1)
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Mettre à jour la position de la souris dans les deux services
    this.navbarThreeService.updateMousePosition(mouseX, mouseY);
    this.backgroundThreeService.updateMousePosition(mouseX, mouseY);
  }
}
