import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ThreeService } from '../../services/three.service';

@Component({
  selector: 'app-background',
  standalone: true,
  template: `
    <canvas #threeBackgroundCanvas class="background-canvas"></canvas>
  `,
  styles: [`
    .background-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
    }
  `]
})
export class BackgroundComponent implements OnDestroy {
  @ViewChild('threeBackgroundCanvas') backgroundCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private threeService: ThreeService) {}

  ngAfterViewInit() {
    this.threeService.initBackground(this.backgroundCanvas.nativeElement);
    this.threeService.animate();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.threeService.dispose();
  }

  private onResize() {
    this.threeService.onResize();
  }
}
