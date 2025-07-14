import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { BackgroundThreeService } from '../../services/background-three.service';

@Component({
  selector: 'app-background',
  standalone: true,
  templateUrl: './background.component.html',
  styleUrls: ['./background.component.css']
})
export class BackgroundComponent implements OnDestroy {
  @ViewChild('threeBackgroundCanvas') backgroundCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private backgroundThreeService: BackgroundThreeService) {}

  ngAfterViewInit() {
    this.backgroundThreeService.init(this.backgroundCanvas.nativeElement);
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.backgroundThreeService.dispose();
  }

  private onResize() {
    this.backgroundThreeService.onResize();
  }
}
