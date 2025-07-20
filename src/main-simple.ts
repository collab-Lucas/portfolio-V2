// src/main-simple.ts - Version de secours
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { FormsModule } from '@angular/forms';

console.log('🚀 Starting simple bootstrap...');

// Bootstrap simple sans optimisations complexes
bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      BrowserAnimationsModule,
      BsDropdownModule.forRoot(),
      ButtonsModule.forRoot(),
      FormsModule
    ),
  ]
}).then(() => {
  console.log('✅ Simple bootstrap successful!');
}).catch(err => {
  console.error('❌ Simple bootstrap failed:', err);
});
