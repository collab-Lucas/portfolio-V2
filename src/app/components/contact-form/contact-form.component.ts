import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService, ContactForm } from '../../services/contact.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section id="contact" class="p-5">
      <h2 class="text-center mb-4">Contact</h2>
      <form class="mx-auto" style="max-width: 600px;" (ngSubmit)="onSubmit()">
        <div class="mb-3">
          <input type="text" class="form-control" placeholder="Nom" 
                 [(ngModel)]="form.name" name="name" required>
        </div>
        <div class="mb-3">
          <input type="email" class="form-control" placeholder="Email" 
                 [(ngModel)]="form.email" name="email" required>
        </div>
        <div class="mb-3">
          <textarea class="form-control" placeholder="Message" rows="4" 
                    [(ngModel)]="form.message" name="message" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary w-100">
          <i class="fa fa-paper-plane me-2"></i>Envoyer
        </button>
      </form>
    </section>
  `,
  styles: [`
    .form-control {
      background-color: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    
    .form-control::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }
    
    .form-control:focus {
      background-color: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
      color: #fff;
      box-shadow: 0 0 0 0.25rem rgba(255, 255, 255, 0.1);
    }
  `]
})
export class ContactFormComponent {
  form: ContactForm = {
    name: '',
    email: '',
    message: ''
  };

  constructor(private contactService: ContactService) {}

  onSubmit() {
    this.contactService.submitForm(this.form).subscribe(
      success => {
        if (success) {
          alert('Message envoyé avec succès!');
          this.form = {
            name: '',
            email: '',
            message: ''
          };
        } else {
          alert('Une erreur est survenue. Veuillez réessayer.');
        }
      }
    );
  }
}
