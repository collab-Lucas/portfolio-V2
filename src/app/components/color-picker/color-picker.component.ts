import { Component, OnDestroy, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorService, ColorOption } from '../../services/color.service';
import { ThreeService, LightInfo } from '../../services/three.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.css'
})
export class ColorPickerComponent implements OnInit, OnDestroy, OnChanges {
  colorOptions: ColorOption[] = [];
  showPalette = false;
  selectedColor = '#66ccff'; // Default color
  lights: LightInfo[] = [];
  
  @Input() selectedLightName: string = '';
  @Input() initialColor: string = '';
  
  private paletteSubscription: Subscription | null = null;
  private lightsSubscription: Subscription | null = null;
  private colorSubscription: Subscription | null = null;

  constructor(
    private colorService: ColorService,
    private threeService: ThreeService
  ) {}

  ngOnInit(): void {
    // Get color options from service
    this.colorOptions = this.colorService.getColorOptions();
    
    // Subscribe to palette visibility changes
    this.paletteSubscription = this.colorService.isPaletteVisible().subscribe(
      visible => this.showPalette = visible
    );
    
    // Subscribe to light list changes
    this.lightsSubscription = this.threeService.getLights().subscribe(
      lights => this.lights = lights
    );
    
    // Subscribe to current color changes
    this.colorSubscription = this.threeService.getCurrentColor().subscribe(
      color => this.selectedColor = color
    );
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.paletteSubscription) this.paletteSubscription.unsubscribe();
    if (this.lightsSubscription) this.lightsSubscription.unsubscribe();
    if (this.colorSubscription) this.colorSubscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si nous recevons une initialColor, mettre à jour la selectedColor
    if (changes['initialColor'] && changes['initialColor'].currentValue) {
      this.selectedColor = changes['initialColor'].currentValue;
    }
  }

  togglePalette(): void {
    this.colorService.togglePalette();
  }

  selectColor(color: string): void {
    this.selectedColor = color;
    
    // Si nous avons une lumière spécifique sélectionnée, mettre à jour uniquement cette lumière
    if (this.selectedLightName) {
      this.threeService.updateLight(this.selectedLightName, { color });
    } else {
      // Sinon, mettre à jour toutes les lumières (comportement par défaut)
      this.threeService.setCurrentColor(color);
      this.updateAllLightsColor(color);
    }
    
    // Cacher la palette après la sélection
    this.colorService.hidePalette();
  }

  updateAllLightsColor(color: string): void {
    // Update all lights in both scenes
    this.lights.forEach(lightInfo => {
      this.threeService.updateLight(lightInfo.name, { color });
    });
  }

  getContrastColor(hexcolor: string): string {
    return this.colorService.getContrastColor(hexcolor);
  }
}
