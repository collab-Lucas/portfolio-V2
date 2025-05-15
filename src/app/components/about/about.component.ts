import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="about" class="d-flex flex-column flex-lg-row align-items-center p-5">
      <div id="about-3d" class="me-lg-5 mb-4 mb-lg-0"></div>
      <div class="card p-4 rounded">
        <h2>Salut, moi c'est Lucas !</h2>
        <p class="lead">
          Développeur passionné par le web, la data et la 3D, j'adore créer des expériences interactives et visuelles.
        </p>
        <p>
          Que ce soit en full stack, en analyse de données ou en intégration 3D avec Three.js, je suis toujours en train 
          d'explorer de nouvelles idées et technologies.
        </p>
      </div>
    </section>
  `,
  styles: [`
    .card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  `]
})
export class AboutComponent {}
