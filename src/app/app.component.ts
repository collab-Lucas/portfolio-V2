import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { BackgroundComponent } from './components/background/background.component';
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
    AboutComponent,
    SkillsComponent,
    ContactFormComponent
  ],  template: `
    <app-background></app-background>
    <app-navbar></app-navbar>
    <main>
      <section id="about">
        <app-about></app-about>
      </section>
      <section id="skills">
        <app-skills></app-skills>
      </section>
      <section id="contact">
        <app-contact-form></app-contact-form>
      </section>

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
