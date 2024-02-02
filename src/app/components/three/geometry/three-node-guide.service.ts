import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThreeNodeGuideService { 
  public dataNode: any[];
  public checkKey: string;
  public memNo: number
  constructor(   
  ) {   
    this.dataNode= new Array();
  }
 
  public getJson() {
    const scale = 20;
    const jsonData :object = {};
    const width = (this.dataNode['rebar_ss']* (this.dataNode['rebar_lines']+1))/scale;
    const height = (this.dataNode['rebar_cover']*2+this.dataNode['rebar_space'])/scale;
    const x_start = -width/2;
    const y_start = -height/2
    if(width !== null && height !== null){
        jsonData["1"] = {
            x: x_start,
            y: y_start,
            z: 0
          }
          jsonData["2"] = {
            x: 0 + x_start,
            y: height + y_start,
            z: 0
          }
          jsonData["3"] = {
            x: width + x_start,
            y: height+ y_start,
            z: 0
          }
          jsonData["4"] = {
            x:  width+x_start,
            y:  y_start,
            z: 0
          }
    }
    let startNode = 4;
    if(this.checkKey=== 'up' || this.checkKey==="lower"){
      let y_rebar1
    let y_rebar2
    if(this.checkKey ==='up'){
      y_rebar1 =-(this.dataNode ['rebar_space']/2)/ scale;
      y_rebar2 =(this.dataNode ['rebar_space']/2)/ scale;
    }else{
      y_rebar1 =(this.dataNode ['rebar_space']/2)/ scale;
      y_rebar2 =-(this.dataNode ['rebar_space']/2)/ scale;
    }
    //drawing node rebar1
    console.log(this.dataNode)
    let rebar1 = this.dataNode;
    const rb_n1 = rebar1['rebar_lines'];
    if (rb_n1 != null) {
      const total_length = ((rb_n1 - 1) * rebar1['rebar_ss']) / scale;
      let start_x = (width - total_length) / 2;
        if (rb_n1 != undefined && rb_n1 != null) {
          for (let i = 0; i < rb_n1; i++) {
            startNode++;
            jsonData[`${startNode}`] = {
              x: start_x+ x_start+(rebar1['rebar_ss'] * i) / scale,
              y: y_rebar1,
              z: 0
            }
          }
        }
      }
      //drawing rebar 2
    let rebar2 = this.dataNode;
    let rb_n2 = rebar2['rebar_n']-rebar2['rebar_lines'];
    if (rb_n2 != null) {
      const total_length = ((rb_n2 - 1) * rebar2['rebar_ss']) / scale;
      let start_x = (width - total_length) / 2;
          for (let i = 0; i < rb_n2; i++) {
            startNode++;
            jsonData[`${startNode}`] = {
              x:  start_x + (rebar2['rebar_ss'] * (i)) / scale + x_start,
              y: y_rebar2, 
              z: 0
            }
          }   
    }
    }else{

    }
    return jsonData
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
        data.push({ x: jsonData[key].x,  y: jsonData[key].y, z: jsonData[key].z })
    }
    return data;
  }
}
