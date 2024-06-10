import { Component, ElementRef, Input, NgZone, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene.service';
import { ThreeNodeService } from './geometry/three-node.service';
import { ThreeNodeGuideService } from './geometry/three-node-guide.service';
@Component({
  selector: 'app-three',
  templateUrl: './three.component.html',
  styleUrls: ['./three.component.scss']
})
export class ThreeComponent implements OnInit {
  @Input('typeView') typeView: string;
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
      case "T shape": {
        this.node.createDemoTShape();
        break;
      }
      case "Rectangle": {
        this.node.createDemoRectangle();
        break;
      }
    }   
    this.node.onInit();
  }
  ngAfterViewInit(): void {
    if (this.typeView !== 'preview') {
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
  // private getAspectRatioRebar(): number {
  //   if (this.canvasRebar.clientHeight === 0) {
  //     return 0;
  //   }
  //   return this.canvasRebar.clientWidth / this.canvasRebar.clientHeight;
  // }
  // createDrawingLine() {       
  //   let jsonData: any = this.node.changeData() as [];

  //   const material = new THREE.LineBasicMaterial({ color: 0x000000 });
  //   const points = [];

  //   const arrPanel = [
  //     [1, 2, 7, 8],
  //     [3, 4, 5, 6]
  //   ]
  //   arrPanel.forEach(item => {
  //     const vertexlist = [];
  //     item.forEach(i => {
  //       const n = jsonData[i-1]
  //       const x = n.x;
  //       const y = n.y;
  //       const z = n.z;
  //       vertexlist.push([x, -y, z])
  //     })
  //     this.createPanel(vertexlist, arrPanel.indexOf(item));
  //   })
  //   let dem = 0;
  //   jsonData.forEach(x => {
  //     dem ++;
  //     if(dem <= 8){
  //       points.push(new THREE.Vector3(x['x'], -x['y'], x['z']));        
  //     }       
  //   })  
  //   let x = jsonData[0];
  //   points.push(new THREE.Vector3(x['x'], -x['y'], x['z']));
  //   const line = new THREE.Line(
  //     new THREE.BufferGeometry().setFromPoints(points),
  //     material
  //   );   
  //   this.scene.add(line);  
  //   for(let i=8; i < jsonData.length;i++){    
  //     try{
  //       const mesh = new THREE.Mesh(this.geometry,
  //         new THREE.MeshBasicMaterial({ color: 0x000000 }));
  //       mesh.name = 'node' + i;
  //       mesh.position.x = jsonData[i]['x'];
  //       mesh.position.y = -jsonData[i]['y'];
  //       mesh.position.z = jsonData[i]['z'];
  //       this.nodeList.children.push(mesh);
  //     }catch{
  //       console.log(jsonData)
  //     }

  //   }  

  //   const jsonSide = this.node.changeDataSide() as [];
  //   for(let i=0; i< jsonSide.length;i++){    

  //     const mesh1 = new THREE.Mesh(this.geometry,
  //       new THREE.MeshBasicMaterial({ color: 0xfafafa }));
  //     mesh1.name = 'nodeSide' + i;
  //     mesh1.position.x = jsonSide[i]['x'];
  //     mesh1.position.y = -jsonSide[i]['y'];
  //     mesh1.position.z = jsonSide[i]['z'];
  //     this.nodeList.children.push(mesh1);
  //   }  
  //   this.scene.render() 
  // }
  // createDrawingLineRebar(){
  //   let jsonData: any = this.nodeGuide.changeData() as [];
  //   const material = new THREE.LineBasicMaterial({ color: 0x000000 });
  //   const points = [];

  //   const arrPanel = [
  //     [1, 2, 3, 4],
  //   ]
  //   arrPanel.forEach(item => {
  //     const vertexlist = [];
  //     item.forEach(i => {
  //       const n = jsonData[i-1]
  //       const x = n.x;
  //       const y = n.y;
  //       const z = n.z;
  //       vertexlist.push([x, -y, z])
  //     })
  //     this.createPanelRebar(vertexlist, arrPanel.indexOf(item));
  //   })
  //   let dem = 0;
  //   jsonData.forEach(x => {
  //     dem ++;
  //     if(dem <= 4){
  //       points.push(new THREE.Vector3(x['x'], -x['y'], x['z']));        
  //     }       
  //   })  
  //   let x = jsonData[0];
  //   points.push(new THREE.Vector3(x['x'], -x['y'], x['z']));
  //   const line = new THREE.Line(
  //     new THREE.BufferGeometry().setFromPoints(points),
  //     material
  //   );   
  //   this.scene.addRebar(line);       
  //   for(let i=4; i< jsonData.length;i++){    

  //     try{
  //       const mesh = new THREE.Mesh(this.geometryRebar,
  //         new THREE.MeshBasicMaterial({ color: 0x000000 }));
  //       mesh.name = 'node' + i;
  //       mesh.position.x = jsonData[i]['x'];
  //       mesh.position.y = -jsonData[i]['y'];
  //       mesh.position.z = jsonData[i]['z'];
  //       this.nodeListRebar.children.push(mesh);
  //     }catch{
  //       console.log(jsonData)
  //     }
  //   }  
  //   const jsonSide = this.nodeGuide.changeDataSide() as [];
  //   for(let i=0; i< jsonSide.length;i++){    

  //     const mesh1 = new THREE.Mesh(this.geometryRebar,
  //       new THREE.MeshBasicMaterial({ color: 0xfafafa }));
  //     mesh1.name = 'nodeSide' + i;
  //     mesh1.position.x = jsonSide[i]['x'];
  //     mesh1.position.y = -jsonSide[i]['y'];
  //     mesh1.position.z = jsonSide[i]['z'];
  //     this.nodeListRebar.children.push(mesh1);
  //   }  
  //   this.scene.renderRebar()
  // }
  // private createPanel(vertexlist, row): void {

  //   const points = []
  //   const geometrys: THREE.BufferGeometry[] = [];
  //   for(const p of vertexlist){
  //     points.push(new THREE.Vector3(p[0], p[1], p[2]))
  //   }
  //   // 三角形を作る
  //   geometrys.push(new THREE.BufferGeometry().setFromPoints([points[0],points[1],points[2]]));
  //   // 四角形が作れる場合
  //   if(points.length > 3)
  //     geometrys.push(new THREE.BufferGeometry().setFromPoints([points[3],points[0],points[2]]));

  //   const material = new THREE.MeshBasicMaterial({
  //     transparent: true,
  //     side: THREE.DoubleSide,
  //     color: 0x7f8F9F,
  //     opacity: 0.7,
  //   });

  //   for(const g of geometrys) {
  //     const mesh = new THREE.Mesh(g, material);
  //     mesh.name = 'panel-' + row.toString();      
  //     this.scene.add(mesh);
  //   }
  // }
  // private createPanelRebar(vertexlist, row): void {

  //   const points = []
  //   const geometrys: THREE.BufferGeometry[] = [];
  //   for(const p of vertexlist){
  //     points.push(new THREE.Vector3(p[0], p[1], p[2]))
  //   }
  //   // 三角形を作る
  //   geometrys.push(new THREE.BufferGeometry().setFromPoints([points[0],points[1],points[2]]));
  //   // 四角形が作れる場合
  //   if(points.length > 3)
  //     geometrys.push(new THREE.BufferGeometry().setFromPoints([points[3],points[0],points[2]]));

  //   const material = new THREE.MeshBasicMaterial({
  //     transparent: true,
  //     side: THREE.DoubleSide,
  //     color: 0x7f8F9F,
  //     opacity: 0.7,
  //   });

  //   for(const g of geometrys) {
  //     const mesh = new THREE.Mesh(g, material);
  //     mesh.name = 'panel-' + row.toString();      
  //     this.scene.addRebar(mesh);
  //   }
  // }
}
