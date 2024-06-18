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
  
  private drawLineDim(ni: any, nj: any, style: number, title: any, vertical: boolean, lenDim: any, distanceDim: any, distance: any) {
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
  
  createDemoTShape() {
    var member = this.memmber.getData(this.dataRebar.selectedCalPoint.m_no);
    let memH = member['H'];
    let memBt = member['Bt'];
    let memB = member['B'];
    let memt = member['t'];
    var arr = [memH, memBt, memB, memt];
    let max_val = arr.reduce(function (accumulator, element) {
      return (accumulator > element) ? accumulator : element
    });
    this.scale = max_val / 88;
    let haucnch_M = this.dataRebar.selectedCalPoint.haucnch_M;
    if (!!haucnch_M) memH = memH + haucnch_M;
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
      this.drawLineDim(jsonData["1"], jsonData["2"], 0, Math.round(t * this.scale), true, 6, 4, 1);
    }    
    this.drawLineDim(jsonData["1"], jsonData["4"], 0, Math.round(h * this.scale), true, 8, 1, 4);
    
    this.drawLineDim(jsonData["1"], jsonData["8"], 1, Math.round(bt * this.scale), false, 8, 1, 4);
    if(b != bt){
      this.drawLineDim(jsonData["4"], jsonData["5"], 1, Math.round(b * this.scale), false, 3, 0, 9);
    }

    // dimenstions for rebar_type = 0
    let arr_rebar_type_0 = []
    this.dataRebar.selectedCalPoint.rebar0.map((data)=>{
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

     
      this.drawLineDim(jsonData["rb_2"], jsonData["rb_1"], 1, Math.round(dist_side * this.scale), false, 6, 2, 1);
      if(quantity>1){
        this.drawLineDim(jsonData["rb_3"], jsonData["rb_1"], 1, Math.round(interval * this.scale), false, 6, 2, 1);
      }
    }

    // dimenstions for rebar_type = 1
    let arr_rebar_type_1 = []
    this.dataRebar.selectedCalPoint.rebar0.map((data) => {
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
        this.drawLineDim(jsonData["5"], jsonData["rb_7"], 1, Math.round(dist_side2 * this.scale), false, 6, -2, 1);
        if(quantity2>1){
          this.drawLineDim(jsonData["rb_7"], jsonData["rb_8"], 1, Math.round(interval2 * this.scale), false, 6, -2, 1);
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
          this.drawLineDim(jsonData["8"], jsonData[`rb0_${i}`], 0, Math.round(arr_gap01[i] * this.scale), true, 6, 10, 1);
        else
        this.drawLineDim(jsonData[`rb0_${i - 1}`], jsonData[`rb0_${i}`], 0, Math.round(arr_gap01[i] * this.scale), true, 6, 10, 1);
          
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
          this.drawLineDim(jsonData["1.1"], jsonData[`rb4_${i}`], 0, Math.round(arr_gap04[i] * this.scale), true, 6, 2, 0);
        else
        this.drawLineDim(jsonData[`rb4_${i - 1}`], jsonData[`rb4_${i}`], 0, Math.round(arr_gap04[i] * this.scale), true, 6, 2, 0);
          
        y += arr_gap04[i];
      }    

    }
    let dist_side_min = 0;
    this.dataRebar.selectedCalPoint.rebar0.map((data) =>{    
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
    this.drawLineDim(jsonData["rb_4"], jsonData["2.1"], 1, Math.round(dist_side_min * this.scale), false, 6, 2, 0);
  }
  getArrGap(type:number,h:any){
    const arr_gap =[]
    const arr_dis_top=[]
    this.dataRebar.selectedCalPoint.rebar0.map((data) => {
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
    this.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if (data.rebar_type === type) {
        dataPoint.push(data)
      }
    })
    
    dataPoint.map((data,index)=>{
      this.geometry = new THREE.SphereBufferGeometry(data.dia/2/this.scale)
      let interval=0
      for (let i = 1; i <= data.quantity;i++){
        const mesh = new THREE.Mesh(this.geometry,
          new THREE.MeshBasicMaterial({ color: color }));
        mesh.name = 'node' + index + i;
        mesh.position.x = -(bt / 2- n - data.dist_side / this.scale - interval);
        mesh.position.y = h / 2 - data.dist_top / this.scale;
        mesh.position.z = 0;
        this.nodeList.children.push(mesh);
        interval += (b - 2 * data.dist_side / this.scale) / (data.quantity - 1);
      }
    })
  }
  createDemoRectangle() {
    var member = this.memmber.getData(this.dataRebar.selectedCalPoint.m_no);
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

  createDemoOval() {
    var member = this.memmber.getData(this.dataRebar.selectedCalPoint.m_no);
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
      this.dataRebar.selectedCalPoint.rebar0.map((data) => {
        if (data.rebar_type === 2 || data.rebar_type === 3) {
          this.createArcDashedOVal(memB / this.scale, memH / this.scale, data.cover / this.scale, 0x333D46, this.type, data.rebar_type)
        }
      })
    } else {
      this.createOval(memB / this.scale, memH / this.scale, 0xb9b9b9, this.type)
      // this.createLineOval(memB / this.scale, memH / this.scale, 10 / this.scale, 0x333D46, this.type)
      this.createLineDashedOval(memB / this.scale, memH / this.scale, 0x333D46, this.type)
      this.dataRebar.selectedCalPoint.rebar0.map((data) => {
        if (data.rebar_type === 5) {
          this.createArcDashedOVal(memB / this.scale, memH / this.scale, data.cover / this.scale, 0x333D46, this.type, data.rebar_type)
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
      this.convertToCoordinatesVericalOval(b, h);
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
  convertToCoordinatesVericalOval(b: any, h: any) {
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
    this.drawLineDim(jsonData["1"], jsonData["2"], 0, Math.round(h * this.scale), true, x_start + 10, 4, 1);
    this.drawLineDim(jsonData["3"], jsonData["4"], 1, Math.round(b * this.scale), false, y_start / 2 - 2, 8, -1);
    
    //rebar type 2 , 3;
    let arr_rebar_type2 = [];
    this.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if (data.rebar_type === 2 || data.rebar_type === 3) {
        arr_rebar_type2.push(data)
      }
    })
    arr_rebar_type2.sort((a, b) => a.dist_top - b.dist_top)
    let start_cover = 0;
    
    arr_rebar_type2.map((data, index) => {
      const cover = data.cover / this.scale;     
      jsonData[`rb2_${index}`] = {
        x: -2,
        y: y_start - cover,
        z: 0
      }    
      if(index == 0)  
        this.drawLineDim(jsonData["1"], jsonData[`rb2_${0}`], 0, Math.round(cover * this.scale), true, x_start + 10, (x_start + 10)* 2 - 5, 1);   
      else 
        this.drawLineDim(jsonData[`rb2_${index-1}`], jsonData[`rb2_${index}`], 0, Math.round(cover * this.scale - start_cover), true, x_start + 10, (x_start + 10)* 2 - 5, 1);      
      
      if(index == arr_rebar_type2.length - 1)
        this.drawLineDim(jsonData["2"], jsonData[`rb2_${index}`], 0, Math.round(h*this.scale - cover * this.scale), true, x_start + 10, (x_start + 10)* 2 - 5, 1); 
      start_cover = cover * this.scale;
    })
  }
  convertToCoordinatesHorizontalOval(b: any, h: any) {
    let jsonData: object = {};
    const x_start = b / 2;
    const y_start = h / 2
    if (b != 0 && h != 0) {
      jsonData["1"] = {
        x: 3*x_start/4,
        y: y_start,
        z: 0
      }
      jsonData["2"] = {
        x: 3*x_start/4,
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
    this.drawLineDim(jsonData["1"], jsonData["2"], 0, Math.round(h * this.scale), true, x_start / 2 , 3, 0);
    this.drawLineDim(jsonData["3"], jsonData["4"], 1, Math.round(b * this.scale), false, y_start , 7, 0);
    
     // dimenstions for rebar_type = 0
     let arr_rebar_type_0 = []
     this.dataRebar.selectedCalPoint.rebar0.map((data)=>{
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
       jsonData["rb0_1"] = {
         x: -(x_start/2),
         y: y_start + 2,
         z: 0
       }
       jsonData["rb0_2"] = {
         x: -(x_start/2) + dist_top,
         y: y_start + 2,
         z: 0
       }
       jsonData["rb0_3"] = {
         x: -(x_start/2) + dist_top + interval,
         y: y_start + 2,
         z: 0
       }
      
       this.drawLineDim(jsonData["rb0_2"], jsonData["rb0_1"], 1, Math.round(dist_side * this.scale), false, 6, 2, 1);
       if(quantity>1){
         this.drawLineDim(jsonData["rb0_2"], jsonData["rb0_3"], 1, Math.round(interval * this.scale), false, 6, 2, 1);
       }
     }
     let arr_rebar_type_1 = []
    this.dataRebar.selectedCalPoint.rebar0.map((data) => {
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
        jsonData["rb1_1"] = {
          x: -(x_start/2),
          y: -(y_start + 2),
          z: 0
        }
        jsonData["rb1_2"] = {
          x: -(x_start/2 - dist_side2),
          y: -(y_start + 2),
          z: 0
        }
        jsonData["rb1_3"] = {
          x: -(x_start/2  - dist_side2 - interval2),
          y: -(y_start+2),
          z: 0
        }
        this.drawLineDim(jsonData["rb1_1"], jsonData["rb1_2"], 1, Math.round(dist_side2 * this.scale), false, 6, -2, 1);
        if(quantity2>1){
          this.drawLineDim(jsonData["rb1_2"], jsonData["rb1_3"], 1, Math.round(interval2 * this.scale), false, 6, -2, 1);
        }
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
          Math.abs(range - (h - b / 2)), Math.abs(range - (h - b / 2)),
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
    this.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if (data.rebar_type === typeRebar) {
        dataPoint.push(data)
      }
    })
    dataPoint.map((data, index) => {
      this.geometry = new THREE.SphereBufferGeometry(data.dia / 2 / this.scale)
      let interval = 0
      if (typeRebar===5){

      }
      for (let i = 1; i <= data.quantity; i++) {
        const mesh = new THREE.Mesh(this.geometry,
          new THREE.MeshBasicMaterial({ color: color }));
        const mesh2 = new THREE.Mesh(this.geometry,
          new THREE.MeshBasicMaterial({ color: color }));
        if (typeRebar === 6 && type === "Vertical") {
          mesh.name = 'node6' + index + i;
          mesh.position.x = -(b / 2 - data.dist_side / this.scale - interval);
          mesh.position.y = h / 2 - data.dist_top / this.scale;
          mesh.position.z = 0;
          this.nodeList.children.push(mesh);
          interval += (b - 2 * data.dist_side / this.scale) / (data.quantity - 1);
        }
        if ((typeRebar === 2 || typeRebar === 3  ) && type === "Vertical") {
          mesh.name = typeRebar === 2 ? 'node2' + index + i : 'node3' + index + i;
          let centerY = typeRebar === 2 ? h / 2 - b / 2 : -(h / 2 - b / 2)
          let radius = typeRebar === 2 ? b / 2 - data.cover / this.scale : data.cover / this.scale - (h - b / 2)
          let coordinate = this.getPointOnCircle(0, centerY, radius , interval);
          mesh.position.x = -coordinate.x;
          mesh.position.y = coordinate.y;
          mesh.position.z = coordinate.z;
          this.nodeList.children.push(mesh);
          if(typeRebar===2){
            interval += Math.PI / (data.quantity - 1) 
          }else{
            interval -= Math.PI / (data.quantity - 1) 
          }
        }
        if ((typeRebar === 0 || typeRebar === 1) && type !== "Vertical") {
          mesh.name = typeRebar === 0 ? 'node0' + index + i : 'node1' + index + i;
          mesh.position.x = -(b / 2 - h / 2 - data.dist_side / this.scale - interval);
          mesh.position.y = h / 2 - data.dist_top / this.scale;
          mesh.position.z = 0;
          this.nodeList.children.push(mesh);
          interval += (b - h - 2 * data.dist_side / this.scale) / (data.quantity - 1);
        }
        if (typeRebar === 5 && type !== "Vertical") {
          mesh.name =  'node5_1' + index + i 
          mesh2.name = 'node5_2' + index + i 
          let centerX1 =  -(h / 2 - b / 2) 
          let centerX2 = h / 2 - b / 2
          let radius = h / 2 - data.cover / this.scale 
          let coordinate1 = this.getPointOnCircle(centerX1, 0, radius, interval - Math.PI / 2);
          let coordinate2 = this.getPointOnCircle(centerX2, 0, radius, interval + Math.PI / 2);

          mesh.position.x = -coordinate1.x;
          mesh.position.y = coordinate1.y;
          mesh.position.z = coordinate1.z;

          mesh2.position.x = -coordinate2.x;
          mesh2.position.y = coordinate2.y;
          mesh2.position.z = coordinate2.z;
          this.nodeList.children.push(mesh);
          this.nodeList.children.push(mesh2);
          interval += Math.PI / (data.quantity - 1)
        }
      }
    })
  }
public getPointOnCircle(centerX, centerY, radius, angle) {
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);
  const z = 0
  return { x, y, z };
}
  createDemoCircleRing() {
    var member = this.memmber.getData(this.dataRebar.selectedCalPoint.m_no);
    let memH = member['H'];
    let memB = member['B'];
    
    // // fix data
    // this.dataRebar.selectedCalPoint.rebar0 = [ 
    //   {
    //     rebar_type: 7,
    //     dia: 32,
    //     quantity: 6,
    //     dist_side: 100,
    //   },
    //   {
    //     rebar_type: 7,
    //     dia: 19,
    //     quantity: 10,
    //     dist_side: 200,
    //   }
    // ]
    let arr_rebar_type_7 = []
    this.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if (data.rebar_type === 7) {
        arr_rebar_type_7.push(data)
      }
    })
    arr_rebar_type_7.sort((a, b) => a.dist_top - b.dist_top)
    const rebar_type_7_0 = arr_rebar_type_7[0];
    const rebar_type_7_1 = arr_rebar_type_7[1];

    // let memH = 250;
    // let memB = 900;

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
    // this.createLineCircleRing(0x333D46, 50 / this.scale, memB / this.scale)
    this.createLineDashCircleRing(0x333D46, rebar_type_7_0.dist_side / this.scale, rebar_type_7_1.dist_side / this.scale, memB / this.scale)
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
  createLineDashCircleRing(color: any, range1: any, range2: any, b: any) {
    const material = new THREE.LineDashedMaterial({ color: color, dashSize: 1, gapSize: 1 })

    let points1: any
    let curve1: any
    let ellipse1: any

    let points2: any
    let curve2: any
    let ellipse2: any

    curve1 = new THREE.EllipseCurve(
      0, 0,
      Math.abs(b / 2 - range1), Math.abs(b / 2 - range1),
      0, 2 * Math.PI,
      false,
      0
    );
    curve2 = new THREE.EllipseCurve(
      0, 0,
      Math.abs(b / 2 - range2), Math.abs(b / 2 - range2),
      0, 2 * Math.PI,
      false,
      0
    );

    points1 = curve1.getPoints(100);
    ellipse1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points1), material);
    ellipse1.computeLineDistances();

    points2 = curve2.getPoints(100);
    ellipse2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points2), material);
    ellipse2.computeLineDistances();

    this.scene.add(ellipse1)
    this.scene.add(ellipse2)
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
      this.drawLineDim(jsonData["1.1"], jsonData["2.1"], 1, Math.round(h * this.scale), false, 5, 0, 0);
    }

    // Line dim for rebar0
    let arr_rebar_type_7 = []
    this.dataRebar.selectedCalPoint.rebar0.map((data)=>{
      if (data.rebar_type === 7) {
        arr_rebar_type_7.push(data)
      }
    })
    arr_rebar_type_7.sort((a, b) => a.dist_top - b.dist_top)
    const rebar_type_7_0 = arr_rebar_type_7[0];
    const rebar_type_7_1 = arr_rebar_type_7[1];
    let dist_side1 = rebar_type_7_0.dist_side / this.scale
    let dist_side2 = rebar_type_7_1.dist_side / this.scale
    jsonData["3"] = {
      x: x_start,
      y: 0,
      z: 0,
    }
    jsonData["4"] = {
      x: x_start - dist_side1,
      y: 0,
      z: 0,
    }
    jsonData["5"] = {
      x: x_start - dist_side2,
      y: 0,
      z: 0,
    }
    this.drawLineDim(jsonData["1"], jsonData["2"], 1, Math.round(b * this.scale), false, x_start * 2 / 3 , 12, 0);
    this.drawLineDim(jsonData["3"], jsonData["4"], 1, Math.round(rebar_type_7_0.dist_side), false, x_start, -20, -1);
    this.drawLineDim(jsonData["4"], jsonData["5"], 1, Math.round(rebar_type_7_1.dist_side - rebar_type_7_0.dist_side), false, x_start, -20, -1);
    
  }
  drawPointCircleShape(b: any, type: any){
    let dataPoint = []
    let color = 0x000000

    this.dataRebar.selectedCalPoint.rebar0.map((data) => {
      if (data.rebar_type === type) {
        dataPoint.push(data)
      }
    })

    dataPoint.map((data,index)=>{
      let geometry = new THREE.SphereBufferGeometry(data.dia / 2 / this.scale)
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
        this.nodeList.children.push(mesh);
      }
    })
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
