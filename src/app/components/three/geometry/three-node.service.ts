import { Injectable } from '@angular/core';
import { InputMembersService } from '../../members/members.service';
import { SceneService } from '../scene.service';
import * as THREE from 'three';
import { CSS2DObject } from "../libs/CSS2DRenderer.js";
import { TranslateService } from '@ngx-translate/core';
@Injectable({
  providedIn: 'root'
})
export class ThreeNodeService {
  public dataNode: any[];
  public dataRebar: any;
  public memNo: number;
  public geometry: THREE.SphereBufferGeometry;
  public geometry1: THREE.SphereBufferGeometry;
  public geometry2: THREE.SphereBufferGeometry;
  public nodeList: THREE.Object3D;
  public jsonData: any
  public scale: any
  public type: any
  constructor(
    private memmber: InputMembersService,
    private scene: SceneService,
    private translate: TranslateService,
  ) {
    this.memNo = 0;
    this.dataNode = new Array();
    this.scale = 1;
  }
  public onInit(): void {
    this.scene.render();
  } 
  private getLength(iPos: any, jPos: any) {
    const xi: number = iPos['x'];
    const yi: number = iPos['y'];
    const zi: number = iPos['z'];
    const xj: number = jPos['x'];
    const yj: number = jPos['y'];
    const zj: number = jPos['z'];

    const result: number = Math.sqrt((xi - xj) ** 2 + (yi - yj) ** 2 + (zi - zj) ** 2);
    return result;
  }  
  public drawLineDim(ni: any, nj: any, style: number, title: any, vertical: boolean, lenDim: any, distanceDim: any, distance: any) {
    let x: any;
    let y: any;
    let px: any;
    let py: any;
    let xmin: any = ni.x;
    let ymin: any = ni.y;
    let check: boolean = false;
    let i = JSON.parse(JSON.stringify(ni));
    let j = JSON.parse(JSON.stringify(nj));
    if (vertical) {
      if (Math.abs(i.x) >= Math.abs(j.x)) {
        xmin = j.x
        j.x = i.x
      }
      else {
        xmin = i.x
        i.x = j.x
      }
      x = i.x;
      y = j.y >= i.y ? j.y : i.y
    } else {
      if (i.y > j.y) {
        ymin = j.y
        j.y = i.y
      }
      else {
        ymin = i.y
        i.y = j.y
      }
      x = i.x > j.x ? i.x : j.x;
      y = j.y
    }

    var length = this.getLength(i, j);
    if (vertical) {
      let pointHors = [];
      px = x >= 0 ? x + distance : x - distance;
      py = px >= 0 ? px + lenDim : px - lenDim;
      pointHors.push(new THREE.Vector3(px, y, 0));
      pointHors.push(new THREE.Vector3(py, y, 0));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pointHors),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      this.scene.add(line);

      let points = [];
      points.push(new THREE.Vector3(x != xmin ? xmin : px, y - length, 0));
      points.push(new THREE.Vector3(py, y - length, 0));
      const line2 = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      this.scene.add(line2);

    } else {
      let pointHors = [];
      px = y >= 0 ? y + distance : y - distance;
      py = px >= 0 ? px + lenDim : px - lenDim;     
      if(ni.x === x && ni.y === ymin && !check){
        check = true;
        pointHors.push(new THREE.Vector3(x, ni.y, 0));
      }else if(nj.x === x && nj.y == ymin && !check){
        check = true;
        pointHors.push(new THREE.Vector3(x, nj.y, 0));
      }else
        pointHors.push(new THREE.Vector3(x, px, 0));
      pointHors.push(new THREE.Vector3(x, py, 0));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pointHors),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      this.scene.add(line);

      let points = [];
      if(ni.x === x && ni.y === ymin && !check){
        points.push(new THREE.Vector3(x - length, ni.y, 0));
      }else if(nj.x === x && nj.y == ymin && !check){
        points.push(new THREE.Vector3(x - length, nj.y, 0));
      }else
        points.push(new THREE.Vector3(x - length, px, 0));
      //points.push(new THREE.Vector3(x - length, px, 0));
      points.push(new THREE.Vector3(x - length, py, 0));
      const line2 = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      this.scene.add(line2);
    }
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 12);

    // 要素をシーンに追加
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    mesh.name = "member" + 2;

    if (vertical) {      
      mesh.position.set(px + lenDim - distanceDim, y - length / 2, 0);
    } else {
      mesh.position.set(x - length / 2, (px + py) / 2 + distanceDim, 0);
      mesh.rotation.z = Math.acos(0);
      mesh.rotation.y = 0.5 * Math.PI + Math.atan2(length, 0);
    }
    const div = document.createElement("div");
    div.className = "label_theerjs";
    div.id = "labelId";
    div.textContent = `${title}`;
    switch (style) {
      case 0:
        div.style.marginTop = "-4em";
        div.style.marginLeft = "1em";
        if (x < 0) {
          div.style.marginLeft = "-2em";
        }
        break;
      case 1:
        div.style.marginTop = "-5em";
        if (y < 0) div.style.marginTop = "-3em";
        break;
    }

    div.style.color = '#000000'
    div.style.fontSize = '12px'
    const label = new CSS2DObject(div);

    label.position.set(0, 0, 0);
    label.name = "font";
    label.visible = true;
    mesh.add(label);

    this.scene.add(mesh);
    //this.nodeList.children.push(mesh);
    this.scene.render()
  }
 
  public getPointOnCircle(centerX, centerY, radius, angle) {
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const z = 0
    return { x, y, z };
  }
  showMessage() {
    const div = document.createElement("div");
    let mesh = new THREE.Mesh();
    const message1 = this.translate.instant("preview_rebar.message1")
    const message2 = this.translate.instant("preview_rebar.message2")

    div.className = "label_theerjs";
    div.style.textAlign = 'center';
    div.style.color = '#00C95F';
    div.style.fontSize = '16px';
    div.style.font = 'Noto Sans JP';
    
    const message1Div = document.createElement("div");
    message1Div.textContent = message1;
    div.appendChild(message1Div);

    const message2Div = document.createElement("div");
    message2Div.textContent = message2;
    div.appendChild(message2Div);

    const label = new CSS2DObject(div);
    label.position.set(0, 15, 0);
    label.name = "font";
    label.visible = true;
    mesh.add(label);
    this.scene.add(mesh);
  }
}
