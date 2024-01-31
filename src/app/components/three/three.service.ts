import { Injectable } from '@angular/core';
import { SceneService } from './scene.service';

@Injectable({
  providedIn: 'root'
})
export class ThreeService {
  public mode: string;
  private currentIndex: number;
  public canvasElement: HTMLCanvasElement;

  public selectedNumber: number;

  public canvasWidth: string;
  public canvasHeight: string;

  public fileName: string;
  constructor(
    public scene: SceneService,
  ) { }
  public OnInit(): void {
    // this.node.OnInit();
    // this.member.OnInit();
  }
  

}
