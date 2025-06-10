import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ThreeService } from '../../services/three.service';

@Component({
  selector: 'app-background',
  standalone: true,
  templateUrl: './background.component.html',
  styleUrls: ['./background.component.css']
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
    // Pas besoin de libérer toutes les ressources, juste celles de background
    // car d'autres composants pourraient utiliser la navbar
  }

  private onResize() {
    this.threeService.onResize();
  }
}
