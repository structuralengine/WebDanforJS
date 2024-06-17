import { Component, ElementRef, Input, NgZone, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene.service';
import { ThreeNodeService } from './geometry/three-node.service';
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
  // @ViewChild("myCanvasRebar", { static: true }) private canvasRef1: ElementRef;
  // private get canvasRebar(): HTMLCanvasElement {
  //   return this.canvasRef1.nativeElement;
  // }
  // private geometry: THREE.SphereBufferGeometry;
  // private geometryRebar: THREE.SphereBufferGeometry;
  // private nodeList: THREE.Object3D;
  // private nodeListRebar: THREE.Object3D;
  constructor(
    public scene: SceneService,
    private node: ThreeNodeService
  ) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);
    // this.node.geometry = new THREE.SphereBufferGeometry(0.5);
    // this.node.geometry1 = new THREE.SphereBufferGeometry(1);
    // this.geometryRebar = new THREE.SphereBufferGeometry(1);
    this.node.nodeList = new THREE.Object3D();
    // this.nodeListRebar = new THREE.Object3D();

    this.scene.add(this.node.nodeList);
    // this.scene.addRebar(this.nodeListRebar);
  }

  ngOnInit() {
    switch(this.typeView){
      case 1: {
        this.node.createDemoRectangle();
        break;
      }
      case 2: {
        this.node.createDemoTShape();
        break;
      }
      // case 3: {
      //   this.node.createDemoCircleRing();
      //   break;
      // }
      // case 4: {
      //   this.node.createDemoCircleRing();
      //   break;
      // }
      case 4: {
        this.node.createDemoOval();
        break;
      }
      // case 6: {
      //   this.node.createDemoOval();
      //   break;
      // }
    }   
    this.node.onInit();
  }
  ngAfterViewInit(): void {
    if (this.typeView !== 0) {
      this.scene.OnInit(
        this.getAspectRatio(),
        this.canvas,
        devicePixelRatio,
        600, 
        600
      );
    } else {
      // this.scene.OnInitRebar(
      //   this.getAspectRatioRebar(),
      //   this.canvasRebar,
      //   devicePixelRatio,
      //   350,
      //   350
      // );
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
