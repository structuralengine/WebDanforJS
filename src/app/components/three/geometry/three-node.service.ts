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
    private scene: SceneService
  ) {
    this.memNo = 0;
    this.dataNode = new Array();
    this.scale = 1;
  }
  public onInit(): void {
    this.scene.render();
  }
  public getJson() {
    let scale = this.scale;
    const memNo = this.memNo;
    console.log("dataNode", this.dataNode)
    console.log('memNo', memNo)
    if (memNo == 0) return;
    let jsonData: object = {};
    var member = this.memmber.getData(memNo);
    console.log('member', member)
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
    // this.drawLineDim(jsonData["1"], jsonData["2"],0,  member['Bt'], true, 6)
    // this.drawLineDemension(jsonData["1"], len, member['Bt'], true, [1, 6, 8])
    // this.drawLineDemension(jsonData["4"], this.getLength(jsonData["4"], jsonData["5"]), member['B'], true, [1, 6, 8], 2)
    this.drawLineDemension(jsonData["8"], this.getLength(jsonData["8"], jsonData["7"]), member['t'], false, [1, 3, 6], 1)
    // this.drawLineDemension(jsonData["8"], this.getLength(jsonData["8"], jsonData["5"]) - 0.5, member['H'], false, member['shape'] == 1 ? [1, 4, 10] : [8, 11, 13], 9)
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
        //this.drawLineDemension(jsonData[`${checkNode + 1}`], this.getLength(jsonData[`${checkNode + 1}`], jsonData[`${checkNode + 2}`]), rebar1['rebar_ss'], true, [1, 3, 4], 5)
        //this.drawLineDemension(jsonData["1"], this.getLength(jsonData["1"], { x: jsonData["1"]['x'], y: jsonData[`${checkNode + 1}`]['y'], z: 0 }), rebar1['rebar_cover'], false, [1, 4, 5], 6)
        if (Math.ceil(rebar1['rebar_n'] / rebar1['rebar_lines']) > 1) {
          //this.drawLineDemension({ x: jsonData["1"]['x'], y: jsonData[`${checkNode + 1}`]['y'], z: 0 },
          //this.getLength(jsonData[`${checkNode + 1}`], { x: jsonData[`${checkNode + 1}`]['x'], y: jsonData[`${checkNode + rebar1['rebar_lines'] + 1}`]['y'], z: 0 }),
          //rebar1['rebar_space'], false, [1, 4, 5], 3)
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
      //this.drawLineDemension(jsonData[`${checkNode + 1}_i`], this.getLength(jsonData[`${checkNode + 1}_i`], jsonData[`${checkNode + 2}_i`]), rebar2['rebar_ss'], true, [1, 4, 5], 4)
      if (Math.ceil(rebar2['rebar_n'] / rebar2['rebar_lines']) >= 2)
        // this.drawLineDemension({ x: jsonData[`${checkNode + 1}_i`]['x'], y: jsonData[`${checkNode + rebar2['rebar_lines'] + 1}_i`]['y'], z: 0 }, this.getLength(jsonData[`${checkNode + 1}_i`], { x: jsonData[`${checkNode + 1}_i`]['x'], y: jsonData[`${checkNode + rebar2['rebar_lines'] + 1}_i`]['y'], z: 0 }), rebar2['rebar_space'], false, [1, 4, 5], 3)
        //this.drawLineDemension(jsonData[`${checkNode + 1}_i`], this.getLength(jsonData["4"], { y: jsonData[`${checkNode + 1}_i`]['y'], x: jsonData["4"]['x'], z: 0 }), rebar2['rebar_cover'], false, [1, 4, 5], 3)

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
        // this.drawLineDemension(jsonData["1"], this.getLength(jsonData["1"], { x: jsonData["1"]['x'], y: jsonData[`${checkNode + 1}_s`]['y'], z: 0 }), sidebar1['side_cover'], false, [8, 10, 12], 8)
        // this.drawLineDemension(jsonData[`${checkNode + 1}_s`], this.getLength(jsonData[`${checkNode + 1}_s`], jsonData[`${checkNode + 2}_s`]), sidebar1['side_ss'], false, [1, 7, 8], 7)
        // this.drawLineDemension({ x: jsonData["3"]['x'], y: jsonData[`${checkNode + 1}_s`]['y'], z: 0 }, this.getLength(jsonData["3"], { y: jsonData["3"]['y'], x: jsonData[`${checkNode + 1}_s`]['x'], z: 0 }), sidebar2['side_cover'], true, [1, 3, 4])
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
        //   this.drawLineDemension(jsonData["1"], this.getLength(jsonData["1"], { x: jsonData["1"]['x'], y: jsonData[`${checkNode + 1}_s`]['y'], z: 0 }), sidebar['side_cover'], false, [1, 4, 8])
        //   this.drawLineDemension(jsonData[`${checkNode + 1}_s`], this.getLength(jsonData[`${checkNode + 1}_s`], jsonData[`${checkNode + 2}_s`]), rebar2['rebar_space'], false, [1, 4, 8])
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
      color: 0xB9B9B9,
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
      points.push(new THREE.Vector3(x + length, py3, z));
      points.push(new THREE.Vector3(x + length, py1 + 2, z));

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
    const geometry = new THREE.CylinderBufferGeometry(0, 0, vect.length(), 12);

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
      // mesh.rotation.y = 0.5 * Math.PI + Math.atan2(px1 - px3, -length);
    }
    // 文字をシーンに追加
    const div = document.createElement("div");
    div.className = "label";
    div.textContent = `${title}`;

    div.style.color = '#000000'
    div.style.fontSize = '12px'
    // switch (style) {
    //   case 1:
    //     div.style.marginTop = "-47.5px";
    //     // div.style.marginTop = "-2.5px";
    //     div.style.marginLeft = "10px";
    //     break;
    //   case 2:
    //     // div.style.marginTop = "13.5px"
    //     div.style.marginTop = "-28.5px"
    //     break;
    //   case 3:
    //     div.style.marginTop = "-45.5px";
    //     // div.style.marginTop = "-1.5px";
    //     div.style.marginLeft = "-19px";
    //     break;
    //   case 4:
    //     div.style.marginTop = "-32.5px";
    //     // div.style.marginTop = "10.5px";
    //     break;
    //   case 5:
    //     div.style.marginTop = "-60.5px";
    //     // div.style.marginTop = "-12.5px";
    //     break;
    //   case 6:
    //     div.style.marginTop = "-45.5px";
    //     // div.style.marginTop = "-1.5px";
    //     div.style.marginLeft = "-19px";
    //     break;
    //   case 7:
    //     div.style.marginTop = "-48.5px";
    //     // div.style.marginTop = "-2.5px";
    //     div.style.marginLeft = "-26px";
    //     break;
    //   case 8:
    //     div.style.textAlign = "center";
    //     div.style.marginTop = "-48.5px";
    //     div.style.marginLeft = "-19px";
    //     break;
    //   case 9:
    //     div.style.textAlign = "center";
    //     div.style.marginLeft = "19px";
    //     break;
    //   default:
    //     div.style.marginTop = "-66.5px";
    //     // div.style.marginTop = "-14.5px";
    //     break;
    // }
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
  private drawLineDim(ni: any, nj: any, style: number, title: any, vertical: boolean, lenDim: any, distanceDim: any, distance: any) {
    let x: any;
    let y: any;
    let px: any;
    let py: any;
    let xmin: any = ni.x;
    let ymin: any = ni.y;
    let i = JSON.parse(JSON.stringify(ni));
    let j = JSON.parse(JSON.stringify(nj));
    if (vertical) {
      if (Math.abs(i.x) > Math.abs(j.x)) {
        xmin = j.x
        j.x = i.x
      }
      else {
        xmin = i.x
        i.x = j.x
      }
      x = i.x;
      y = j.y > i.y ? j.y : i.y
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
      px = x > 0 ? x + distance : x - distance;
      py = px > 0 ? px + lenDim : px - lenDim;
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
      px = y > 0 ? y + distance : y - distance;
      py = px > 0 ? px + lenDim : px - lenDim;
      pointHors.push(new THREE.Vector3(x, px, 0));
      pointHors.push(new THREE.Vector3(x, py, 0));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pointHors),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      this.scene.add(line);

      let points = [];
      points.push(new THREE.Vector3(x - length, px, 0));
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
    div.className = "label";
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
    } else {
      const sidebar1 = this.dataNode['sidebar']
      if (sidebar1['side_dia'] != null) {
        const radius = sidebar1['side_dia'] / scale
        arr.push(radius);
      }
    }
    return arr;
  }
  createDemoTShape() {
    console.log("rebar", this.dataRebar);
    var member = this.memmber.getData(this.dataRebar.selectedCalPoint.m_no);
    console.log(member)
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
    this.createLineRectangle(memB / this.scale, memH / this.scale, 20 / this.scale, 0x333D46)
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

    this.drawLineDim(jsonData["1"], jsonData["2"], 0, Math.round(t * this.scale), true, 6, 4, 1);
    this.drawLineDim(jsonData["1"], jsonData["4"], 0, Math.round(h * this.scale), true, 8, 1, 4);

    this.drawLineDim(jsonData["1"], jsonData["8"], 1, Math.round(bt * this.scale), false, 8, 1, 4);
    this.drawLineDim(jsonData["4"], jsonData["5"], 1, Math.round(b * this.scale), false, 8, -2, 4);
    console.log("jsondata", jsonData)
    // dimenstions for rebar_type = 0
    const index_rebar_type_0 = this.dataRebar.selectedCalPoint.rebar0.findIndex((data: any) => data.rebar_type === 0)
    if (index_rebar_type_0 !== -1) {
      const rebar_type_0 = this.dataRebar.selectedCalPoint.rebar0[index_rebar_type_0];
      const dist_top = rebar_type_0.dist_top / this.scale;
      const dist_side = rebar_type_0.dist_side / this.scale;
      const quantity = rebar_type_0.quantity;
      const interval = rebar_type_0.interval ? rebar_type_0.interval / this.scale : (b - 2 * dist_side) / quantity;
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

      // this.drawLineDim(jsonData["8"], jsonData["rb_1"], 0, Math.round(dist_top * this.scale), true, 6, 10, 1);
      this.drawLineDim(jsonData["rb_2"], jsonData["rb_1"], 1, Math.round(dist_side * this.scale), false, 6, 2, 1);
      this.drawLineDim(jsonData["rb_3"], jsonData["rb_1"], 1, Math.round(interval * this.scale), false, 6, 2, 1);
    }
    // dimenstions for rebar_type = 1
    const index_rebar_type_1 = this.dataRebar.selectedCalPoint.rebar0.findIndex((data: any) => data.rebar_type === 1)

    if (index_rebar_type_1 !== -1) {
      const rebar_type_1 = this.dataRebar.selectedCalPoint.rebar0[index_rebar_type_1];
      if (rebar_type_1 != null) {
        const dist_top2 = rebar_type_1.dist_top / this.scale;
        const dist_side2 = rebar_type_1.dist_side / this.scale;
        const quantity2 = rebar_type_1.quantity;
        const interval2 = rebar_type_1.interval ? rebar_type_1.interval / this.scale : (b - 2 * dist_side2) / quantity2;
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
        this.drawLineDim(jsonData["rb_7"], jsonData["rb_8"], 1, Math.round(interval2 * this.scale), false, 6, -2, 1);
      }
    }
    // dimenstions for rebar_type = 0 & 1
    if (index_rebar_type_1 !== -1 && index_rebar_type_0 !== -1) {
      const arr_dis_top = []
      const arr_gap = []
      this.dataRebar.selectedCalPoint.rebar0.map((data) => {
        if (data.rebar_type === 0 || data.rebar_type === 1) {
          arr_dis_top.push(Math.round(data.dist_top))
        }
      })
      arr_dis_top.sort()
      for (let i = 0; i <= arr_dis_top.length; i++) {
        if (i === 0) {
          arr_gap.push(arr_dis_top[i])
        }
        if (i === arr_dis_top.length) {
          arr_gap.push(h * this.scale - arr_dis_top[i - 1])
        }
        if (i !== 0 && i !== arr_dis_top.length) {
          arr_gap.push(arr_dis_top[i] - arr_dis_top[i - 1])
        }
      }
      console.log("arr_gap", arr_gap)
    }

    // const rebar2 = this.dataRebar.selectedCalPoint.rebar2;
    // const dist_top2 = rebar2.rebar_cover / this.scale;
    // const gap = 2;
    // const dist_side2 = h - dist_top2;
    // const remain = h - dist_top2 - gap;

    // jsonData["rb_4"]= {
    //   x:  -(x_start - n),
    //   y:  - (dist_side2 - y_start),
    //   z: 0
    // }
    // jsonData["rb_5"]= {
    //   x:  -(x_start - n),
    //   y:  - (dist_side2 - y_start - gap),
    //   z: 0
    // }
    // this.drawLineDim(jsonData["5"], jsonData["rb_4"], 0, Math.round(dist_side2), true, 6 + n, 25 + n, 1);
    // this.drawLineDim(jsonData["rb_5"], jsonData["rb_4"], 0, Math.round(gap), true, 6 + n, 25+ n, 1);
    // this.drawLineDim(jsonData["rb_5"], jsonData["rb_1"], 0, Math.round(remain), true, 6 + n, 25+ n, 1);



  }
  createDemoRectangle() {
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
    this.createRectangle(memH / this.scale, memB / this.scale, 0xb9b9b9)
    //this.createLineRectangle(memH / this.scale, memB / this.scale, 20 / this.scale, 0x333D46)
    this.scene.render()
  }
  createRectangle(b: any, h: any, color: any) {
    let geometry: any = new THREE.PlaneGeometry(b, h);
    const materialPlane = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, materialPlane);
    plane.position.set(0, 0, 0);
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
    if (this.type === "Vertical") {
      this.createOval(450 / this.scale, 900 / this.scale, 0xb9b9b9, this.type);
      this.createLineOval(450 / this.scale, 900 / this.scale, 10 / this.scale, 0x333D46, this.type)
      this.createLineDashedOval(450 / this.scale, 900 / this.scale, 20 / this.scale, 0x333D46, this.type)
    } else {
      this.createOval(900 / this.scale, 450 / this.scale, 0xb9b9b9, this.type)
      this.createLineOval(900 / this.scale, 450 / this.scale, 10 / this.scale, 0x333D46, this.type)
      this.createLineDashedOval(900 / this.scale, 450 / this.scale, 20 / this.scale, 0x333D46, this.type)
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
    } else {
      geometry = new THREE.PlaneGeometry(Math.abs(h - b), h);
      circleGeometry1 = new THREE.Mesh(new THREE.CircleGeometry(h / 2, 100, Math.PI / 2, Math.PI), materialCircle);
      circleGeometry1.position.set(-Math.abs(h / 2 - b / 2), 0, 0);
      circleGeometry2 = new THREE.Mesh(new THREE.CircleGeometry(h / 2, 100, 3 / 2 * Math.PI, Math.PI), materialCircle);
      circleGeometry2.position.set(Math.abs(h / 2 - b / 2), 0, 0);
    }
    const plane = new THREE.Mesh(geometry, materialPlane);
    plane.position.set(0, 0, 0);

    this.scene.add(plane);
    this.scene.add(circleGeometry1);
    this.scene.add(circleGeometry2);
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
  createLineDashedOval(b: any, h: any, range: any, color: any, type) {
    const material = new THREE.LineBasicMaterial({ color: color })
    const materialLine = new THREE.LineDashedMaterial({ color: color, dashSize: 1.5, gapSize: 1.5 })

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

    let points3: any
    let curve3: any
    let ellipse3: any

    let points4: any
    let curve4: any
    let ellipse4: any
    if (type === "Vertical") {
      curve1 = new THREE.EllipseCurve(
        0, Math.abs(h / 2 - b / 2),
        Math.abs(b / 2 - range), Math.abs(b / 2 - range),
        0, Math.PI,
        false,
        0
      );
      curve2 = new THREE.EllipseCurve(
        0, Math.abs(h / 2 - b / 2),
        Math.abs(b / 2 - range - range * 2), Math.abs(b / 2 - range - range * 2),
        0, Math.PI,
        false,
        0
      );
      curve3 = new THREE.EllipseCurve(
        0, -Math.abs(h / 2 - b / 2),
        Math.abs(b / 2 - range), Math.abs(b / 2 - range),
        Math.PI, 2 * Math.PI,
        false,
        0
      );
      curve4 = new THREE.EllipseCurve(
        0, -Math.abs(h / 2 - b / 2),
        Math.abs(b / 2 - range - range * 2), Math.abs(b / 2 - range - range * 2),
        Math.PI, 2 * Math.PI,
        false,
        0
      );
      pointsLine1.push(new THREE.Vector3(Math.abs(b / 2 + 20 / this.scale), Math.abs(h / 2 - b / 2), 0));
      pointsLine1.push(new THREE.Vector3(-Math.abs(b / 2 + 20 / this.scale), Math.abs(h / 2 - b / 2), 0));

      pointsLine2.push(new THREE.Vector3(Math.abs(b / 2 + 20 / this.scale), -Math.abs(h / 2 - b / 2), 0));
      pointsLine2.push(new THREE.Vector3(-Math.abs(b / 2 + 20 / this.scale), -Math.abs(h / 2 - b / 2), 0));

      points2 = curve2.getPoints(100);
      ellipse2 = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points2), material);

      points4 = curve4.getPoints(100);
      ellipse4 = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points4), material);

      this.scene.add(ellipse2)
      this.scene.add(ellipse4)
    } else {
      curve1 = new THREE.EllipseCurve(
        -Math.abs(h / 2 - b / 2), 0,
        Math.abs(h / 2 - range), Math.abs(h / 2 - range),
        Math.PI / 2, 3 * Math.PI / 2,
        false,
        0
      );
      curve3 = new THREE.EllipseCurve(
        Math.abs(h / 2 - b / 2), 0,
        Math.abs(h / 2 - range), Math.abs(h / 2 - range),
        3 * Math.PI / 2, 5 * Math.PI / 2,

        false,
        0
      );
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

    points1 = curve1.getPoints(100);
    ellipse1 = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points1), material);

    points3 = curve3.getPoints(100);
    ellipse3 = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points3), material);

    this.scene.add(ellipse1)
    this.scene.add(ellipse3)
    this.scene.add(line1)
    this.scene.add(line2)
  }

  createDemoCircleRing() {
    if (this.type === "Circle") {
      this.createCircleRing(0xb9b9b9, this.type, 750 / this.scale)
    } else {
      this.createCircleRing(0xb9b9b9, this.type, 750 / this.scale, 250 / this.scale)
    }
    this.createLineCircleRing(0x333D46, 50 / this.scale, 750 / this.scale)
    this.createLineDashCircleRing(0x333D46, 60 / this.scale, 110 / this.scale, 750 / this.scale)
  }
  createCircleRing(color: any, type: any, b: any, h?: any,) {
    const material = new THREE.MeshBasicMaterial({ color: color });
    let geometry;
    let mesh

    if (type === "Circle") {
      geometry = new THREE.CircleGeometry(b / 2, 100)
    } else {
      geometry = new THREE.RingGeometry(h / 2, b / 2, 100)
    }
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
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
      Math.abs(b / 2 - range1 - range2), Math.abs(b / 2 - range1 - range2),
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
}
