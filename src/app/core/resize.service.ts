import { Injectable, OnDestroy } from '@angular/core';
import { Subject, fromEvent, Subscription } from 'rxjs';
import { throttleTime, map } from 'rxjs/operators';

/**
 * Service réutilisable pour gérer les événements de redimensionnement de fenêtre
 */
@Injectable({
  providedIn: 'root'
})
export class ResizeService implements OnDestroy {
  private resizeSubject = new Subject<{ width: number, height: number }>();
  private resizeSubscription: Subscription;
  resize$ = this.resizeSubject.asObservable();
  
  constructor() {
    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(
        throttleTime(100),
        map(() => ({ width: window.innerWidth, height: window.innerHeight }))
      )
      .subscribe(dimensions => this.resizeSubject.next(dimensions));
  }

  ngOnDestroy(): void {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
    this.resizeSubject.complete();
  }
}
