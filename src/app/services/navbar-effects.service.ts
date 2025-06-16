import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavbarEffectsService implements OnDestroy {
  private navbarStateSubject = new BehaviorSubject<boolean>(false); // Start expanded
  isShrunk$ = this.navbarStateSubject.asObservable();

  constructor() {
    // Force expanded state initially to match visual appearance
    this.navbarStateSubject.next(false);
  }
  
  /**
   * Get current shrunk state
   */
  get currentShrunkState(): boolean {
    return this.navbarStateSubject.value;
  }
  
  /**
   * Toggle navbar between expanded and shrunk states
   */
  toggleNavbar(): void {
    this.navbarStateSubject.next(!this.navbarStateSubject.value);
  }

  /**
   * Set navbar to a specific state (true = shrunk, false = expanded)
   */
  setNavbarState(shrunk: boolean): void {
    this.navbarStateSubject.next(shrunk);
  }

  ngOnDestroy() {
    // Cleanup if needed in the future
  }
}
