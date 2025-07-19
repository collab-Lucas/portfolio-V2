import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit, OnDestroy {
  @Input() appLazyLoad!: string;
  @Input() fallbackSrc?: string;
  
  private observer?: IntersectionObserver;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnInit() {
    // Vérifier si IntersectionObserver est supporté
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadImage();
              this.observer?.unobserve(this.el.nativeElement);
            }
          });
        },
        {
          rootMargin: '50px' // Charger l'image 50px avant qu'elle soit visible
        }
      );
      
      this.observer.observe(this.el.nativeElement);
      
      // Placeholder pendant le chargement
      this.el.nativeElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+';
      this.el.nativeElement.style.backgroundColor = '#f0f0f0';
      this.el.nativeElement.style.transition = 'opacity 0.3s ease';
      
    } else {
      // Fallback pour les navigateurs anciens
      this.loadImage();
    }
  }

  private loadImage() {
    const img = new Image();
    img.onload = () => {
      this.el.nativeElement.src = this.appLazyLoad;
      this.el.nativeElement.style.opacity = '1';
    };
    img.onerror = () => {
      if (this.fallbackSrc) {
        this.el.nativeElement.src = this.fallbackSrc;
      }
    };
    img.src = this.appLazyLoad;
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
