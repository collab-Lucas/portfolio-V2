import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavbarEffectsService implements OnDestroy {
  private isShrunkSubject = new BehaviorSubject<boolean>(false); // Start expanded
  isShrunk$ = this.isShrunkSubject.asObservable();

  constructor() {
    // Force expanded state initially to match visual appearance
    this.isShrunkSubject.next(false);
  }
  
  /**
   * Get current shrunk state
   */
  get currentShrunkState(): boolean {
    return this.isShrunkSubject.value;
  }
  
  /**
   * Shrink the navbar
   */
  shrinkNavbar(): void {
    this.isShrunkSubject.next(true);
  }
  
  /**
   * Expand the navbar
   */
  expandNavbar(): void {
    this.isShrunkSubject.next(false);
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
