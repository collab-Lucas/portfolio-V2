import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface WorkerMessage {
  type: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ShaderWorkerService {
  private worker?: Worker;
  private uniformsSubject = new BehaviorSubject<any>(null);
  private geometrySubject = new BehaviorSubject<any>(null);
  private meshSubject = new BehaviorSubject<any>(null);

  public uniforms$ = this.uniformsSubject.asObservable();
  public geometry$ = this.geometrySubject.asObservable();
  public mesh$ = this.meshSubject.asObservable();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/three-shader.worker', import.meta.url));
      
      this.worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
        switch (data.type) {
          case 'UNIFORMS_CALCULATED':
            this.uniformsSubject.next(data['uniforms']);
            break;
          case 'GEOMETRY_UPDATED':
            this.geometrySubject.next(data['vertices']);
            break;
          case 'MESH_OPTIMIZED':
            this.meshSubject.next({ vertices: data['vertices'], indices: data['indices'] });
            break;
        }
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
      };
    } else {
      console.warn('Web Workers not supported in this environment');
    }
  }

  public calculateUniforms(resolution: [number, number], mouse: [number, number], noiseParams: any) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'CALCULATE_UNIFORMS',
        payload: { resolution, mouse, noiseParams }
      });
    }
  }

  public updateGeometry(width: number, height: number, segments: number) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'UPDATE_GEOMETRY',
        payload: { width, height, segments }
      });
    }
  }

  public optimizeMesh(vertices: number[], indices: number[], maxDistance: number) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'OPTIMIZE_MESH',
        payload: { vertices, indices, maxDistance }
      });
    }
  }

  public destroy() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.uniformsSubject.complete();
    this.geometrySubject.complete();
    this.meshSubject.complete();
  }
}
