import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from '../scene.service';
import { ThreeNodeService } from './three-node.service';
import { InputMembersService } from '../../members/members.service';
@Injectable({
  providedIn: 'root'
})
export class ThreeOvalService {
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
  createDemoOval() {
    var member = this.memmber.getData(this.node.dataRebar.selectedCalPoint.m_no);
    let memH = member['H'];
    let memB = member['B'];
    var arr = [memH, memB];
    let max_val = arr.reduce(function (accumulator, element) {
      return (accumulator > element) ? accumulator : element
    });
    this.scale = max_val / 88;
    this.type = memB < memH ? "Vertical" : "Horizontal"
    if (this.type === "Vertical") {
      this.createOval(memB / this.scale, memH / this.scale, 0xb9b9b9, this.type);
      // this.createLineOval(memB / this.scale, memH / this.scale, 10 / this.scale, 0x333D46, this.type)
      this.createLineDashedOval(memB / this.scale, memH / this.scale, 0x333D46, this.type)
      this.node.dataRebar.selectedCalPoint.rebar0.map((data) => {
        if ((data.rebar_type === 2 || data.rebar_type === 3) && data.dist_top != null 
        && data.dist_side != null  && data.dia != null && data.quantity != null) {
          this.createArcDashedOVal(memB / this.scale, memH / this.scale, data.dist_top / this.scale, 0x333D46, this.type, data.rebar_type)
        }
      })
    } else {
      this.createOval(memB / this.scale, memH / this.scale, 0xb9b9b9, this.type)
      // this.createLineOval(memB / this.scale, memH / this.scale, 10 / this.scale, 0x333D46, this.type)
      this.createLineDashedOval(memB / this.scale, memH / this.scale, 0x333D46, this.type)
      this.node.dataRebar.selectedCalPoint.rebar0.map((data) => {
        if (data.rebar_type === 5 && data.dist_top != null 
          && data.dist_side != null  && data.dia != null && data.quantity != null) {
          this.createArcDashedOVal(memB / this.scale, memH / this.scale, data.dist_top / this.scale, 0x333D46, this.type, data.rebar_type)
        }
      })
    }   
    this.scene.render()
  }
  createOval(b: any, h: any, color: any, type) {
    const materialCircle: any = new THREE.MeshBasicMaterial({ color: color });
    const materialPlane = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    let geometry: any
    let circleGeometry1: any
    let circleGeometry2: any;
    if (type === "Vertical") {
      geometry = new THREE.PlaneGeometry(b, Math.abs(h - b));
      circleGeometry1 = new THREE.Mesh(new THREE.CircleGeometry(b / 2, 100, 0, Math.PI), materialCircle);
      circleGeometry1.position.set(0, Math.abs(h / 2 - b / 2), 0);
      circleGeometry2 = new THREE.Mesh(new THREE.CircleGeometry(b / 2, 100, Math.PI, Math.PI), materialCircle);
      circleGeometry2.position.set(0, -Math.abs(h / 2 - b / 2), 0);
      this.drawPointOval(b, h, 2, type)
      this.drawPointOval(b, h, 3, type)
      this.drawPointOval(b, h, 6, type)
      this.convertToCoordinatesVerticalOval(b, h);
    } else {
      geometry = new THREE.PlaneGeometry(Math.abs(h - b), h);
      circleGeometry1 = new THREE.Mesh(new THREE.CircleGeometry(h / 2, 100, Math.PI / 2, Math.PI), materialCircle);
      circleGeometry1.position.set(-Math.abs(h / 2 - b / 2), 0, 0);
      circleGeometry2 = new THREE.Mesh(new THREE.CircleGeometry(h / 2, 100, 3 / 2 * Math.PI, Math.PI), materialCircle);
      circleGeometry2.position.set(Math.abs(h / 2 - b / 2), 0, 0);
      this.drawPointOval(b, h, 0, type)
      this.drawPointOval(b, h, 1, type)
      this.drawPointOval(b, h, 5, type)
      this.convertToCoordinatesHorizontalOval(b, h);
    }
    const plane = new THREE.Mesh(geometry, materialPlane);
    plane.position.set(0, 0, 0);
    
    this.scene.add(plane);
    this.scene.add(circleGeometry1);
    this.scene.add(circleGeometry2);
    this.scene.render()
    
  }
  createLineOval(b: any, h: any, range: any, color: any, type) {
    const material = new THREE.LineBasicMaterial({ color: color })
    let pointsLine1: any = []
    let pointsLine2: any = []

    let points1: any
    let curve1: any
    let ellipse1: any
    let line1: any

    let points2: any
    let curve2: any
    let ellipse2: any
    let line2: any

    if (type === "Vertical") {
      curve1 = new THREE.EllipseCurve(
        0, Math.abs(h / 2 - b / 2),
        Math.abs(b / 2 - range), Math.abs(b / 2 - range),
        0, Math.PI,
        false,
        0
      );
      curve2 = new THREE.EllipseCurve(
        0, -Math.abs(h / 2 - b / 2),
        Math.abs(b / 2 - range), Math.abs(b / 2 - range),
        Math.PI, 2 * Math.PI,
        false,
        0
      );
      pointsLine1.push(new THREE.Vector3(Math.abs(b / 2 - range), Math.abs(h / 2 - b / 2), 0))
      pointsLine1.push(new THREE.Vector3(Math.abs(b / 2 - range), -Math.abs(h / 2 - b / 2), 0))

      pointsLine2.push(new THREE.Vector3(-Math.abs(b / 2 - range), Math.abs(h / 2 - b / 2), 0))
      pointsLine2.push(new THREE.Vector3(-Math.abs(b / 2 - range), -Math.abs(h / 2 - b / 2), 0))
    } else {
      curve1 = new THREE.EllipseCurve(
        -Math.abs(h / 2 - b / 2), 0,
        Math.abs(h / 2 - range), Math.abs(h / 2 - range),
        Math.PI / 2, 3 * Math.PI / 2,
        false,
        0
      );
      curve2 = new THREE.EllipseCurve(
        Math.abs(h / 2 - b / 2), 0,
        Math.abs(h / 2 - range), Math.abs(h / 2 - range),
        3 * Math.PI / 2, 5 * Math.PI / 2,
        false,
        0
      );
      pointsLine1.push(new THREE.Vector3(Math.abs(h / 2 - b / 2), Math.abs(h / 2 - range), 0))
      pointsLine1.push(new THREE.Vector3(-Math.abs(h / 2 - b / 2), Math.abs(h / 2 - range), 0))

      pointsLine2.push(new THREE.Vector3(-Math.abs(h / 2 - b / 2), -Math.abs(h / 2 - range), 0))
      pointsLine2.push(new THREE.Vector3(Math.abs(h / 2 - b / 2), -Math.abs(h / 2 - range), 0))
    }

    points1 = curve1.getPoints(100);
    ellipse1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points1), material);
    line1 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pointsLine1),
      material
    );
    points2 = curve2.getPoints(100);
    ellipse2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points2), material);
    line2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pointsLine2),
      material
    );
    this.scene.add(ellipse1)
    this.scene.add(ellipse2)
    this.scene.add(line1)
    this.scene.add(line2)
  }
  convertToCoordinatesVerticalOval(b: any, h: any) {
    let jsonData: object = {};
    const x_start = b / 2;
    const y_start = h / 2
    if (b != 0 && h != 0) {
      jsonData["1"] = {
        x: 0,
        y: y_start,
        z: 0
      }
      jsonData["2"] = {
        x: 0,
        y: -y_start,
        z: 0
      }  
      jsonData["3"] = {
        x: x_start,
        y: y_start - x_start/2,
        z: 0
      } 
      jsonData["4"] = {
        x: -x_start,
        y: y_start - x_start/2,
        z: 0
      }      
    }
    this.node.drawLineDim(jsonData["1"], jsonData["2"], 0, Math.round(h * this.scale), true, x_start + 15, 2, 1);
    this.node.drawLineDim(jsonData["3"], jsonData["4"], 1, Math.round(b * this.scale), false, y_start / 2 - 2, 8, -1);
    
    //rebar type 2 , 3;
    let arr_rebar_type2 = [];
    this.node.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if (data.rebar_type === 2 && data.dist_top != null 
        && data.dist_side != null  && data.dia != null && data.quantity != null) {
        arr_rebar_type2.push(data)
      }
      if(data.rebar_type === 3 && data.dist_top != null 
        && data.dist_side != null  && data.dia != null && data.quantity != null){
        let dataCp = JSON.parse(JSON.stringify(data))
        dataCp.dist_side = h * this.scale -  dataCp.dist_side   
        dataCp.dist_top = h * this.scale -  dataCp.dist_top  
        arr_rebar_type2.push(dataCp)
      }
    })
    arr_rebar_type2.sort((a, b) => a.dist_top - b.dist_top)
    let start_cover = 0;
    
    arr_rebar_type2.map((data, index) => {
      const cover = data.dist_side / this.scale;     
      jsonData[`rb2_${index}`] = {
        x: -2,
        y: y_start - cover,
        z: 0
      }    
      if(index == 0)  
        this.node.drawLineDim(jsonData["1"], jsonData[`rb2_${0}`], 0, Math.round(cover * this.scale), true, x_start + 10, (x_start + 10)* 2 - 5, 1);   
      else 
        this.node.drawLineDim(jsonData[`rb2_${index-1}`], jsonData[`rb2_${index}`], 0, Math.round(cover * this.scale - start_cover), true, x_start + 10, (x_start + 10)* 2 - 5, 1);      
      
      if(index == arr_rebar_type2.length - 1)
        this.node.drawLineDim(jsonData["2"], jsonData[`rb2_${index}`], 0, Math.round(h*this.scale - cover * this.scale), true, x_start + 10, (x_start + 10)* 2 - 5, 1); 
      start_cover = cover * this.scale;
    })

    let arr_rebar_type6 = [];
    this.node.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if (data.rebar_type === 6 && data.dist_top != null 
        && data.dist_side != null  && data.dia != null && data.quantity != null) {
        arr_rebar_type6.push(data)
      }
    })
    arr_rebar_type6.sort((a, b) => a.dist_top - b.dist_top)
    jsonData["rb6"] = {
      x: x_start + 3,
      y: y_start - x_start,
      z:0
    }
    if (arr_rebar_type6.length > 0) {    
      for(let i = 0; i< arr_rebar_type6.length ; i++){  
        const rebar_6 =  arr_rebar_type6[i];        
        jsonData[`rb6_${i}`]= {
          x:  x_start + 3,
          y:   y_start - x_start - rebar_6.dist_top/this.scale,
          z: 0
        }
        if(i == 0)
          this.node.drawLineDim(jsonData["rb6"], jsonData[`rb6_${i}`], 0, Math.round(rebar_6.dist_top), true, 6, 2, 0);
        else
          this.node.drawLineDim(jsonData[`rb6_${i - 1}`], jsonData[`rb6_${i}`], 0, Math.round(arr_rebar_type6[i].dist_top - arr_rebar_type6[i-1].dist_top), true, 6, 2, 0);    
        
        if(i == arr_rebar_type6.length - 1){
          jsonData["rb6_end"] = {
            x: x_start + 3,
            y: -(y_start - x_start),
            z:0
          }
          this.node.drawLineDim(jsonData[`rb6_end`], jsonData[`rb6_${i}`], 0, Math.round(y_start * 2 * this.scale - rebar_6.dist_top - x_start *2*this.scale), true, 6, 2, 0);  
        }
      }   
    }
    if(arr_rebar_type6.length > 0){
      const dist_side_min = arr_rebar_type6[0].dist_side / this.scale;
      jsonData["rb6_side1"] ={
        x: x_start - dist_side_min,
        y: y_start - x_start - arr_rebar_type6[0].dist_top/this.scale,
        z: 0
      }
      jsonData["rb6_side2"] ={
        x: x_start,
        y: y_start - x_start - arr_rebar_type6[0].dist_top/this.scale,
        z: 0
      }
      this.node.drawLineDim(jsonData["rb6_side1"], jsonData["rb6_side2"], 1, Math.round(dist_side_min * this.scale), false, 6, 2, 0);
    }   
  }
  convertToCoordinatesHorizontalOval(b: any, h: any) {
    let jsonData: object = {};
    const x_start = b / 2;
    const y_start = h / 2
    if (b != 0 && h != 0) {
      jsonData["1"] = {
        x: x_start - y_start,
        y: y_start,
        z: 0
      }
      jsonData["2"] = {
        x: x_start - y_start,
        y: -y_start,
        z: 0
      }  
      jsonData["3"] = {
        x: x_start,
        y: 3*y_start / 4,
        z: 0
      } 
      jsonData["4"] = {
        x: -x_start,
        y: 3*y_start / 4,
        z: 0
      }      
    }
    this.node.drawLineDim(jsonData["1"], jsonData["2"], 0, Math.round(h * this.scale), true, y_start*1.5, y_start/3.5, 0);
    this.node.drawLineDim(jsonData["3"], jsonData["4"], 1, Math.round(b * this.scale), false, y_start, y_start/2.5, 0);
    
     // dimenstions for rebar_type = 0
     let arr_rebar_type_0 = []
     this.node.dataRebar.selectedCalPoint.rebar0.map((data)=>{
       if (data.rebar_type === 0 && data.dist_top != null 
        && data.dist_side != null  && data.dia != null && data.quantity != null) {
         arr_rebar_type_0.push(data)
       }
     })
     arr_rebar_type_0.sort((a, b) => a.dist_top - b.dist_top)
     const rebar_type_0 = arr_rebar_type_0[0];
     if (rebar_type_0 != undefined) {
       const dist_top = rebar_type_0.dist_top / this.scale;
       const dist_side = rebar_type_0.dist_side / this.scale;
       const quantity = rebar_type_0.quantity;
       const interval =   (b - h - 2 * dist_side) / (quantity - 1);
       jsonData["rb0_1"] = {
         x: -(x_start - y_start),
         y: y_start + 2,
         z: 0
       }
       jsonData["rb0_2"] = {
         x: -(x_start - y_start - dist_side),
         y: y_start + 2,
         z: 0
       }
       jsonData["rb0_3"] = {
         x: -(x_start - y_start - dist_side) + interval,
         y: y_start + 2,
         z: 0
       }
      
       this.node.drawLineDim(jsonData["rb0_2"], jsonData["rb0_1"], 1, Math.round(dist_side * this.scale), false, 6, 2, 1);
       if(quantity>1){
         this.node.drawLineDim(jsonData["rb0_2"], jsonData["rb0_3"], 1, Math.round(interval * this.scale), false, 6, 2, 1);
       }
     }
     let arr_rebar_type_1 = []
    this.node.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if (data.rebar_type === 1 && data.dist_top != null 
        && data.dist_side != null  && data.dia != null && data.quantity != null) {
        arr_rebar_type_1.push(data)
      }
    })
    arr_rebar_type_1.sort((a, b) => b.dist_top - a.dist_top)
    const rebar_type_1 = arr_rebar_type_1[0];

    if (rebar_type_1 != undefined) {
        const dist_top2 = rebar_type_1.dist_top / this.scale;
        const dist_side2 = rebar_type_1.dist_side / this.scale;
        const quantity2 = rebar_type_1.quantity;
        const interval2 = (b - h - 2 * dist_side2) / (quantity2 - 1);
        jsonData["rb1_1"] = {
          x: -(x_start - y_start),
          y: -(y_start + 2),
          z: 0
        }
        jsonData["rb1_2"] = {
          x: -(x_start - y_start - dist_side2),
          y: -(y_start + 2),
          z: 0
        }
        jsonData["rb1_3"] = {
          x: -(x_start - y_start - dist_side2 - interval2),
          y: -(y_start+2),
          z: 0
        }
        this.node.drawLineDim(jsonData["rb1_1"], jsonData["rb1_2"], 1, Math.round(dist_side2 * this.scale), false, 6, -2, 1);
        if(quantity2>1){
          this.node.drawLineDim(jsonData["rb1_2"], jsonData["rb1_3"], 1, Math.round(interval2 * this.scale), false, 6, -2, 1);
        }
      }
    let arr_rebar_type01 = [];
    this.node.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if ((data.rebar_type === 0 || data.rebar_type === 1) && data.dist_top != null 
      && data.dist_side != null  && data.dia != null && data.quantity != null) {
        arr_rebar_type01.push(data)
      }
    })
    arr_rebar_type01.sort((a, b) => a.dist_top - b.dist_top)
    jsonData["rb6"] = {
      x: -(x_start - y_start),
      y: y_start,
      z:0
    }
    if (arr_rebar_type01.length > 0) {    
      for(let i = 0; i< arr_rebar_type01.length ; i++){  
        const rebar_6 =  arr_rebar_type01[i];        
        jsonData[`rb6_${i}`]= {
          x: - (x_start - y_start),
          y:   y_start -  rebar_6.dist_top/this.scale,
          z: 0
        }
        if(i == 0)
          this.node.drawLineDim(jsonData["rb6"], jsonData[`rb6_${i}`], 0, Math.round(rebar_6.dist_top), true, y_start*1.5,y_start*2.75, 0);
        else
          this.node.drawLineDim(jsonData[`rb6_${i - 1}`], jsonData[`rb6_${i}`], 0, Math.round(arr_rebar_type01[i].dist_top - arr_rebar_type01[i-1].dist_top), true, y_start*1.5, y_start*2.75, 0);    
        
        if(i == arr_rebar_type01.length - 1){
          jsonData["rb6_end"] = {
            x: - (x_start - y_start),
            y: -(y_start),
            z:0
          }
          this.node.drawLineDim(jsonData[`rb6_end`], jsonData[`rb6_${i}`], 0, Math.round(h * this.scale - rebar_6.dist_top), true, y_start*1.5, y_start*2.75, 0);  
        }
      }   
    }
    let dist_side_min;
    this.node.dataRebar.selectedCalPoint.rebar0.map((data) =>{
      if(data.rebar_type == 5 && data.dist_top != null 
        && data.dist_side != null  && data.dia != null && data.quantity != null){
        dist_side_min = data;
      }
    });
    if(dist_side_min != undefined){
      jsonData["rb6_side1"] ={
        x: x_start,
        y: 0,
        z: 0
      }
      jsonData["rb6_side2"] ={
        x: x_start - dist_side_min.dist_side/this.scale,
        y: 0,
        z: 0
      }
      this.node.drawLineDim(jsonData["rb6_side1"], jsonData["rb6_side2"], 1, dist_side_min.dist_side, false, 6, 2, 0);
    }
    
  }
  createArcDashedOVal(b: any, h: any, range: any, color: any, type, rebarType:any){
    const material = new THREE.LineBasicMaterial({ color: color })

    let points: any
    let curve: any
    let ellipse: any

    if (type === "Vertical") {
      if(rebarType===2){
        curve = new THREE.EllipseCurve(
          0, Math.abs(h / 2 - b / 2),
          Math.abs(b / 2 - range), Math.abs(b / 2 - range),
          0, Math.PI,
          false,
          0
        );
      }
      if(rebarType==3){
        curve = new THREE.EllipseCurve(
          0, -Math.abs(h / 2 - b / 2),
          Math.abs(b / 2 - range), Math.abs(b / 2 - range),
          Math.PI, 2 * Math.PI,
          false,
          0
        );
      }

    } else {
      let points2: any
      let curve2: any
      let ellipse2: any
      curve = new THREE.EllipseCurve(
        -Math.abs(h / 2 - b / 2), 0,
        Math.abs(h / 2 - range), Math.abs(h / 2 - range),
        Math.PI / 2, 3 * Math.PI / 2,
        false,
        0
      );
      curve2 = new THREE.EllipseCurve(
        Math.abs(h / 2 - b / 2), 0,
        Math.abs(h / 2 - range), Math.abs(h / 2 - range),
        3 * Math.PI / 2, 5 * Math.PI / 2,
        false,
        0
      );

      points2 = curve2.getPoints(100);
      ellipse2 = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points2), material);

      this.scene.add(ellipse2)
    
    }

    points = curve.getPoints(100);
    ellipse = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material);
    
    this.scene.add(ellipse)
  }
  createLineDashedOval(b: any, h: any, color: any, type) {
    const materialLine = new THREE.LineDashedMaterial({ color: color, dashSize: 1.5, gapSize: 1.5 })

    let pointsLine1: any = []
    let pointsLine2: any = []

    let line1: any
    let line2: any

    if (type === "Vertical") {
      pointsLine1.push(new THREE.Vector3(Math.abs(b / 2 + 20 / this.scale), Math.abs(h / 2 - b / 2), 0));
      pointsLine1.push(new THREE.Vector3(-Math.abs(b / 2 + 20 / this.scale), Math.abs(h / 2 - b / 2), 0));

      pointsLine2.push(new THREE.Vector3(Math.abs(b / 2 + 20 / this.scale), -Math.abs(h / 2 - b / 2), 0));
      pointsLine2.push(new THREE.Vector3(-Math.abs(b / 2 + 20 / this.scale), -Math.abs(h / 2 - b / 2), 0));
    } else {
      
      pointsLine1.push(new THREE.Vector3(Math.abs(h / 2 - b / 2), Math.abs(h / 2 + 20 / this.scale)));
      pointsLine1.push(new THREE.Vector3(Math.abs(h / 2 - b / 2), -Math.abs(h / 2 + 20 / this.scale)));

      pointsLine2.push(new THREE.Vector3(-Math.abs(h / 2 - b / 2), Math.abs(h / 2 + 20 / this.scale)));
      pointsLine2.push(new THREE.Vector3(-Math.abs(h / 2 - b / 2), -Math.abs(h / 2 + 20 / this.scale)));
    }

    line1 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pointsLine1),
      materialLine
    );
    line1.computeLineDistances()

    line2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pointsLine2),
      materialLine
    );
    line2.computeLineDistances()
    this.scene.add(line1)
    this.scene.add(line2)
  }
  drawPointOval(b: any, h: any, typeRebar: any,type:any){
    let dataPoint = []
    let color = typeRebar === 5|| typeRebar === 6 ? 0xfafafa : 0x000000
    this.node.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if (data.rebar_type === typeRebar && data.dist_top != null 
        && data.dist_side != null  && data.dia != null && data.quantity != null) {    
        dataPoint.push(data)
      }
    })
    dataPoint.map((data, index) => {
      this.geometry = data.dia === null || data.dia === "null" ? new THREE.SphereBufferGeometry(0) : new THREE.SphereBufferGeometry(+data.dia / 2 / this.scale)
      let interval = 0
      for (let i = 1; i <= data.quantity; i++) {
        const mesh = new THREE.Mesh(this.geometry,
          new THREE.MeshBasicMaterial({ color: color }));
        const mesh2 = new THREE.Mesh(this.geometry,
          new THREE.MeshBasicMaterial({ color: color }));
        if (typeRebar === 6 && type === "Vertical") {
          mesh.name = 'node6' + index + i;
          mesh.position.x = -(b / 2 - data.dist_side / this.scale - interval);
          mesh.position.y = h / 2 - b / 2 - data.dist_top / this.scale;
          mesh.position.z = 0;
          this.node.nodeList.children.push(mesh);
          interval += (b - 2 * data.dist_side / this.scale) / (data.quantity - 1);
        }
        if ((typeRebar === 2 || typeRebar === 3  ) && type === "Vertical") {
          mesh.name = typeRebar === 2 ? 'node2' + index + i : 'node3' + index + i;
          let centerY = typeRebar === 2 ? h / 2 - b / 2 : -(h / 2 - b / 2)
          let radius = typeRebar === 2 ? b / 2 - data.dist_top / this.scale : -(b / 2 - data.dist_top / this.scale)
          let coordinate = this.node.getPointOnCircle(0, centerY, radius , interval);
          mesh.position.x = -coordinate.x;
          mesh.position.y = coordinate.y;
          mesh.position.z = coordinate.z;
          this.node.nodeList.children.push(mesh);
          interval += Math.PI / (data.quantity - 1)
        }
        if ((typeRebar === 0 || typeRebar === 1) && type !== "Vertical") {
          mesh.name = typeRebar === 0 ? 'node0' + index + i : 'node1' + index + i;
          mesh.position.x = -(b / 2 - h / 2 - data.dist_side / this.scale - interval);
          mesh.position.y = h / 2 - data.dist_top / this.scale;
          mesh.position.z = 0;
          this.node.nodeList.children.push(mesh);
          interval += (b - h - 2 * data.dist_side / this.scale) / (data.quantity - 1);
        }
        if (typeRebar === 5 && type !== "Vertical") {
          mesh.name =  'node5_1' + index + i 
          mesh2.name = 'node5_2' + index + i 
          let centerX1 =  -(h / 2 - b / 2) 
          let centerX2 = h / 2 - b / 2
          let radius = h / 2 - data.dist_side / this.scale 
          let coordinate1 = this.node.getPointOnCircle(centerX1, 0, radius, interval - Math.PI / 2);
          let coordinate2 = this.node.getPointOnCircle(centerX2, 0, radius, interval + Math.PI / 2);

          mesh.position.x = -coordinate1.x;
          mesh.position.y = coordinate1.y;
          mesh.position.z = coordinate1.z;

          mesh2.position.x = -coordinate2.x;
          mesh2.position.y = coordinate2.y;
          mesh2.position.z = coordinate2.z;
          this.node.nodeList.children.push(mesh);
          this.node.nodeList.children.push(mesh2);
          interval += Math.PI / (data.quantity - 1)
        }
      }
    })
  }
}
