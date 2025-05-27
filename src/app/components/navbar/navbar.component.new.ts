import { Component, ElementRef, OnInit, OnDestroy, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarThreeService } from '../../services/navbar-three.service';
import { NavbarLight } from '../../services/navbar-three.service';
import { ColorService } from '../../services/color.service';
import { NavbarEffectsService } from '../../services/navbar-effects.service';
import { Observable, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('threeNavbarCanvas') navbarCanvas!: ElementRef<HTMLCanvasElement>;
  isLightControlsOpen = false;
  currentColor$: Observable<string>;
  lights: NavbarLight[] = [];
  private subscriptions: Subscription[] = [];
  
  // Propriétés pour la compatibilité avec l'ancien code
  ambientLightIntensity = 0.4;
  directionalLightIntensity = 0.05;
  pointLightIntensity = 0.3;
  backgroundLightIntensity = 0.5;

  ambientLightColor = '#ffffff';
  directionalLightColor = '#ffffff';
  pointLightColor = '#ffffff';
  backgroundLightColor = '#ffffff';

  colorOptions: any[];
  cvAvailable = false;
  isShrunk$: Observable<boolean>;
  private mouseX = 0;
  private mouseY = 0;

  showLightSettings: boolean = false;
  activeTab: 'navbar' | 'background' = 'navbar';
  
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
    private navbarThreeService: NavbarThreeService,
    private colorService: ColorService,
    private navbarEffects: NavbarEffectsService
  ) {
    this.currentColor$ = this.navbarThreeService.getCurrentColor();
    this.colorOptions = this.colorService.getColorOptions();
    this.isShrunk$ = this.navbarEffects.isShrunk$;
      fetch('assets/CV Bonneau Lucas.pdf')
      .then(response => {
        console.log('Vérification CV - Statut:', response.status, 'OK:', response.ok);
        this.cvAvailable = response.ok;
      })
      .catch((error) => {
        console.error('Erreur lors de la vérification du CV:', error);
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
    this.navbarThreeService.initNavbar(this.navbarCanvas.nativeElement);
    // Appeler onResize une fois au démarrage pour gérer la largeur initiale
    this.navbarThreeService.onResize();
    
    // Charger la liste initiale des lumières
    this.updateLightsList();
  }
  
  ngOnDestroy() {
    // Nettoyage des ressources Three.js
    this.navbarThreeService.dispose();
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private handleMouseMove(event: MouseEvent) {
    // Calculer la position relative de la souris (-1 à 1)
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Mettre à jour la rotation du modèle
    this.navbarThreeService.updateMousePosition(this.mouseX, this.mouseY);
  }

  changeColor(event: Event) {
    const input = event.target as HTMLInputElement;
    this.navbarThreeService.setCurrentColor(input.value);
  }
  
  downloadCV() {
    console.log('Tentative de téléchargement du CV, disponibilité:', this.cvAvailable);
    
    // Créer un élément a invisible et simuler un clic pour forcer le téléchargement
    const link = document.createElement('a');
    link.href = 'assets/CV Bonneau Lucas.pdf';
    link.download = 'CV Bonneau Lucas.pdf';
    link.target = '_blank';
    
    // Ajouter à la page, cliquer, puis supprimer
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  toggleLightControls(event: Event) {
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
    // S'abonner aux lumières du NavbarThreeService
    this.subscriptions.push(
      this.navbarThreeService.getLights().subscribe(lights => {
        this.lights = lights;
        
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
      })
    );
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
  }
  
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const panel = document.querySelector('.light-settings-panel');
    const toggleButton = document.querySelector('.btn-icon img.logo-settings');

    // Only close panel if clicking outside panel and not on the toggle button
    if (panel && !panel.contains(target) && 
        toggleButton && !toggleButton.contains(target) && 
        !target.closest('.btn-icon')) {
      this.isLightControlsOpen = false;
    }
  }

  toggleNavbar(event: Event): void {
    // Don't toggle if click is on settings button or light panel
    if (event.target instanceof Element) {
      const target = event.target as Element;
      if (target.closest('.light-settings-panel') || 
          target.closest('.btn-icon') || 
          target.closest('.navbar-brand-section')) {
        return;
      }
    }
    this.navbarEffects.toggleNavbar();
  }

  stopNavLinkPropagation(event: Event): void {
    // Empêche la propagation de l'événement vers la navbar
    event.stopPropagation();
  }

  navigateTo(sectionId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Navigation vers la section:', sectionId);
    
    // Si la navbar est déployée, la réduire
    let isShrunk = false;
    const subscription = this.navbarEffects.isShrunk$.subscribe(shrunk => {
      isShrunk = shrunk;
    });
    subscription.unsubscribe();
    
    if (!isShrunk) {
      this.navbarEffects.setNavbarState(true); // Réduire la navbar
    }
    
    // Après un court délai pour permettre l'animation de réduction de s'effectuer
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      console.log('Élément trouvé:', element);
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        console.log(`Élément avec l'ID "${sectionId}" non trouvé dans le DOM, tentative de défilement par sélecteur`);
        // Alternative: essayer de sélectionner le composant directement
        const componentElement = document.querySelector(`app-${sectionId}`);
        if (componentElement) {
          console.log('Composant trouvé par sélecteur:', componentElement);
          componentElement.scrollIntoView({ behavior: 'smooth' });
        } else {
          console.error(`Ni l'ID "${sectionId}" ni le composant "app-${sectionId}" n'ont été trouvés`);
        }
      }
    }, 300);
  }
}
