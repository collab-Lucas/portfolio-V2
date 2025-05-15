import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NavbarEffectsService implements OnDestroy {
  private scrollSubscription: Subscription;
  private isShrunkSubject = new BehaviorSubject<boolean>(false);
  isShrunk$ = this.isShrunkSubject.asObservable();
  
  // Flag to track if fullscreen state is being forced
  private isForced = false;

  constructor() {
    this.scrollSubscription = fromEvent(window, 'scroll').pipe(
      map(() => window.scrollY > 50),
      distinctUntilChanged()
    ).subscribe(isShrunk => {
      // Only update based on scroll if not in forced mode
      if (!this.isForced) {
        this.isShrunkSubject.next(isShrunk);
      }
    });
  }

  /**
   * Force the navbar to be in fullscreen or normal mode regardless of scroll position
   * @param fullscreen If true, force fullscreen mode; if false, force normal mode
   */
  forceFullscreen(fullscreen: boolean): void {
    this.isForced = true;
    this.isShrunkSubject.next(!fullscreen);
  }

  /**
   * Reset to normal behavior where navbar state is controlled by scroll position
   */
  resetForceState(): void {
    this.isForced = false;
    this.isShrunkSubject.next(window.scrollY > 50);
  }

  ngOnDestroy() {
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }
  }
}
