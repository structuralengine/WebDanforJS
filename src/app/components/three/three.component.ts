import { Component, ElementRef, Input, NgZone, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene.service';
import { ThreeNodeService } from './geometry/three-node.service';
import { ThreeTshapeService } from './geometry/three-tshape.service';
import { ThreeOvalService } from './geometry/three-oval.service';
import { ThreeCircleService } from './geometry/three-circle.service';
@Component({
  selector: 'app-three',
  templateUrl: './three.component.html',
  styleUrls: ['./three.component.scss']
})
export class ThreeComponent implements OnInit {
  @Input('typeView') typeView: number;
  @ViewChild("myCanvas", { static: true }) private canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  constructor(
    public scene: SceneService,
    private node: ThreeNodeService,
    private threeTRShape: ThreeTshapeService,
    private threeOVal: ThreeOvalService,
    private threeCircle: ThreeCircleService,
  ) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);
    this.node.nodeList = new THREE.Object3D();
    this.node.nodeList = new THREE.Object3D();
    this.scene.add(this.node.nodeList);

  }

  ngOnInit() {
    this.node.onInit();
  }
  ngAfterViewInit(): void {
    if (this.typeView !== 0) {
      this.scene.OnInit(
        this.getAspectRatio(),
        this.canvas,
        devicePixelRatio,
        615, 
        615
      );
    } 
    const element = this.scene.labelRendererDomElement();
    const div = document.getElementById("myCanvas"); // ボタンを置きたい場所の手前の要素を取得
    div.parentNode.insertBefore(element, div.nextSibling);
  }
  private getAspectRatio(): number {
    if (this.canvas.clientHeight === 0) {
      return 0;
    }
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }
}
