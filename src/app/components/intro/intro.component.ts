import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="intro-section text-center text-light p-5">
      <h1>Développeur Full Stack & 3D</h1>
      <p class="lead mt-3">Recherche d'emploi / alternance Bac +5</p>
    </section>
  `,
  styles: [`
    .intro-section {
      padding-top: 120px;
      margin_top: 120px;
    }
  `]
})
export class IntroComponent {}
