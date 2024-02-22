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
  public geometry1: THREE.SphereBufferGeometry;
  public geometry2: THREE.SphereBufferGeometry;
  public nodeList: THREE.Object3D;
  public jsonData: any
  public scale: any
  constructor(
    private memmber: InputMembersService,
    private scene: SceneService
  ) {
    this.memNo = 0;
    this.dataNode = new Array();
    this.scale = 100
  }
  public onInit(): void {
    this.scene.render();
  }
  public getJson() {
    let scale = this.scale;
    const memNo = this.memNo;
    if (memNo == 0) return;
    let jsonData: object = {};
    var member = this.memmber.getData(memNo);
    let memH = member['H'];
    let memBt = member['Bt'];
    let memB = member['B'];
    let memt = member['t']
    let ratio = 1;
    if (member['shape'] !== 1) {
      if (memH > 2500) {
        ratio = memH / 2500;
        memH = 2500;
      }
      if (member['Bt'] > 2000) memBt = memBt / ratio;
      memB = memB / ratio;
      memt = memt / ratio;
      scale = 50;
      this.scale = scale;
    }

    let b = memB / scale;
    let h = memH / scale;
    let bt = memBt / scale;
    let t = memt / scale;
    if (bt == 0 && t == 0) {
      bt = b;
      t = h;
    }
    const n = (bt - b) / 2;
    const x_start = -bt / 2;
    const y_start = -h / 2
    if (b != 0 && h != 0 && bt != 0 && t != 0) {
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
        y: t + y_start,
        z: 0
      }
      jsonData["4"] = {
        x: n + x_start,
        y: h + y_start,
        z: 0
      }
      jsonData["5"] = {
        x: bt - n + x_start,
        y: h + y_start,
        z: 0
      }

      jsonData["6"] = {
        x: n + b + x_start,
        y: t + y_start,
        z: 0
      }
      jsonData["7"] = {
        x: bt + x_start,
        y: t + y_start,
        z: 0
      }
      jsonData["8"] = {
        x: bt + x_start,
        y: 0 + y_start,
        z: 0
      }
    }
    let startNode = 8;
    let checkNode = startNode;
    const len = this.getLength(jsonData["1"], jsonData["8"]);
    this.drawLineDemension(jsonData["1"], len, member['Bt'], true, [1, 6, 8])
    this.drawLineDemension(jsonData["4"], this.getLength(jsonData["4"], jsonData["5"]), member['B'], true, [1, 6, 8], 2)
    this.drawLineDemension(jsonData["8"], this.getLength(jsonData["8"], jsonData["7"]), member['t'], false, [1, 3, 6], 1)
    this.drawLineDemension(jsonData["8"], this.getLength(jsonData["8"], jsonData["5"]) - 0.5, member['H'], false, member['shape'] == 1 ? [1, 4, 6] : [8, 11, 13], 9)
    //drawing node rebar1
    let rebar1 = this.dataNode['rebar1'];
    let rb_n1 = rebar1['rebar_n'];
    if (rb_n1 != null) {
      let rb1_line = rebar1['rebar_lines'];
      if (rb1_line == null) rb1_line = rb_n1;
      if (rb_n1 != undefined && rb_n1 != null) {
        let r = 1;
        const numrow = Math.ceil(rb_n1 / rb1_line);
        while (rb1_line > 0 && r <= numrow) {
          const tt_len_rb1 = ((rb1_line - 1) * rebar1['rebar_ss'] / ratio) / scale;
          let st_rb1 = (bt - tt_len_rb1) / 2;
          if (tt_len_rb1 <= 0 && rb1_line > 1) break;
          for (let i = 0; i < rb1_line; i++) {
            startNode++;
            console.log(st_rb1 + (rebar1['rebar_ss'] / ratio * i) / scale + x_start);
            jsonData[`${startNode}`] = {
              x: st_rb1 + (rebar1['rebar_ss'] / ratio * i) / scale + x_start,
              y: (rebar1['rebar_cover'] / ratio) / scale + y_start + (rebar1['rebar_space'] / ratio * (r - 1)) / scale,
              z: 0
            }
          }

          rb_n1 = rb_n1 - rb1_line;
          if (rb1_line > rb_n1) rb1_line = rb_n1
          r++;
        }

      }
    }
    if (checkNode < startNode) {
      if (startNode - checkNode >= 2)
        this.drawLineDemension(jsonData[`${checkNode + 1}`], this.getLength(jsonData[`${checkNode + 1}`], jsonData[`${checkNode + 2}`]), rebar1['rebar_ss'], true, [1, 3, 4], 5)
      this.drawLineDemension(jsonData["1"], this.getLength(jsonData["1"], { x: jsonData["1"]['x'], y: jsonData[`${checkNode + 1}`]['y'], z: 0 }), rebar1['rebar_cover'], false, [1, 4, 5], 6)
      if (Math.ceil(rebar1['rebar_n'] / rebar1['rebar_lines']) > 1) {
        this.drawLineDemension({ x: jsonData["1"]['x'], y: jsonData[`${checkNode + 1}`]['y'], z: 0 },
          this.getLength(jsonData[`${checkNode + 1}`], { x: jsonData[`${checkNode + 1}`]['x'], y: jsonData[`${checkNode + rebar1['rebar_lines'] + 1}`]['y'], z: 0 }),
          rebar1['rebar_space'], false, [1, 4, 5], 3)
      }

      checkNode = startNode
    }
    //drawing rebar 2
    let rebar2 = this.dataNode['rebar2'];
    let rb_n2 = rebar2['rebar_n'];
    if (rb_n2 != null) {
      let rb2_line = rebar2['rebar_lines'];
      if (rb2_line == null) rb2_line = rb_n2;
      if (rb_n2 != undefined && rb_n2 != null) {
        let r = 1;
        const numrow = Math.ceil(rb_n2 / rb2_line);
        while (rb2_line > 0 && r <= numrow) {
          const total_length = ((rb2_line - 1) / ratio * rebar2['rebar_ss']) / scale;
          let start_x = (b - total_length) / 2;
          if (total_length <= 0 && rb2_line > 1) break;
          for (let i = 0; i < rb2_line; i++) {
            startNode++;
            jsonData[`${startNode}_i`] = {
              x: n + start_x + (rebar2['rebar_ss'] / ratio * (i)) / scale + x_start,
              y: h - ((rebar2['rebar_cover'] / ratio / scale) + (rebar2['rebar_space'] / ratio * (r - 1)) / scale) + y_start,
              z: 0
            }
          }
          rb_n2 = rb_n2 - rb2_line;
          if (rb2_line > rb_n2) rb2_line = rb_n2
          r++;
        }
      }
    }
    if (checkNode < startNode) {
      this.drawLineDemension(jsonData[`${checkNode + 1}_i`], this.getLength(jsonData[`${checkNode + 1}_i`], jsonData[`${checkNode + 2}_i`]), rebar2['rebar_ss'], true, [1, 4, 5], 4)
      if (Math.ceil(rebar2['rebar_n'] / rebar2['rebar_lines']) >= 2)
        this.drawLineDemension({ x: jsonData[`${checkNode + 1}_i`]['x'], y: jsonData[`${checkNode + rebar2['rebar_lines'] + 1}_i`]['y'], z: 0 }, this.getLength(jsonData[`${checkNode + 1}_i`], { x: jsonData[`${checkNode + 1}_i`]['x'], y: jsonData[`${checkNode + rebar2['rebar_lines'] + 1}_i`]['y'], z: 0 }), rebar2['rebar_space'], false, [1, 4, 5], 3)
      this.drawLineDemension(jsonData[`${checkNode + 1}_i`], this.getLength(jsonData["4"], { y: jsonData[`${checkNode + 1}_i`]['y'], x: jsonData["4"]['x'], z: 0 }), rebar2['rebar_cover'], false, [1, 4, 5], 3)

      checkNode = startNode
    }
    //drawing sidebar 1
    var objectKey = Object.keys(this.dataNode);
    if (!objectKey.includes("sidebar")) {
      let sidebar2 = this.dataNode['sidebar2'];
      const sb_cover_2 = sidebar2['side_cover'] / ratio / scale;
      let kc = n + sb_cover_2;
      let sidebar1 = this.dataNode['sidebar1'];
      const sb_n2 = sidebar1['side_n'];
      if (sb_n2 != null && sb_cover_2 != null) {
        for (let i = 0; i < sb_n2; i++) {
          startNode++;
          jsonData[`${startNode}_s`] = {
            x: kc + x_start,
            y: (sidebar1['side_cover'] / ratio / scale) + i * (sidebar1['side_ss'] / ratio / scale) + y_start,
            z: 0
          }
          jsonData[`${startNode}_s1`] = {
            x: (n + b - sb_cover_2) + x_start,
            y: (sidebar1['side_cover'] / ratio / scale) + i * (sidebar1['side_ss'] / ratio / scale) + y_start,
            z: 0
          }

        }
      }
      if (checkNode < startNode) {
        this.drawLineDemension(jsonData["1"], this.getLength(jsonData["1"], { x: jsonData["1"]['x'], y: jsonData[`${checkNode + 1}_s`]['y'], z: 0 }), sidebar1['side_cover'], false, [8, 10, 12], 8)
        this.drawLineDemension(jsonData[`${checkNode + 1}_s`], this.getLength(jsonData[`${checkNode + 1}_s`], jsonData[`${checkNode + 2}_s`]), sidebar1['side_ss'], false, [1, 7, 8], 7)
        this.drawLineDemension({ x: jsonData["3"]['x'], y: jsonData[`${checkNode + 1}_s`]['y'], z: 0 }, this.getLength(jsonData["3"], { y: jsonData["3"]['y'], x: jsonData[`${checkNode + 1}_s`]['x'], z: 0 }), sidebar2['side_cover'], true, [1, 3, 4])
      }
    } else {
      let sidebar = this.dataNode['sidebar'];
      const sb_n2 = sidebar['side_n'];
      if (sb_n2 != null) {
        for (let i = 0; i < sb_n2; i++) {
          startNode++;
          jsonData[`${startNode}_s`] = {
            x: n + x_start,
            y: (sidebar['side_cover'] / ratio / scale) + i * (sidebar['side_ss'] / ratio / scale) + y_start,
            z: 0
          }
          jsonData[`${startNode}_s1`] = {
            x: (n + b) + x_start,
            y: (sidebar['side_cover'] / ratio / scale) + i * (sidebar['side_ss'] / ratio / scale) + y_start,
            z: 0
          }

        }
      }
      if (checkNode < startNode) {
        this.drawLineDemension(jsonData["1"], this.getLength(jsonData["1"], { x: jsonData["1"]['x'], y: jsonData[`${checkNode + 1}_s`]['y'], z: 0 }), sidebar['side_cover'], false, [1, 4, 8])
        this.drawLineDemension(jsonData[`${checkNode + 1}_s`], this.getLength(jsonData[`${checkNode + 1}_s`], jsonData[`${checkNode + 2}_s`]), rebar2['rebar_space'], false, [1, 4, 8])
      }
    }

    console.log(JSON.stringify(jsonData));
    return jsonData;
  }

  public changeData(): object {

    const jsonKeys = Object.keys(this.jsonData);
    let data: any = [];
    if (jsonKeys.length <= 0) {
      return null;
    }
    for (const key of jsonKeys) {
      if (!key.includes("s") && !key.includes("i"))
        data.push({ x: this.jsonData[key].x, y: this.jsonData[key].y, z: this.jsonData[key].z })
    }
    console.log("rebar1", data)
    return data;
  }
  public changeDataSide(): object {

    const jsonKeys = Object.keys(this.jsonData);
    let data: any = [];
    if (jsonKeys.length <= 0) {
      return null;
    }
    for (const key of jsonKeys) {
      if (key.includes("s"))
        data.push({ x: this.jsonData[key].x, y: this.jsonData[key].y, z: this.jsonData[key].z })
    }
    console.log("sidebar", data)
    return data;
  }

  public changeDataRebar2(): object {

    const jsonKeys = Object.keys(this.jsonData);
    let data: any = [];
    if (jsonKeys.length <= 0) {
      return null;
    }
    for (const key of jsonKeys) {
      if (key.includes("i"))
        data.push({ x: this.jsonData[key].x, y: this.jsonData[key].y, z: this.jsonData[key].z })
    }
    console.log("rebar2", data)
    return data;
  }
  createDrawingLine() {
    this.jsonData = this.getJson();
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
        const n = jsonData[i - 1]
        const x = n.x;
        const y = n.y;
        const z = n.z;
        vertexlist.push([x, -y, z])
      })
      this.createPanel(vertexlist, arrPanel.indexOf(item));
    })
    let dem = 0;
    jsonData.forEach(x => {
      dem++;
      if (dem <= 8) {
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
    const radiuses = this.getRadius(this.scale)
    this.geometry = new THREE.SphereBufferGeometry(radiuses[0])
    for (let i = 8; i < jsonData.length; i++) {
      try {
        const mesh = new THREE.Mesh(this.geometry,
          new THREE.MeshBasicMaterial({ color: 0x000000 }));
        mesh.name = 'node' + i;
        mesh.position.x = jsonData[i]['x'];
        mesh.position.y = -jsonData[i]['y'];
        mesh.position.z = jsonData[i]['z'];
        this.nodeList.children.push(mesh);
      } catch {
        console.log(jsonData)
      }

    }
    const jsonRebar2 = this.changeDataRebar2() as [];
    this.geometry2 = new THREE.SphereBufferGeometry(radiuses[1])
    for (let i = 0; i < jsonRebar2.length; i++) {
      try {
        const mesh = new THREE.Mesh(this.geometry2,
          new THREE.MeshBasicMaterial({ color: 0x000000 }));
        mesh.name = 'nodeRebar2' + i;
        mesh.position.x = jsonRebar2[i]['x'];
        mesh.position.y = -jsonRebar2[i]['y'];
        mesh.position.z = jsonRebar2[i]['z'];
        this.nodeList.children.push(mesh);
      } catch {
        //console.log(jsonData)
      }
    }

    const jsonSide = this.changeDataSide() as [];
    this.geometry1 = new THREE.SphereBufferGeometry(radiuses[2])
    for (let i = 0; i < jsonSide.length; i++) {

      const mesh1 = new THREE.Mesh(this.geometry1,
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
      color: 0x7f8F9F,
      opacity: 0.7,
    });

    for (const g of geometrys) {
      const mesh = new THREE.Mesh(g, material);
      mesh.name = 'panel-' + row.toString();
      this.scene.add(mesh);
    }
  }
  private drawLineDemension(pointStart: any, length: number, title: number, dir: boolean, kc: any[], style: number = -1) {
    if (title == null) return;
    let points = [];
    const point = pointStart as [];
    const x = point['x'];
    const y = -point['y'];
    const z = point['z'];
    const py1 = y > 0 ? (y + kc[0]) : -(Math.abs(y) + kc[0]);
    const py2 = y > 0 ? (y + kc[1]) : -(Math.abs(y) + kc[1]);
    const py3 = y > 0 ? (y + kc[2]) : -(Math.abs(y) + kc[2]);
    const px1 = x > 0 ? (x + kc[0]) : -(Math.abs(x) + kc[0]);
    const px2 = x > 0 ? (x + kc[1]) : -(Math.abs(x) + kc[1]);
    const px3 = x > 0 ? (x + kc[2]) : -(Math.abs(x) + kc[2]);
    if (dir) {
      points.push(new THREE.Vector3(x, py1, z));
      points.push(new THREE.Vector3(x, py3, z));
      points.push(new THREE.Vector3(x, py2, z));
      points.push(new THREE.Vector3(x + length, py2, z));
      points.push(new THREE.Vector3(x + length, py1, z));
      points.push(new THREE.Vector3(x + length, py3, z));
    } else {
      points.push(new THREE.Vector3(px1, y, z));
      points.push(new THREE.Vector3(px3, y, z));
      points.push(new THREE.Vector3(px2, y, z));
      points.push(new THREE.Vector3(px2, y - length, z));
      points.push(new THREE.Vector3(px1, y - length, z));
      points.push(new THREE.Vector3(px3, y - length, z));
    }

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

    if (dir) {
      mesh.position.set(x + length / 2, (py1 + py3) / 2, z);
      mesh.rotation.z = Math.acos(0);
      mesh.rotation.y = 0.5 * Math.PI + Math.atan2(length, 0);
    }
    else {
      mesh.position.set((px1 + px3) / 2, y - length / 2, z);
      mesh.rotation.z = Math.acos(-1);
      mesh.rotation.y = 0.5 * Math.PI + Math.atan2(px1 - px3, -length);
    }
    // 文字をシーンに追加
    const div = document.createElement("div");
    div.className = "label";
    div.textContent = `${title}`;

    div.style.color = '#000000'
    div.style.fontSize = '12px'
    switch (style) {
      case 1:
        div.style.marginTop = "-2.5px";
        div.style.marginLeft = "10px";
        break;
      case 2:
        div.style.marginTop = "13.5px"
        break;
      case 3:
        div.style.marginTop = "-1.5px";
        div.style.marginLeft = "-19px";
        break;
      case 4:
        div.style.marginTop = "10.5px";
        break;
      case 5:
        div.style.marginTop = "-12.5px";
        break;
      case 6:
        div.style.marginTop = "-1.5px";
        div.style.marginLeft = "-19px";
        break;
      case 7:
        div.style.marginTop = "-2.5px";
        div.style.marginLeft = "-26px";
        break;
      case 8:
        div.style.textAlign = "center";
        div.style.marginLeft = "-19px";
        break;
      case 9:
        div.style.textAlign = "center";
        div.style.marginLeft = "19px";
        break;
      default:
        div.style.marginTop = "-14.5px";
        break;
    }
    const label = new CSS2DObject(div);

    label.position.set(0, 0, 0);
    label.name = "font";
    label.visible = true;
    mesh.add(label);
    mesh.scale.set(0, 1, 0);
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
}
