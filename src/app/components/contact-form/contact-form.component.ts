import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService, ContactForm } from '../../services/contact.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css']
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
