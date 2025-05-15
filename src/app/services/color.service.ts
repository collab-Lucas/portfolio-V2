import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ColorOption {
  name: string;
  hex: string;
}

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  private colorOptions: ColorOption[] = [
    { name: 'Bleu clair', hex: '#66ccff' },
    { name: 'Rouge', hex: '#ff6666' },
    { name: 'Vert', hex: '#66ff66' },
    { name: 'Jaune', hex: '#ffcc00' },
    { name: 'Violet', hex: '#cc66ff' },
    { name: 'Cyan', hex: '#00ffff' },
    { name: 'Orange', hex: '#ff9966' },
    { name: 'Rose', hex: '#ff66cc' },
    { name: 'Vert lime', hex: '#99ff66' },
    { name: 'Bleu', hex: '#6666ff' },
    { name: 'Saumon', hex: '#ff6699' },
    { name: 'Turquoise', hex: '#66ffcc' }
  ];

  private showPalette = new BehaviorSubject<boolean>(false);

  getColorOptions(): ColorOption[] {
    return this.colorOptions;
  }

  isPaletteVisible() {
    return this.showPalette.asObservable();
  }

  togglePalette() {
    this.showPalette.next(!this.showPalette.value);
  }

  hidePalette() {
    this.showPalette.next(false);
  }

  getContrastColor(hexcolor: string): string {
    // Convert hex to RGB
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    
    // Calculate luminance using relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark colors, black for light colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
