import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { BackgroundComponent } from './components/background/background.component';
import { IntroComponent } from './components/intro/intro.component';
import { AboutComponent } from './components/about/about.component';
import { SkillsComponent } from './components/skills/skills.component';
import { ContactFormComponent } from './components/contact-form/contact-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    BackgroundComponent,
    IntroComponent,
    AboutComponent,
    SkillsComponent,
    ContactFormComponent
  ],
  template: `
    <app-background></app-background>
    <app-navbar></app-navbar>
    <main>
      <app-intro></app-intro>
      <app-about></app-about>
      <app-skills></app-skills>
      <app-contact-form></app-contact-form>

      <footer class="p-4 text-center">
        <div class="d-flex justify-content-center gap-4">
          <a href="https://linkedin.com/in/..." target="_blank" class="text-light">
            <i class="fa fa-linkedin fa-2x"></i>
          </a>
          <a href="https://github.com/..." target="_blank" class="text-light">
            <i class="fa fa-github fa-2x"></i>
          </a>
        </div>
      </footer>
    </main>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Portfolio Lucas Bonneau';
}
