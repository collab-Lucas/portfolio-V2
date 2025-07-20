import { Component, OnInit, OnDestroy, ElementRef, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  template: `
    <div [class]="getSkeletonClasses()" [style]="getSkeletonStyles()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SkeletonLoaderComponent implements OnInit, OnDestroy {
  @Input() type: 'text' | 'avatar' | 'button' | 'card' | 'image' | 'custom' = 'text';
  @Input() width?: string;
  @Input() height?: string;
  @Input() lines = 3;
  @Input() animated = true;
  @Input() className?: string;

  private intersectionObserver?: IntersectionObserver;
  private isVisible = false;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    if (this.animated) {
      this.setupIntersectionObserver();
    }
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.isVisible = entry.isIntersecting;
          if (!this.isVisible && this.animated) {
            // Pause animation when not visible for performance
            entry.target.classList.add('animation-paused');
          } else {
            entry.target.classList.remove('animation-paused');
          }
        });
      },
      { threshold: 0.1 }
    );

    this.intersectionObserver.observe(this.elementRef.nativeElement);
  }

  getSkeletonClasses(): string {
    const baseClasses = ['skeleton'];
    
    if (this.type !== 'custom') {
      baseClasses.push(`skeleton-${this.type}`);
    }
    
    if (this.className) {
      baseClasses.push(this.className);
    }

    if (!this.animated) {
      baseClasses.push('skeleton-no-animation');
    }

    return baseClasses.join(' ');
  }

  getSkeletonStyles(): any {
    const styles: any = {};

    if (this.width) {
      styles.width = this.width;
    }

    if (this.height) {
      styles.height = this.height;
    }

    // For text type, create multiple lines
    if (this.type === 'text' && this.lines > 1) {
      styles.display = 'flex';
      styles.flexDirection = 'column';
      styles.gap = '0.5rem';
    }

    return styles;
  }
}
