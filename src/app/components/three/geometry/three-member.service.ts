import { Injectable } from '@angular/core';
import { InputMembersService } from '../../members/members.service';
import { SceneService } from '../scene.service';
import * as THREE from 'three';
import { CSS2DObject } from "../libs/CSS2DRenderer.js";
@Injectable({
  providedIn: 'root'
})
export class ThreeMemberService {
  public dataNode: any[];
  public memNo: number;
  public geometry: THREE.SphereBufferGeometry;
  public geometry1: THREE.SphereBufferGeometry;
  public geometry2: THREE.SphereBufferGeometry;
  public nodeList: THREE.Object3D;
  public jsonData: any
  public scale: any
  constructor(    
    private scene: SceneService
  ) {
    this.memNo = 0;
    this.dataNode = new Array();
    this.scale = 100
    this.nodeList = new THREE.Object3D();
  }
  public onInit(): void {
    this.scene.render();
  } 

  public changeData(jsonData: any): object {

    const jsonKeys = Object.keys(jsonData);
    let data: any = [];
    if (jsonKeys.length <= 0) {
      return null;
    }
    for (const key of jsonKeys) {      
      data.push({ x: jsonData[key].x, y: jsonData[key].y, z: jsonData[key].z })
    }  
    return data;
  }

  private createPanel(vertexlist, row): void {

    const points = []
    const geometrys: THREE.BufferGeometry[] = [];
    for (const p of vertexlist) {
      points.push(new THREE.Vector3(p[0], p[1], p[2]))
    }
    // 三角形を作る
    geometrys.push(new THREE.BufferGeometry().setFromPoints([points[0], points[1], points[2]]));
    // 四角形が作れる場合
    if (points.length > 3)
      geometrys.push(new THREE.BufferGeometry().setFromPoints([points[3], points[0], points[2]]));

    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      color: 0xD9D9D9,
      opacity: 0.7,
    });

    for (const g of geometrys) {
      const mesh = new THREE.Mesh(g, material);
      mesh.name = 'panel-' + row.toString();
      this.scene.add(mesh);
    }
  }
  private drawLineDemension(pointStart: any, length: number, direction: boolean, title: any, distance: any[], style: number) {
    if (title == null) return;
    let points = [];
    const point = pointStart as [];
    const x = point['x'];
    const y = -point['y'];
    const z = point['z'];
    const dim1X = x > 0 ?  x + distance[0] : -(Math.abs(x) + distance[0]);
    const dim2X = x > 0 ?  x + distance[1] : -(Math.abs(x) + distance[1])
    const dim3X = x > 0 ?  x + distance[2] : -(Math.abs(x) + distance[2]);

    const dim1Y = y > 0 ?  y + distance[0] : -(Math.abs(y) + distance[0]);
    const dim2Y = y > 0 ?  y + distance[1] : -(Math.abs(y) + distance[1])
    const dim3Y = y > 0 ?  y + distance[2] : -(Math.abs(y) + distance[2]);
    if(!direction){
      points.push(new THREE.Vector3(dim1X, y, z));
      points.push(new THREE.Vector3(dim3X, y, z));
      points.push(new THREE.Vector3(dim2X, y, z));
      points.push(new THREE.Vector3(dim2X, y - length, z));
      points.push(new THREE.Vector3(dim1X, y - length, z));
      points.push(new THREE.Vector3(dim3X, y - length, z));
    }else{
      points.push(new THREE.Vector3(x, dim1Y, z));
      points.push(new THREE.Vector3(x, dim3Y, z));
      points.push(new THREE.Vector3(x, dim2Y, z));
      points.push(new THREE.Vector3(x + length, dim2Y, z));
      points.push(new THREE.Vector3(x + length, dim1Y, z));
      points.push(new THREE.Vector3(x + length, dim3Y, z));
    }
   
    
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x000000})
    );
    const vect = new THREE.Vector3(length, 0, 0);
    const geometry = new THREE.CylinderBufferGeometry(1, 1, vect.length(), 12);

    // 要素をシーンに追加
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0x000000 ,  opacity: 0.1})
    );
    mesh.name = "member" + 1;
    if(direction){
      mesh.position.set(x + length / 2, (dim1Y + dim3Y) / 2, z);
      mesh.rotation.z = Math.acos(0);
      mesh.rotation.y = 0.5 * Math.PI + Math.atan2(length, 0);
    }else{
      mesh.position.set((dim1X + dim3X) / 2, y - length / 2, z);
      mesh.rotation.z = Math.acos(-1);
      mesh.rotation.y = 0.5 * Math.PI + Math.atan2(dim1X - dim3X, -length);
    }
   
    
    // 文字をシーンに追加
    const div = document.createElement("div");
    div.className = "label";
    div.textContent = `${title}`;
    div.style.color = '#000000'
    div.style.fontSize = '12px'  
    switch(style){
      case 1:
        div.style.marginTop = "-8.5px";
        div.style.marginLeft = "-13px";
        break;
      case 2:
        div.style.marginTop = "-2.5px";
        div.style.marginLeft = "-4px";
        break;
    } 
    const label = new CSS2DObject(div);

    label.position.set(0, 0, 0);
    label.name = "font";
    label.visible = true;
    mesh.add(label);
    mesh.scale.set(0, 0.6, 0);
    this.scene.add(line);
    this.nodeList.children.push(mesh);   
    this.scene.render()
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
  private getRadius(scale: number) {
    let arr: any = [];
    const rebar1 = this.dataNode['rebar1']
    if (rebar1['rebar_dia'] != null) {
      const radius = rebar1['rebar_dia'] / scale
      arr.push(radius);
    }
    const rebar2 = this.dataNode['rebar2']
    if (rebar2['rebar_dia'] != null) {
      const radius = rebar2['rebar_dia'] / scale
      arr.push(radius);
    }
    var objectKey = Object.keys(this.dataNode);
    if (!objectKey.includes("sidebar")) {
      const sidebar1 = this.dataNode['sidebar1']
      if (sidebar1['side_dia'] != null) {
        const radius = sidebar1['side_dia'] / scale
        arr.push(radius);
      }
    }else{
      const sidebar1 = this.dataNode['sidebar']
      if (sidebar1['side_dia'] != null) {
        const radius = sidebar1['side_dia'] / scale
        arr.push(radius);
      }
    }
    return arr;
  }

  public drawingRetangle(){    
    let jsonData: any =  this.changeData(this.getJsoṇRetangle()) as [];
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const points = [];

    const arrPanel = [
      [1, 2, 3, 4]      
    ]
    arrPanel.forEach(item => {
      const vertexlist = [];
      item.forEach(i => {
        const n = jsonData[i - 1]
        const x = n['x'];
        const y = n['y'];
        const z = n['z'];
        vertexlist.push([x, -y, z])
      })
      this.createPanel(vertexlist, arrPanel.indexOf(item));
    })
    jsonData.forEach(x => {    
        points.push(new THREE.Vector3(x['x'], -x['y'], x['z']));      
    })
    let x = jsonData[0];
    points.push(new THREE.Vector3(x['x'], -x['y'], x['z']));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      material
    );
    this.scene.add(line);
    const radiuses = this.getRadius(this.scale)
    this.geometry = new THREE.SphereBufferGeometry(radiuses[0])
  }
  public getJsoṇRetangle(){
    let scale = this.scale;
    let jsonData: object = {};
    var member = this.dataNode;
    let memH = member['H'];
    let memB = member['B'];

    let ratio = 1;
    if (member['shape'] !== 1) {
      if (memH > 2500) {
        ratio = memH / 2500;
        memH = 2500;
      }     
      memB = memB / ratio;    
      scale = 50;
      this.scale = scale;
    }
    let b = memB / scale;
    let h = memH / scale;
    const x_start = -b / 2;
    const y_start = -h / 2;
    if (b != 0 && h != 0) {
      jsonData["1"] = {
        x: x_start,
        y: y_start,
        z: 0
      }
      jsonData["2"] = {
        x: 0 + x_start,
        y: h + y_start,
        z: 0
      }
      jsonData["3"] = {
        x: b + x_start,
        y: h + y_start,
        z: 0
      }
      jsonData["4"] = {
        x: b + x_start,
        y:  y_start,
        z: 0
      }
    }
    this.drawLineDemension(jsonData["1"], this.getLength(jsonData["1"], jsonData["4"]),true, "B", [1, 3, 5], 1)
    this.drawLineDemension(jsonData["4"], this.getLength(jsonData["3"], jsonData["4"]), false, "H", [1, 3, 5], 2)
    return jsonData;
  }  
}
