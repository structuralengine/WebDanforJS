import { Injectable } from '@angular/core';
import { InputMembersService } from '../../members/members.service';
import { SceneService } from '../scene.service';
import * as THREE from 'three';
import { CSS2DObject } from "../libs/CSS2DRenderer.js";
@Injectable({
  providedIn: 'root'
})
export class ThreeNodeService { 
  public dataNode: any[];
  public memNo: number;
  public geometry: THREE.SphereBufferGeometry;
  public nodeList: THREE.Object3D;
  public memberList: THREE.Object3D;
  constructor(   
    private memmber: InputMembersService,
    private scene:SceneService
  ) {   
   
    this.memNo = 0;
    this.dataNode = new Array();
    this.memberList = new THREE.Object3D();
    this.scene.add(this.memberList);    
  }
  public onInit(): void{
    for (const mesh of this.nodeList.children) {
      mesh.getObjectByName("font").visible = true;
    }
    this.scene.render();
  }
  public getJson() {
    const scale = 50;
    const memNo = this.memNo;
    if(memNo == 0) return;
    let jsonData: object = {};    
    var member = this.memmber.getData(memNo);
    const b = member['B'] / scale;
    const h = member['H'] / scale;
    const bt = member['Bt'] / scale;
    const t = member['t'] / scale;
    const n = (bt - b) / 2;
    const x_start = -bt/2;
    const y_start = -h/2
    if (b != null && h != null && bt != null && t != null) {
      jsonData["1"] = {
        x: x_start,
        y: y_start,
        z: 0
      }
      jsonData["2"] = {
        x: 0 + x_start,
        y: t + y_start,
        z: 0
      }
      jsonData["3"] = {
        x: n + x_start,
        y: t+ y_start,
        z: 0
      }
      jsonData["4"] = {
        x: n+ x_start,
        y: h+ y_start,
        z: 0
      }
      jsonData["5"] = {
        x: bt - n + x_start,
        y: h+ y_start,
        z: 0
      }

      jsonData["6"] = {
        x: n + b + x_start,
        y: t+ y_start,
        z: 0
      }
      jsonData["7"] = {
        x: bt+ x_start,
        y: t+ y_start,
        z: 0
      }
      jsonData["8"] = {
        x: bt+ x_start,
        y: 0+ y_start,
        z: 0
      }
    }
    let startNode = 8;
    //drawing node rebar1
    let rebar1 = this.dataNode['rebar1'];
    let rb_n1 = rebar1['rebar_n'];
    if (rb_n1 != null) {
      let rb1_line = rebar1['rebar_lines'];
      if (rb1_line == null) rb1_line = rb_n1;      
      if (rb_n1 != undefined && rb_n1 != null) {       
        let r = 1;
        const numrow = Math.ceil(rb_n1/rb1_line) ;
        while (rb1_line > 0 && r <= numrow) {
          const tt_len_rb1 = ((rb1_line - 1) * rebar1['rebar_ss']) / scale;
          let st_rb1 = (bt - tt_len_rb1) / 2;
          if(tt_len_rb1 <= 0 && rb1_line > 1) break;
          for (let i = 0; i < rb1_line; i++) {
            startNode++;
            jsonData[`${startNode}`] = {
              x: st_rb1 + (rebar1['rebar_ss'] * i) / scale + x_start,
              y: rebar1['rebar_cover'] / scale + y_start + (rebar1['rebar_space'] *(r-1))/scale,
              z: 0
            }
          }
          rb_n1 = rb_n1 - rb1_line;
          if(rb1_line > rb_n1)  rb1_line= rb_n1  
          r++;
        }
        
      }
    }

    //drawing rebar 2
    let rebar2 = this.dataNode['rebar2'];
    let rb_n2 = rebar2['rebar_n'];
    if (rb_n2 != null) {
      let rb2_line = rebar2['rebar_lines'];
      if (rb2_line == null) rb2_line = rb_n2;
      if (rb_n2 != undefined && rb_n2 != null) {
        let r = 1;
        const numrow = Math.ceil(rb_n2/rb2_line) ;
        while (rb2_line > 0 && r <= numrow) {
          const total_length = ((rb2_line - 1) * rebar2['rebar_ss']) / scale;
          let start_x = (b - total_length) / 2;
          if(total_length <= 0 && rb2_line > 1) break;
          for (let i = 0; i < rb2_line; i++) {
            startNode++;
            jsonData[`${startNode}`] = {
              x: n + start_x + (rebar2['rebar_ss'] * (i)) / scale + x_start,
              y: h - ((rebar2['rebar_cover'] / scale) + (rebar2['rebar_space'] *(r-1))/scale )+ y_start,
              z: 0
            }
          }          
          rb_n2 = rb_n2 - rb2_line;
          if(rb2_line > rb_n2)  rb2_line= rb_n2   
          r++;
        }
      }
    }
    //drawing sidebar 1
    var objectKey = Object.keys(this.dataNode);
    if (!objectKey.includes("sidebar")) {
      let sidebar2 = this.dataNode['sidebar2'];
      const sb_cover_2 = sidebar2['side_cover'] / scale;
      let kc = n + sb_cover_2;
      let sidebar1 = this.dataNode['sidebar1'];
      const sb_n2 = sidebar1['side_n'];
      if (sb_n2 != null && sb_cover_2 != null) {
        for (let i = 0; i < sb_n2; i++) {
          jsonData[`${9 + i + rb_n1 + sb_n2}_s`] = {
            x: kc+ x_start,
            y: (sidebar1['side_cover'] / scale) + i * (sidebar1['side_ss'] / scale)+ y_start,
            z: 0
          }
          jsonData[`${9 + i + rb_n1 + sb_n2}_s1`] = {
            x: (n + b - sb_cover_2)+ x_start,
            y: (sidebar1['side_cover'] / scale) + i * (sidebar1['side_ss'] / scale)+ y_start,
            z: 0
          }
        }
      }
    } else {
      let sidebar = this.dataNode['sidebar'];
      const sb_n2 = sidebar['side_n'];
      if (sb_n2 != null) {
        for (let i = 0; i <sb_n2; i++) {
          jsonData[`${9 + i + rb_n1 + sb_n2}_s`] = {
            x: n+ x_start,
            y: (sidebar['side_cover'] / scale) + i * (sidebar['side_ss'] / scale)+ y_start,
            z: 0
          }
          jsonData[`${9 + i  + rb_n1 + sb_n2}_s1`] = {
            x: (n + b)+ x_start,
            y: (sidebar['side_cover'] / scale) + i * (sidebar['side_ss'] / scale)+ y_start,
            z: 0
          }
        }
      }

    }
    console.log(jsonData);
    return jsonData;
  }

  public changeData(): object {
    const jsonData = this.getJson();
    const jsonKeys = Object.keys(jsonData);
    let data: any = [];
    if (jsonKeys.length <= 0) {
      return null;
    }
    for (const key of jsonKeys) {
      if(!key.includes("s"))
        data.push({ x: jsonData[key].x,  y: jsonData[key].y, z: jsonData[key].z })
    }  
    return data;
  }
  public changeDataSide(): object {
    const jsonData = this.getJson();
    const jsonKeys = Object.keys(jsonData);
    let data: any = [];
    if (jsonKeys.length <= 0) {
      return null;
    }
    for (const key of jsonKeys) {
      if(key.includes("s"))
        data.push({ x: jsonData[key].x,  y: jsonData[key].y, z: jsonData[key].z })
    }
  
    return data;
  }



  createDrawingLine() {       
  
    let jsonData: any = this.changeData() as [];
   
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const points = [];
    
    const arrPanel = [
      [1, 2, 7, 8],
      [3, 4, 5, 6]
    ]
    arrPanel.forEach(item => {
      const vertexlist = [];
      item.forEach(i => {
        const n = jsonData[i-1]
        const x = n.x;
        const y = n.y;
        const z = n.z;
        vertexlist.push([x, -y, z])
      })
      this.createPanel(vertexlist, arrPanel.indexOf(item));
    })
    let dem = 0;
    jsonData.forEach(x => {
      dem ++;
      if(dem <= 8){
        points.push(new THREE.Vector3(x['x'], -x['y'], x['z']));        
      }       
    })  
    let x = jsonData[0];
    points.push(new THREE.Vector3(x['x'], -x['y'], x['z']));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      material
    );   
    this.scene.add(line); 
    const len = this.getLength(jsonData[0], jsonData[7]); 
    this.drawLineDemension(x, len)
    for(let i=8; i < jsonData.length;i++){    
      try{
        const mesh = new THREE.Mesh(this.geometry,
          new THREE.MeshBasicMaterial({ color: 0x000000 }));
        mesh.name = 'node' + i;
        mesh.position.x = jsonData[i]['x'];
        mesh.position.y = -jsonData[i]['y'];
        mesh.position.z = jsonData[i]['z'];
        this.nodeList.children.push(mesh);
      }catch{
        console.log(jsonData)
      }
     
    }  

    const jsonSide = this.changeDataSide() as [];
    for(let i=0; i< jsonSide.length;i++){    
       
      const mesh1 = new THREE.Mesh(this.geometry,
        new THREE.MeshBasicMaterial({ color: 0xfafafa }));
      mesh1.name = 'nodeSide' + i;
      mesh1.position.x = jsonSide[i]['x'];
      mesh1.position.y = -jsonSide[i]['y'];
      mesh1.position.z = jsonSide[i]['z'];
      this.nodeList.children.push(mesh1);
    }  
    this.scene.render() 
  }

  private createPanel(vertexlist, row): void {

    const points = []
    const geometrys: THREE.BufferGeometry[] = [];
    for(const p of vertexlist){
      points.push(new THREE.Vector3(p[0], p[1], p[2]))
    }
    // 三角形を作る
    geometrys.push(new THREE.BufferGeometry().setFromPoints([points[0],points[1],points[2]]));
    // 四角形が作れる場合
    if(points.length > 3)
      geometrys.push(new THREE.BufferGeometry().setFromPoints([points[3],points[0],points[2]]));

    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      color: 0x7f8F9F,
      opacity: 0.7,
    });

    for(const g of geometrys) {
      const mesh = new THREE.Mesh(g, material);
      mesh.name = 'panel-' + row.toString();      
      this.scene.add(mesh);
    }
  }
  private drawLineDemension(pointStart: any, length: number ){
    let points = [];
    const point = pointStart as [];
    const x = point['x'];
    const y = Math.abs(point['y']);
    const z = point['z'];
    points.push(new THREE.Vector3(x , (y + 1), z));
    points.push(new THREE.Vector3(x , (y + 8), z));
    points.push(new THREE.Vector3(x , (y + 4), z));
    points.push(new THREE.Vector3(x + length , (y + 4), z));
    points.push(new THREE.Vector3(x + length , (y + 1), z));
    points.push(new THREE.Vector3(x + length , (y + 8), z));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x000000 })
    );   
    const vect = new THREE.Vector3(length, 0, 0);
    const geometry = new THREE.CylinderBufferGeometry(1, 1, vect.length(), 12);

    // 要素をシーンに追加
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    mesh.name = "member" + 1; 
    mesh.rotation.z = Math.acos(0);
    mesh.rotation.y = 0.5 * Math.PI + Math.atan2(length, 0);
    mesh.position.set(x +length/2, y + 4, z);  

    // 文字をシーンに追加
    const div = document.createElement("div");
    div.className = "label";
    div.textContent = "1dssajfhdsjafhasjdghdjasghjdhgjashgajshd";
    div.style.marginTop = "-1em";
    div.style.backgroundColor = '#FF0000';
    div.style.color='#FF0000'
    const label = new CSS2DObject(div);

    label.position.set(0, 0, 0);
    label.name = "font";
    label.visible = true;
    mesh.add(label);
    mesh.scale.set(0.2,1,0.2);
    //this.scene.add(line);  
    this.nodeList.children.push(mesh);
    this.scene.render()
  }
  private  getLength(iPos: any, jPos: any){
    const xi: number = iPos['x'];
    const yi: number = iPos['y'];
    const zi: number = iPos['z'];
    const xj: number = jPos['x'];
    const yj: number = jPos['y'];
    const zj: number = jPos['z'];

    const result: number = Math.sqrt((xi - xj) ** 2 + (yi - yj) ** 2 + (zi - zj) ** 2);
    return result;
  }
}
