import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ContactForm {
  name: string;
  email: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  submitForm(form: ContactForm): Observable<boolean> {
    // TODO: Implement actual form submission logic
    // For now, just simulate a successful submission
    console.log('Form submitted:', form);
    return of(true);
  }

  constructor() { }
}
