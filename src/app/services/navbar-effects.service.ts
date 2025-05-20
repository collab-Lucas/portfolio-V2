import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavbarEffectsService implements OnDestroy {
  private isShrunkSubject = new BehaviorSubject<boolean>(true); // Start collapsed
  isShrunk$ = this.isShrunkSubject.asObservable();

  constructor() {
    // Force shrunk state initially
    this.isShrunkSubject.next(true);
  }
  /**
   * Toggle navbar between expanded and shrunk states
   */
  toggleNavbar(): void {
    this.isShrunkSubject.next(!this.isShrunkSubject.value);
  }

  /**
   * Force the navbar to a specific state
   */
  setNavbarState(shrunk: boolean): void {
    this.isShrunkSubject.next(shrunk);
  }

  ngOnDestroy() {
    // Cleanup if needed in the future
  }
}
