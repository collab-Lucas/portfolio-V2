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
      </section>      <footer class="footer-bar">
        <div class="icon-container">
            <a href="https://linkedin.com/in/..." target="_blank" class="icon-link">
                <img src="assets/img/brands/icone_linkedin.svg" alt="LinkedIn" class="footer-icon">
            </a>
            <a href="https://github.com/..." target="_blank" class="icon-link">
                <img src="assets/img/brands/icone_github.svg" alt="GitHub" class="footer-icon">
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
