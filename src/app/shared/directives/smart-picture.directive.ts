import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appSmartPicture]',
  standalone: true
})
export class SmartPictureDirective implements OnInit, OnDestroy {
  @Input() src!: string;
  @Input() alt!: string;
  @Input() lazy = true;
  @Input() quality = 80;

  private observer?: IntersectionObserver;
  private isLoaded = false;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (this.lazy) {
      this.setupLazyLoading();
    } else {
      this.loadImage();
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupLazyLoading(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isLoaded) {
            this.loadImage();
            this.observer?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  private loadImage(): void {
    if (this.isLoaded) return;

    const pictureElement = this.createPictureElement();
    
    // Ajouter une classe de chargement
    this.el.nativeElement.classList.add('loading');
    
    // Remplacer le contenu
    this.el.nativeElement.innerHTML = '';
    this.el.nativeElement.appendChild(pictureElement);
    
    // Écouter le chargement
    const img = pictureElement.querySelector('img');
    if (img) {
      img.onload = () => {
        this.el.nativeElement.classList.remove('loading');
        this.el.nativeElement.classList.add('loaded');
        this.isLoaded = true;
      };
      
      img.onerror = () => {
        console.error('Failed to load image:', this.src);
        this.el.nativeElement.classList.remove('loading');
        this.el.nativeElement.classList.add('error');
      };
    }
  }

  private createPictureElement(): HTMLPictureElement {
    const picture = document.createElement('picture');
    
    // Support AVIF pour les navigateurs compatibles
    if (this.supportsFormat('avif')) {
      const avifSource = document.createElement('source');
      avifSource.srcset = this.getOptimizedUrl('avif');
      avifSource.type = 'image/avif';
      picture.appendChild(avifSource);
    }
    
    // Support WebP pour les navigateurs compatibles
    if (this.supportsFormat('webp')) {
      const webpSource = document.createElement('source');
      webpSource.srcset = this.getOptimizedUrl('webp');
      webpSource.type = 'image/webp';
      picture.appendChild(webpSource);
    }
    
    // Image par défaut
    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt;
    img.loading = this.lazy ? 'lazy' : 'eager';
    img.style.width = '100%';
    img.style.height = 'auto';
    
    picture.appendChild(img);
    
    return picture;
  }

  private getOptimizedUrl(format: 'webp' | 'avif'): string {
    // Remplacer l'extension par le format optimisé
    const baseName = this.src.replace(/\.[^/.]+$/, '');
    return `${baseName}.${format}`;
  }

  private supportsFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
    } catch {
      return false;
    }
  }
}
