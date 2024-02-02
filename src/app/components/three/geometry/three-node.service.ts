import { Injectable } from '@angular/core';
import { InputMembersService } from '../../members/members.service';
@Injectable({
  providedIn: 'root'
})
export class ThreeNodeService { 
  public dataNode: any[];
  public memNo: number
  constructor(   
    private memmber: InputMembersService
  ) {   
   
    this.memNo = 0;
    this.dataNode = new Array();
  }
  public getJson() {
    const scale = 50;
    const memNo = this.memNo;
    if(memNo == 0) return;
    let jsonData: object = {};
    console.log(this.memmber.getData(memNo));
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
    const rb_n1 = rebar1['rebar_n'];
    if (rb_n1 != null) {
      const tt_len_rb1 = ((rb_n1 - 1) * rebar1['rebar_ss']) / scale;
      let st_rb1 = (bt - tt_len_rb1) / 2
      if (rb_n1 != undefined && rb_n1 != null) {
        for (let i = 0; i < rb_n1; i++) {
          startNode++;
          jsonData[`${startNode}`] = {
            x: st_rb1 + (rebar1['rebar_ss'] * i) / scale + x_start,
            y: rebar1['rebar_cover'] / scale+ y_start,
            z: 0
          }
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
        const numrow = Math.round(rb_n2/rb2_line) ;
        while (rb2_line > 0 && r <= numrow) {
          const total_length = ((rb2_line - 1) * rebar2['rebar_ss']) / scale;
          let start_x = (b - total_length) / 2;
          if(total_length <= 0) break;
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
          jsonData[`${9 + i * 2 + rb_n1 + sb_n2}_s`] = {
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
        for (let i = 0; i < sb_n2; i++) {
          jsonData[`${9 + i + rb_n1 + sb_n2}_s`] = {
            x: n+ x_start,
            y: (sidebar['side_cover'] / scale) + i * (sidebar['side_ss'] / scale)+ y_start,
            z: 0
          }
          jsonData[`${9 + i * 2 + rb_n1 + sb_n2}_s`] = {
            x: (n + b)+ x_start,
            y: (sidebar['side_cover'] / scale) + i * (sidebar['side_ss'] / scale)+ y_start,
            z: 0
          }
        }
      }

    }
    console.log(JSON.stringify(jsonData));
    return jsonData;
  }

  public changeData(): object {
    // 入力データを入手
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
    // 入力データを入手
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
}
