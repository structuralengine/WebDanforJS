import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { ThreeService } from './three.service';
import { SceneService } from './scene.service';
import { ThreeNodeService } from './geometry/three-node.service';
@Component({
  selector: 'app-three',
  templateUrl: './three.component.html',
  styleUrls: ['./three.component.scss']
})
export class ThreeComponent implements OnInit {
  @ViewChild("myCanvas", { static: true }) private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  constructor(
    public scene: SceneService,
    private three: ThreeService,
    private node: ThreeNodeService
  ) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);
  }

  ngOnInit() {
    this.createDrawingLine();   
  }
  ngAfterViewInit(): void {
    this.scene.OnInit(
      this.getAspectRatio(),
      this.canvas,
      devicePixelRatio,
      350,
      300
    );
    this.three.canvasWidth = String(350) + "px";
    this.three.canvasHeight = String(300) + "px";
    this.three.OnInit();
  }
  private getAspectRatio(): number {
    if (this.canvas.clientHeight === 0) {
      return 0;
    }
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }
  createDrawingLine() {       
    let jsonData: any = this.node.changeData() as [];
    const material = new THREE.LineBasicMaterial({ color: 0xdc3545 });
    const points = [];
    let dem = 0;
    jsonData.forEach(x => {
      dem ++;
      if(dem <= 8)
        points.push(new THREE.Vector3(-x['x'], -x['y'], -x['z']));
    })  
    let x = jsonData[0];
    points.push(new THREE.Vector3(-x['x'], -x['y'], -x['z']));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      material
    );   
    this.scene.add(line); 
    this.scene.render() 
  }
}
