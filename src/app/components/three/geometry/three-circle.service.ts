import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from '../scene.service';
import { ThreeNodeService } from './three-node.service';
import { InputMembersService } from '../../members/members.service';
@Injectable({
  providedIn: 'root'
})
export class ThreeCircleService {
  public scale: any;
  public geometry: THREE.SphereBufferGeometry;
  public geometry1: THREE.SphereBufferGeometry;
  public geometry2: THREE.SphereBufferGeometry;
  public type: any
  constructor(
    private scene: SceneService,
    private memmber: InputMembersService,
    private node: ThreeNodeService   
  ) { }
  createDemoCircleRing() {
    var member = this.memmber.getData(this.node.dataRebar.selectedCalPoint.m_no);
    let memH = member['H'];
    let memB = member['B'];   
    
    let arr_rebar_type_7 = []
    this.node.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if (data.rebar_type === 7) {
        arr_rebar_type_7.push(data)
      }
    })
    arr_rebar_type_7.sort((a, b) => a.dist_top - b.dist_top)
    var arr = [memH, memB];
    let max_val = arr.reduce(function (accumulator, element) {
      return (accumulator > element) ? accumulator : element
    });
    this.scale = max_val / 88;
    if (memH === 0) {
      this.createCircleRing(0xb9b9b9, this.type, memB / this.scale)
    } else {
      this.createCircleRing(0xb9b9b9, this.type, memB / this.scale, memH / this.scale)
    }  
    arr_rebar_type_7.map((data) => {
      this.createLineDashCircleRing(0x333D46, data.dist_side / this.scale, memB / this.scale)
    })
    this.drawPointCircleShape(memB, 7)
    this.scene.render()
  }
  createCircleRing(color: any, type: any, b: any, h?: any,) {
    const material = new THREE.MeshBasicMaterial({ color: color });
    let geometry;
    let mesh

    if (h > 0) {
      geometry = new THREE.RingGeometry(h / 2, b / 2, 100)
    } else {
      geometry = new THREE.CircleGeometry(b / 2, 100)
    }
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    this.convertToCoordinatesCircleRing(b, h)
    this.scene.add(mesh);
  }
  createLineCircleRing(color: any, range: any, b: any) {
    const material = new THREE.LineBasicMaterial({ color: color })

    let points: any
    let curve: any
    let ellipse: any

    curve = new THREE.EllipseCurve(
      0, 0,
      Math.abs(b / 2 - range), Math.abs(b / 2 - range),
      0, 2 * Math.PI,
      false,
      0
    );

    points = curve.getPoints(100);
    ellipse = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);

    this.scene.add(ellipse)

  }
  createLineDashCircleRing(color: any, range1: any, b: any) {
    const material = new THREE.LineDashedMaterial({ color: color, dashSize: 1, gapSize: 1 })

    let points1: any
    let curve1: any
    let ellipse1: any
    curve1 = new THREE.EllipseCurve(
      0, 0,
      Math.abs(b / 2 - range1), Math.abs(b / 2 - range1),
      0, 2 * Math.PI,
      false,
      0
    ); 
    points1 = curve1.getPoints(100);
    ellipse1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points1), material);
    ellipse1.computeLineDistances();

    this.scene.add(ellipse1)

  }
  convertToCoordinatesCircleRing(b: any, h: any) {
    
    let jsonData: object = {};
    const x_start = b / 2;
    const x1_start = h / 2
    if (b != 0) {
      jsonData["1"] = {
        x: x_start,
        y: 20,
        z: 0
      }
      jsonData["2"] = {
        x: -x_start,
        y: 20,
        z: 0
      } 
    }   
    if (h > 0) {
      jsonData["1.1"] = {
        x: x1_start,
        y: 0,
        z: 0,
      }
      jsonData["2.1"] = {
        x: -x1_start,
        y: 0,
        z: 0,
      }
      this.node.drawLineDim(jsonData["1.1"], jsonData["2.1"], 1, Math.round(h * this.scale), false, 5, 0, 0);
    }

    // Line dim for rebar0
    let arr_rebar_type_7 = []
    this.node.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if (data.rebar_type === 7) {
        arr_rebar_type_7.push(data)
      }
    })
    arr_rebar_type_7.sort((a, b) => a.dist_top - b.dist_top)
    jsonData["3"] = {
      x: x_start,
      y: 0,
      z: 0,
    }
    let dist_side_pre = 0;
    arr_rebar_type_7.map((data, index) => {
      jsonData[`${4 + index}`] = {
        x: x_start - data.dist_side/this.scale,
        y: 0,
        z: 0,
      }
      if(index === 0){
        this.node.drawLineDim(jsonData["3"], jsonData[`${4 + index}`], 1, Math.round(data.dist_side), false, x_start, -20, -1);
      }else{
        this.node.drawLineDim(jsonData[`${4 + index - 1}`], jsonData[`${4 + index}`], 1, Math.round(data.dist_side - dist_side_pre), false, x_start, -20, -1);
      }
      dist_side_pre = data.dist_side;
    })    
    this.node.drawLineDim(jsonData["1"], jsonData["2"], 1, Math.round(b * this.scale), false, x_start * 2 / 3 , 12, 0);
    
  }
  drawPointCircleShape(b: any, type: any){
    let dataPoint = []
    let color = 0x000000

    this.node.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if (data.rebar_type === type) {
        dataPoint.push(data)
      }
    })

    dataPoint.map((data,index)=>{
      let geometry = data.dia === null || data.dia === "null" ? new THREE.SphereBufferGeometry(0) : new THREE.SphereBufferGeometry(+data.dia / 2 / this.scale)
      for (let i = 0; i < data.quantity ;i++){
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({ color: color })
        );
        let interval = 0
        let angle = 2 * Math.PI / data.quantity
        mesh.name = 'node' + index + i;
        mesh.position.x = (b / 2 - data.dist_side) * Math.sin(angle*i )  / this.scale;
        mesh.position.y = (b / 2 - data.dist_side) * Math.cos(angle*i) /  this.scale;
        mesh.position.z = 0;
        interval += Math.PI * (b - 2 * data.dist_side) / data.quantity
        this.node.nodeList.children.push(mesh);
      }
    })
  }
}
