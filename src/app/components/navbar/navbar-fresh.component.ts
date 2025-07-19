import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { Observable, Subscription } from 'rxjs';

// Services
import { ThreeService } from '../../services/three.service';
import { ColorService, NavbarEffectsService } from '../../features/ui';
import { LightControlsComponent } from './light-controls.component';

// Types
import { SimpleLight } from '../../features/three/light.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LightControlsComponent],
  template: `
    <nav class="navbar navbar-expand-lg" 
         [class.large-navbar]="!(isShrunk$ | async)"
         [class.shrink-navbar]="isShrunk$ | async"
         (click)="toggleNavbar($event)"
         [@fadeInOut]>
      
      <div class="canvas-container">
        <canvas #threeNavbarCanvas class="navbar-canvas"></canvas>
      </div>

      <div class="container-fluid">
        <div class="navbar-brand-section">
          <a class="navbar-brand" href="#accueil" (click)="onNavLinkClick($event, 'accueil')">Lucas Bonneau</a>
        </div>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <a class="nav-link" href="#apropos" (click)="onNavLinkClick($event, 'apropos')">À propos</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#competences" (click)="onNavLinkClick($event, 'competences')">Compétences</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#contact" (click)="onNavLinkClick($event, 'contact')">Contact</a>
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
      </div>
    </nav>

    <!-- Light Controls Component -->
    <app-light-controls
      [lights]="lights"
      [showLightControls]="isLightControlsOpen"
      (lightChanged)="onLightControlChange($event)"
      (toggleControls)="toggleLightControls()"
      (resetLights)="resetLights()"
      (logLights)="logLights()">
    </app-light-controls>
  `,
  styleUrls: ['./navbar.component.css', './navbar-inline-extracted.css'],
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
export class NavbarComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('threeNavbarCanvas') navbarCanvas!: ElementRef<HTMLCanvasElement>;

  isLightControlsOpen = false;
  currentColor$: Observable<string>;
  lights: SimpleLight[] = [];
  private subscriptions: Subscription[] = [];

  colorOptions: any[];
  cvAvailable = false;
  isShrunk$: Observable<boolean>;
  private mouseX = 0;
  private mouseY = 0;
  private currentShrinkState = true;

  showLightSettings: boolean = false;
  activeTab: 'navbar' = 'navbar';

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
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    this.subscriptions.push(
      this.navbarEffects.isShrunk$.subscribe(isShrunk => {
        this.currentShrinkState = isShrunk;
        if (isShrunk && this.isLightControlsOpen) {
          this.isLightControlsOpen = false;
        }
      })
    );
    
    const savedState = localStorage.getItem('navbarState');
    if (savedState) {
      const savedShrinkState = JSON.parse(savedState);
      setTimeout(() => {
        this.navbarEffects.setNavbarState(savedShrinkState);
      }, 100);
    } else {
      setTimeout(() => {
        this.navbarEffects.setNavbarState(true);
      }, 100);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.navbarCanvas && this.navbarCanvas.nativeElement) {
        this.threeService.initNavbar(this.navbarCanvas.nativeElement);
        this.threeService.onResize();
        this.updateLightsList();
        
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

  ngOnDestroy() {
    this.threeService.dispose();
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private handleMouseMove(event: MouseEvent) {
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    this.threeService.updateMousePosition(this.mouseX, this.mouseY);
  }

  changeColor(event: Event) {
    const input = event.target as HTMLInputElement;
    this.threeService.setCurrentColor(input.value);
  }

  onNavLinkClick(event: Event, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    
    const wasExpanded = !this.currentShrinkState;
    
    if (wasExpanded) {
      this.navbarEffects.setNavbarState(true);
      localStorage.setItem('navbarState', JSON.stringify(true));
    }
    
    const delay = wasExpanded ? 300 : 0;
    setTimeout(() => {
      this.navigateToSection(targetId);
    }, delay);
  }

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
    if (event) {
      event.stopPropagation();
    }
    
    if (this.cvAvailable) {
      window.open('assets/CV_Bonneau_Lucas.pdf', '_blank');
    }
  }

  // Méthodes pour les contrôles de lumière
  onLightControlChange(event: any) {
    if (event.type === 'intensity') {
      this.threeService.setLightIntensity(event.lightName, event.value);
    } else if (event.type === 'color') {
      this.threeService.setLightColor(event.lightName, event.value);
    } else if (event.type === 'visibility') {
      this.threeService.setLightVisibility(event.lightName, event.value);
    }
  }

  toggleLightControls() {
    this.isLightControlsOpen = !this.isLightControlsOpen;
    if (this.isLightControlsOpen) {
      this.updateLightsList();
      this.navbarEffects.setNavbarState(false);
      localStorage.setItem('navbarState', JSON.stringify(false));
    } else {
      this.navbarEffects.setNavbarState(true);
      localStorage.setItem('navbarState', JSON.stringify(true));
    }
  }

  updateLightsList() {
    this.lights = this.threeService.getAllLights();
  }

  resetLights() {
    console.log('Reset lights requested');
    this.updateLightsList();
  }

  logLights() {
    console.log('Current lights:', this.lights);
  }

  get filteredLights() {
    return this.threeService.getLightsByScene(this.activeTab);
  }

  setActiveTab(tab: 'navbar') {
    this.activeTab = tab;
    this.threeService.setActiveTab(tab);
  }

  onLightIntensityChange(lightName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const intensity = parseFloat(input.value);
    this.threeService.setLightIntensity(lightName, intensity);
  }

  onLightColorChange(lightName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    this.threeService.setLightColor(lightName, color);
  }

  toggleLight(lightName: string) {
    const light = this.lights.find(l => l.name === lightName);
    if (light) {
      const newState = !light.enabled;
      this.threeService.setLightVisibility(lightName, newState);
      light.enabled = newState;
    }
  }

  getLightIcon(type: string): string {
    switch (type) {
      case 'AmbientLight':
        return 'assets/img/brands/logo ambient.png';
      case 'DirectionalLight':
        return 'assets/img/brands/logo direct.png';
      case 'PointLight':
        return 'assets/img/brands/logo ambient.png';
      case 'SpotLight':
        return 'assets/img/brands/logo spotlight-clear.png';
      case 'HemisphereLight':
        return 'assets/img/brands/logo sun.png';
      case 'RectAreaLight':
        return 'assets/img/brands/logo site.png';
      default:
        return 'assets/img/brands/logo site.png';
    }
  }

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
        return 1;
    }
  }

  getLightStep(lightName: string): number {
    switch (lightName) {
      case 'Spotprincipal':
      case 'Spotrouge':
      case 'Lumière ponctuelle':
        return 10;
      case 'SpotHD':
      case 'SpotBD':
        return 100;
      case 'Lumière directionnelle':
      case 'Lumière ambiante':
      case 'Sun':
        return 0.05;
      default:
        return 0.1;
    }
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const panel = document.querySelector('.light-settings-panel');
    const toggleButton = document.querySelector('.btn-icon img.logo-settings');

    if (panel && !panel.contains(target) && 
        toggleButton && !toggleButton.contains(target) && 
        !target.closest('.btn-icon')) {
      this.isLightControlsOpen = false;
    }
  }

  toggleNavbar(event: Event): void {
    const target = event.target as HTMLElement;
    
    const preventToggleSelectors = [
      '.light-settings-panel',
      '.btn-icon',
      '.navbar-brand-section',
      '.nav-link',
      '.btn-outline-light',
      '.navbar-nav',
      '.navbar-toggler'
    ];
    
    const shouldPreventToggle = preventToggleSelectors.some(selector => 
      target.closest(selector)
    );
    
    if (shouldPreventToggle) {
      return;
    }
    
    this.navbarEffects.toggleNavbar();
    
    setTimeout(() => {
      const newState = this.currentShrinkState;
      localStorage.setItem('navbarState', JSON.stringify(newState));
    }, 50);
    
    setTimeout(() => {
      this.threeService.onResize();
      this.threeService.updateMousePosition(0, 0);
    }, 100);
  }
}
