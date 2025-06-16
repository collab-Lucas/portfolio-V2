import { Injectable } from '@angular/core';
import { Subject, fromEvent } from 'rxjs';
import { throttleTime, map } from 'rxjs/operators';

/**
 * Service réutilisable pour gérer les événements de redimensionnement de fenêtre
 */
@Injectable({
  providedIn: 'root'
})
export class ResizeService {
  private resizeSubject = new Subject<{ width: number, height: number }>();
  resize$ = this.resizeSubject.asObservable();
  
  constructor() {
    fromEvent(window, 'resize')
      .pipe(
        throttleTime(100),
        map(() => ({ width: window.innerWidth, height: window.innerHeight }))
      )
      .subscribe(dimensions => this.resizeSubject.next(dimensions));
  }
}
