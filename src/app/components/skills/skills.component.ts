import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Skill {
  name: string;
  type: 'tech' | 'tool';
  icon?: string;
}

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="skills" class="p-5 text-center">
      <h2 class="mb-4">Compétences</h2>
      
      <!-- Technologies -->
      <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">
        <span *ngFor="let skill of techSkills" 
              class="badge bg-info text-dark">
          <i *ngIf="skill.icon" [class]="'fa ' + skill.icon + ' me-2'"></i>
          {{skill.name}}
        </span>
      </div>

      <!-- Outils -->
      <h3 class="mt-5 mb-4">Outils</h3>
      <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">
        <span *ngFor="let tool of tools" 
              class="badge bg-light text-dark">
          <i *ngIf="tool.icon" [class]="'fa ' + tool.icon + ' me-2'"></i>
          {{tool.name}}
        </span>
      </div>
    </section>
  `,
  styles: [`
    .badge {
      font-size: 1rem;
      padding: 0.5rem 1rem;
    }
  `]
})
export class SkillsComponent {
  techSkills: Skill[] = [
    { name: 'Angular', type: 'tech' },
    { name: 'Three.js', type: 'tech' },
    { name: 'Python', type: 'tech' },
    { name: 'Spring Boot', type: 'tech' },
    { name: 'MongoDB', type: 'tech' },
    { name: 'Bootstrap', type: 'tech' }
  ];

  tools: Skill[] = [
    { name: 'VS Code', type: 'tool', icon: 'fa-code' },
    { name: 'Git', type: 'tool', icon: 'fa-git' },
    { name: 'Blender', type: 'tool', icon: 'fa-cube' }
  ];
}
