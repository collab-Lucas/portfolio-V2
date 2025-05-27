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
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.css']
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
