import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { InputMembersService } from '../../members/members.service';
import { SceneService } from '../scene.service';
import { ThreeNodeService } from './three-node.service';

@Injectable({
  providedIn: 'root'
})
export class ThreeTshapeService {
  public scale: any;
  public geometry: THREE.SphereBufferGeometry;
  public geometry1: THREE.SphereBufferGeometry;
  public geometry2: THREE.SphereBufferGeometry;
  constructor(
    private scene: SceneService,
    private memmber: InputMembersService,
    private node: ThreeNodeService     
  ) { }
  createDemoTShape() {
    var member = this.memmber.getData(this.node.dataRebar.selectedCalPoint.m_no);
    let memH = member['H'];
    let memBt = member['Bt'];
    let memB = member['B'];
    let memt = member['t'];
    var arr = [memH, memBt, memB, memt];
    let max_val = arr.reduce(function (accumulator, element) {
      return (accumulator > element) ? accumulator : element
    });
    this.scale = max_val / 88;
    let haunch_M = this.node.dataRebar.selectedCalPoint.haunch_M;
    if (!!haunch_M) memH = memH + haunch_M;
    this.createTShape(memBt / this.scale, memH / this.scale, memB / this.scale, memt / this.scale, 0xb9b9b9)
    //this.createLineRectangle(memB / this.scale, memH / this.scale, 20 / this.scale, 0x333D46)
    this.scene.render()
  }
  createTShape(bt: any, h: any, b: any, t: any, color: any) {
    const materialPlane = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    let geometry1: any = new THREE.PlaneGeometry(bt, t);
    const plane1 = new THREE.Mesh(geometry1, materialPlane);
    plane1.position.set(0, Math.abs(h / 2 - t / 2), 0);

    let geometry2: any = new THREE.PlaneGeometry(b, h - t);
    const plane2 = new THREE.Mesh(geometry2, materialPlane);
    plane2.position.set(0, -t / 2, 0);

    this.scene.add(plane1);
    this.scene.add(plane2);
    this.convertToCoordinatesTShape(bt, h, b, t);
    this.drawPointTShape(bt, h, b, t,0)
    this.drawPointTShape(bt, h, b, t, 4)
    this.drawPointTShape(bt, h, b, t, 1)

    this.scene.render()
  }
  convertToCoordinatesTShape(bt: any, h: any, b: any, t: any) {
    let jsonData: object = {};
    const x_start = bt / 2;
    const y_start = h / 2
    const n = (bt - b) / 2
    if (b != 0 && h != 0 && bt != 0 && t != 0) {
      jsonData["1"] = {
        x: x_start,
        y: y_start,
        z: 0
      }
      jsonData["2"] = {
        x: x_start,
        y: y_start - t,
        z: 0
      }
      jsonData["3"] = {
        x: x_start - n,
        y: y_start - t,
        z: 0
      }
      jsonData["4"] = {
        x: x_start - n,
        y: - y_start,
        z: 0
      }
      jsonData["5"] = {
        x: -(x_start - n),
        y: - y_start,
        z: 0
      }

      jsonData["6"] = {
        x: -(x_start - n),
        y: y_start - t,
        z: 0
      }
      jsonData["7"] = {
        x: - x_start,
        y: -(y_start - t),
        z: 0
      }
      jsonData["8"] = {
        x: -x_start,
        y: y_start,
        z: 0
      }
    }
    if(h !== t){
      this.node.drawLineDim(jsonData["1"], jsonData["2"], 0, Math.round(t * this.scale), true, 6, 4, 1);
    }    
    this.node.drawLineDim(jsonData["1"], jsonData["4"], 0, Math.round(h * this.scale), true, 8, 1, 4);
    
    this.node.drawLineDim(jsonData["1"], jsonData["8"], 1, Math.round(bt * this.scale), false, 8, 1, 4);
    if(b != bt){
      this.node.drawLineDim(jsonData["4"], jsonData["5"], 1, Math.round(b * this.scale), false, 3, 0, 9);
    }

    // dimenstions for rebar_type = 0
    let arr_rebar_type_0 = []
    this.node.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if (data.rebar_type === 0) {
        arr_rebar_type_0.push(data)
      }
    })
    arr_rebar_type_0.sort((a, b) => a.dist_top - b.dist_top)
    const rebar_type_0 = arr_rebar_type_0[0];
    if (rebar_type_0 != undefined) {
      const dist_top = rebar_type_0.dist_top / this.scale;
      const dist_side = rebar_type_0.dist_side / this.scale;
      const quantity = rebar_type_0.quantity;
      const interval =   (b - 2 * dist_side) / (quantity - 1);
      jsonData["rb_1"] = {
        x: -(x_start - n - dist_side),
        y: y_start - dist_top,
        z: 0
      }
      jsonData["rb_2"] = {
        x: -(x_start - n),
        y: y_start - 15 / this.scale,
        z: 0
      }
      jsonData["rb_3"] = {
        x: -(x_start - n - dist_side - interval),
        y: y_start - 15 / this.scale,
        z: 0
      }

     
      this.node.drawLineDim(jsonData["rb_2"], jsonData["rb_1"], 1, Math.round(dist_side * this.scale), false, 6, 2, 1);
      if(quantity>1){
        this.node.drawLineDim(jsonData["rb_3"], jsonData["rb_1"], 1, Math.round(interval * this.scale), false, 6, 2, 1);
      }
    }

    // dimenstions for rebar_type = 1
    let arr_rebar_type_1 = []
    this.node.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if (data.rebar_type === 1) {
        arr_rebar_type_1.push(data)
      }
    })
    arr_rebar_type_1.sort((a, b) => b.dist_top - a.dist_top)
    const rebar_type_1 = arr_rebar_type_1[0];

    if (rebar_type_1 != undefined) {
        const dist_top2 = rebar_type_1.dist_top / this.scale;
        const dist_side2 = rebar_type_1.dist_side / this.scale;
        const quantity2 = rebar_type_1.quantity;
        const interval2 = (b - 2 * dist_side2) / (quantity2 - 1);
        jsonData["rb_7"] = {
          x: -(x_start - n - dist_side2),
          y: -(y_start),
          z: 0
        }
        jsonData["rb_8"] = {
          x: -(x_start - n - dist_side2 - interval2),
          y: -(y_start),
          z: 0
        }
        this.node.drawLineDim(jsonData["5"], jsonData["rb_7"], 1, Math.round(dist_side2 * this.scale), false, 6, -2, 1);
        if(quantity2>1){
          this.node.drawLineDim(jsonData["rb_7"], jsonData["rb_8"], 1, Math.round(interval2 * this.scale), false, 6, -2, 1);
        }
      }

    // dimenstions for rebar_type = 0 & 1
    const arr_gap01 = this.getArrGap(1,h)
    //draw line rebar_type = 1
    if (arr_gap01.length >0){  
      let y = 0;
      for(let i = 0; i< arr_gap01.length ; i++){        
        jsonData[`rb0_${i}`]= {
          x:  -(x_start),
          y:  (y_start - y - arr_gap01[i]),
          z: 0
        }
        if(i == 0)
          this.node.drawLineDim(jsonData["8"], jsonData[`rb0_${i}`], 0, Math.round(arr_gap01[i] * this.scale), true, 6, 10, 1);
        else
        this.node.drawLineDim(jsonData[`rb0_${i - 1}`], jsonData[`rb0_${i}`], 0, Math.round(arr_gap01[i] * this.scale), true, 6, 10, 1);
          
        y += arr_gap01[i];
      }    

    }

    // dimenstions for rebar_type = 4
    const arr_gap04 = this.getArrGap(4,h)  
    //draw line rebar_type = 4
    jsonData["1.1"] = {
      x: x_start - n,
      y:jsonData["1"].y,
      z:0
    }
    if (arr_gap04.length > 0) {
      let y = 0;
      for(let i = 0; i< arr_gap04.length ; i++){        
        jsonData[`rb4_${i}`]= {
          x:  x_start - n,
          y:  (y_start - y - arr_gap04[i]),
          z: 0
        }
        if(i == 0)
          this.node.drawLineDim(jsonData["1.1"], jsonData[`rb4_${i}`], 0, Math.round(arr_gap04[i] * this.scale), true, 6, 2, 0);
        else
        this.node.drawLineDim(jsonData[`rb4_${i - 1}`], jsonData[`rb4_${i}`], 0, Math.round(arr_gap04[i] * this.scale), true, 6, 2, 0);
          
        y += arr_gap04[i];
      }    

    }
    let dist_side_min = 0;
    this.node.dataRebar.selectedCalPoint.rebar0.map((data) =>{    
      if(data.rebar_type == 4){
      } 
      if(data.rebar_type === 4 && data.dist_top  === Math.round(arr_gap04[0] * this.scale)){               
        dist_side_min = data.dist_side/this.scale;
      }
    })
    jsonData["rb_4"] = {
      x: x_start - n,
      y: y_start  - arr_gap04[0],
      z:0
    }
    jsonData["2.1"] = {
      x: x_start - n - dist_side_min,
      y: y_start - arr_gap04[0],
      z:0
    }
    this.node.drawLineDim(jsonData["rb_4"], jsonData["2.1"], 1, Math.round(dist_side_min * this.scale), false, 6, 2, 0);
  }
  getArrGap(type:number,h:any){
    const arr_gap =[]
    const arr_dis_top=[]
    this.node.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if(type ===1){
        if (data.rebar_type === 0 || data.rebar_type === type) {
          arr_dis_top.push(data.dist_top / this.scale)
        }
      }else{
        if ( data.rebar_type === type) {
          arr_dis_top.push(data.dist_top / this.scale)
        }
      }
    })
    arr_dis_top.sort((a,b)=>a-b)
    for (let i = 0; i <= arr_dis_top.length; i++) {
      if (i === 0) {
        arr_gap.push(arr_dis_top[i])
      }
      if (i === arr_dis_top.length) {
        arr_gap.push(h  - arr_dis_top[i - 1])
      }
      if (i !== 0 && i !== arr_dis_top.length) {
        arr_gap.push(arr_dis_top[i] - arr_dis_top[i - 1])
      }
    }
    return arr_gap
  }
  drawPointTShape(bt: any, h: any, b: any, t: any,type:any){
 
    let dataPoint = []
    let n =( bt  - b) / 2
    let color = type === 4 ? 0xfafafa : 0x000000
    this.node.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if (data.rebar_type === type) {
        dataPoint.push(data)
      }
    })
    
    dataPoint.map((data,index)=>{
      this.geometry = data.dia === null || data.dia === "null" ? new THREE.SphereBufferGeometry(0) : new THREE.SphereBufferGeometry(+data.dia / 2 / this.scale)
      let interval=0
      for (let i = 1; i <= data.quantity;i++){
        const mesh = new THREE.Mesh(this.geometry,
          new THREE.MeshBasicMaterial({ color: color }));
        mesh.name = 'node' + index + i;
        mesh.position.x = -(bt / 2- n - data.dist_side / this.scale - interval);
        mesh.position.y = h / 2 - data.dist_top / this.scale;
        mesh.position.z = 0;
        this.node.nodeList.children.push(mesh);
        interval += (b - 2 * data.dist_side / this.scale) / (data.quantity - 1);
      }
    })
  }
  createDemoRectangle() {
    var member = this.memmber.getData(this.node.dataRebar.selectedCalPoint.m_no);
    let memH = member['H'];
    let memB = member['B'];
    var arr = [memH, memB];
    let max_val = arr.reduce(function (accumulator, element) {
      return (accumulator > element) ? accumulator : element
    });
    this.scale = max_val / 88;
    this.createRectangle(memB / this.scale, memH / this.scale, 0xb9b9b9) 
    this.scene.render()
  }
  createRectangle(b: any, h: any, color: any) {
    let geometry: any = new THREE.PlaneGeometry(b, h);
    const materialPlane = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, materialPlane);
    plane.position.set(0, 0, 0);
    this.convertToCoordinatesTShape(b, h, b, h);
    this.drawPointTShape(b, h, b, h,0)
    this.drawPointTShape(b, h, b, h, 4)
    this.drawPointTShape(b, h, b, h, 1)

    this.scene.add(plane);
  }
  createLineRectangle(b: any, h: any, ranger: any, color: any,) {
    const material = new THREE.LineBasicMaterial({ color: color })
    let pointsLine1: any = []
    let pointsLine2: any = []
    let pointsLine3: any = []
    let pointsLine4: any = []

    let line1: any
    let line2: any
    let line3: any
    let line4: any

    let curve1: any
    let curve2: any
    let curve3: any
    let curve4: any

    let ellipse1: any
    let ellipse2: any
    let ellipse3: any
    let ellipse4: any

    curve1 = new THREE.EllipseCurve(
      b / 2 - 2 * ranger, h / 2 - 2 * ranger,
      ranger, ranger,
      0, Math.PI / 2,
      false,
      0
    );
    ellipse1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve1.getPoints(100)), material);

    curve2 = new THREE.EllipseCurve(
      -Math.abs(b / 2 - 2 * ranger), h / 2 - 2 * ranger,
      ranger, ranger,
      Math.PI / 2, Math.PI,
      false,
      0
    );
    ellipse2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve2.getPoints(100)), material);

    curve3 = new THREE.EllipseCurve(
      -Math.abs(b / 2 - 2 * ranger), -Math.abs(h / 2 - 2 * ranger),
      ranger, ranger,
      Math.PI, 3 * Math.PI / 2,
      false,
      0
    );
    ellipse3 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve3.getPoints(100)), material);

    curve4 = new THREE.EllipseCurve(
      b / 2 - 2 * ranger, -Math.abs(h / 2 - 2 * ranger),
      ranger, ranger,
      3 * Math.PI / 2, 2 * Math.PI,
      false,
      0
    );
    ellipse4 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve4.getPoints(100)), material);

    pointsLine1.push(new THREE.Vector3(Math.abs(b / 2 - 2 * ranger), Math.abs(h / 2 - ranger), 0));
    pointsLine1.push(new THREE.Vector3(-Math.abs(b / 2 - 2 * ranger), Math.abs(h / 2 - ranger), 0));

    pointsLine2.push(new THREE.Vector3(Math.abs(b / 2 - 2 * ranger), -Math.abs(h / 2 - ranger), 0));
    pointsLine2.push(new THREE.Vector3(-Math.abs(b / 2 - 2 * ranger), -Math.abs(h / 2 - ranger), 0));

    pointsLine3.push(new THREE.Vector3(-Math.abs(b / 2 - ranger), Math.abs(h / 2 - 2 * ranger), 0));
    pointsLine3.push(new THREE.Vector3(-Math.abs(b / 2 - ranger), -Math.abs(h / 2 - 2 * ranger), 0));

    pointsLine4.push(new THREE.Vector3(Math.abs(b / 2 - ranger), Math.abs(h / 2 - 2 * ranger), 0));
    pointsLine4.push(new THREE.Vector3(Math.abs(b / 2 - ranger), -Math.abs(h / 2 - 2 * ranger), 0));

    line1 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pointsLine1),
      material
    );

    line2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pointsLine2),
      material
    );

    line3 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pointsLine3),
      material
    );

    line4 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pointsLine4),
      material
    );

    this.scene.add(line1)
    this.scene.add(line2)
    this.scene.add(line3)
    this.scene.add(line4)
    this.scene.add(ellipse1);
    this.scene.add(ellipse2);
    this.scene.add(ellipse3);
    this.scene.add(ellipse4);
  }
}
