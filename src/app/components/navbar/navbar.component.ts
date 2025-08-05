import { Component, ElementRef, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Observable, Subscription } from 'rxjs';

import { ThreeService } from '../../services/three.service';
import { SimpleLight } from '../../features/three/light.service';
import { ColorService } from '../../features/ui/color.service';
import { NavbarEffectsService } from '../../features/ui/navbar-effects.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./navbar.component.css'],
  template: `    <nav class="navbar navbar-expand-lg navbar-dark fixed-top px-3"
         [class.shrink-navbar]="isShrunk$ | async"
         [class.large-navbar]="!(isShrunk$ | async)"
         (click)="toggleNavbar($event)">
      <div class="canvas-container">
        <canvas #threeNavbarCanvas class="navbar-canvas"></canvas>
      </div>

      <!-- Panneau de contrôle des lumières -->
      <div class="light-settings-panel" [class.show]="isLightControlsOpen">
        <div class="panel-header">
          <h6 class="text-white mb-0">Paramètres d'éclairage</h6>          <button class="btn-close-panel" (click)="toggleLightControls($event)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="panel-content">          <div class="light-control" *ngFor="let light of filteredLights">
            <div class="light-header">
              <label class="text-white d-flex align-items-center">
                <img [src]="getLightIcon(light.type)" 
                     class="light-icon me-2" 
                     [class.point-light-icon]="light.type === 'PointLight'"
                     alt="{{ light.name }}" />
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
                     [max]="getLightMaxValue(light.name)" 
                     [step]="getLightStep(light.name)" 
                     [value]="light.intensity"
                     (input)="onLightIntensityChange(light.name, $event)">
              <input type="number" 
                     class="form-control form-control-sm intensity-input" 
                     [value]="light.intensity"
                     [min]="0" 
                     [max]="getLightMaxValue(light.name)"
                     [step]="getLightStep(light.name)"
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
        <div class="scroll-text">CLIC</div>
        <div class="scroll-arrow"></div>
      </div>
    </nav>

  `,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  @ViewChild('threeNavbarCanvas') navbarCanvas!: ElementRef<HTMLCanvasElement>;

  
    isLightControlsOpen = false;
  currentColor$: Observable<string>;
  lights: SimpleLight[] = []; // Utiliser SimpleLight au lieu de any[]
  private subscriptions: Subscription[] = [];

  // Les couleurs sont maintenant gérées directement dans le service

  colorOptions: any[];  cvAvailable = false;
  isShrunk$: Observable<boolean>;
  private mouseX = 0;
  private mouseY = 0;
  private currentShrinkState = true; // Cache pour l'état actuel

  showLightSettings: boolean = false;
  activeTab: 'navbar' = 'navbar';

  // Les valeurs d'initialisation sont maintenant centralisées dans le LightService

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
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));

    // S'abonner aux changements d'état de la navbar
    this.subscriptions.push(
      this.navbarEffects.isShrunk$.subscribe(isShrunk => {
        this.currentShrinkState = isShrunk;
        if (isShrunk && this.isLightControlsOpen) {
          this.isLightControlsOpen = false;
        }
      })
    );

    // Forcer la navbar à être grande à chaque chargement
    setTimeout(() => {
      this.navbarEffects.setNavbarState(false);
    }, 100);
  }
  ngAfterViewInit() {
    setTimeout(() => {
    // S'assurer que le canvas est prêt
    if (this.navbarCanvas && this.navbarCanvas.nativeElement) {
      // Passer null pour utiliser les valeurs par défaut du service
      this.threeService.initNavbar(this.navbarCanvas.nativeElement);
      
    // Charger le torus seulement après l'animation des lumières (lazy loading)
    // Note: Le lazy loading du torus sera implémenté dans le service Three.js
    // setTimeout(() => {
    //   if (this.threeService.loadTorusModel) {
    //     this.threeService.loadTorusModel();
    //   }
    // }, 3000); // 3 secondes après le chargement initial
      
      // Appeler onResize une fois au démarrage pour gérer la largeur initiale
      this.threeService.onResize();
      
      // Charger la liste initiale des lumières
      this.updateLightsList();        // S'abonner aux changements de lumières
        this.subscriptions.push(
          this.threeService.getLights().subscribe((lights: SimpleLight[]) => {
            this.lights = lights;
          })
        );
      } else {
        console.error('Canvas navbar non disponible');
      }
    }, 0);
  }
  
  // Supprimé : initializeLights() - L'initialisation se fait maintenant dans le service

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
      localStorage.setItem('navbarState', JSON.stringify(true));
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
      if (targetId === 'skills') {
        const y = element.getBoundingClientRect().top + window.scrollY - 150;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } else {
        // Scroll normal pour les autres sections
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
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

  // Toutes les anciennes méthodes individuelles ont été remplacées par les méthodes unifiées
  // onLightIntensityChange et onLightColorChange
  
  toggleLightControls(event?: Event) {
    // Prevent event bubbling to avoid triggering navbar toggle
    if (event) {
      event.stopPropagation();
    }
    
    this.isLightControlsOpen = !this.isLightControlsOpen;
    if (this.isLightControlsOpen) {
      this.updateLightsList();
      this.navbarEffects.setNavbarState(false);  // Expand navbar
      localStorage.setItem('navbarState', JSON.stringify(false));
    } else {
      this.navbarEffects.setNavbarState(true);   // Shrink navbar
      localStorage.setItem('navbarState', JSON.stringify(true));
    }
  }
  updateLightsList() {
    this.lights = this.threeService.getAllLights();
    
    // Plus besoin de mettre à jour les valeurs initiales car elles sont gérées par le service
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
   * @param tab Onglet à activer ('navbar')
   */
  setActiveTab(tab: 'navbar') {
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
    
    // Plus besoin de mettre à jour les valeurs locales car tout est géré par le service
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
        return 'assets/img/brands/logo ambient.png'; // Utilise la même icône que AmbientLight
      case 'SpotLight':
        return 'assets/img/brands/logo spotlight-clear.png'; // Image pour spotlight
      case 'HemisphereLight':
        return 'assets/img/brands/logo sun.png';     // Image pour hemisphère
      case 'RectAreaLight':
        return 'assets/img/brands/logo site.png';    // Image générique pour autres lumières
      default:
        return 'assets/img/brands/logo site.png';    // Image par défaut
    }
  }

  /**
   * Retourne la valeur maximale pour une lumière selon son nom
   */
  getLightMaxValue(lightName: string): number {
    switch (lightName) {
      case 'Spotprincipal':
      case 'Spotrouge':
      case 'Lumière ponctuelle':
        return 10000;
      case 'SpotHD':
      case 'SpotBD':
        return 100000;
      case 'Lumière directionnelle':
        return 1.5;
      default:
        return 1; // Valeur par défaut pour les autres lumières
    }
  }

  /**
   * Retourne le pas d'incrémentation pour une lumière selon son nom
   */
  getLightStep(lightName: string): number {
    switch (lightName) {
      case 'Spotprincipal':
      case 'Spotrouge':
      case 'Lumière ponctuelle':
        return 10; // Pas de 10 pour les lumières jusqu'à 10000
      case 'SpotHD':
      case 'SpotBD':
        return 100; // Pas de 100 pour les lumières jusqu'à 100000
      case 'Lumière directionnelle':
      case 'Lumière ambiante':
      case 'Sun':
        return 0.05; // Pas fin pour les lumières avec des valeurs faibles
      default:
        return 0.1; // Valeur par défaut
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
    
    // Faire le toggle et obtenir le nouvel état
    this.navbarEffects.toggleNavbar();
    
    // Attendre que le toggle soit effectué pour sauvegarder le nouvel état
    setTimeout(() => {
      const newState = this.currentShrinkState;
      localStorage.setItem('navbarState', JSON.stringify(newState));
    }, 50);
    
    // Force la mise à jour de Three.js pour qu'elle s'adapte au nouvel état
    setTimeout(() => {
      this.threeService.onResize();
      // Réinitialiser les positions de la scène pour animations
      this.threeService.updateMousePosition(0, 0);
    }, 100);
  }
}
