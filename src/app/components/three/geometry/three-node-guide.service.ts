import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThreeNodeGuideService { 
  public dataNode: any[];
  public dataUpper: any;
  public dataLower: any;
  public checkKey: string;
  public memNo: number
  constructor(   
  ) {   
    this.dataNode= new Array();
  }
 
  public getJson() {
    let scale = 20;
    const jsonData :object = {};
   
    if(this.checkKey=== 'up' || this.checkKey==="lower"){
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
     scale = 30;
    const width = (this.dataUpper['rebar_ss']* (this.dataNode['rebar_lines']-1)+this.dataLower['side_cover']*2)/scale;
    const height = (this.dataUpper['side_cover']*2+this.dataNode['side_ss']*(this.dataNode['side_n']-1))/scale;
    const x_start = -width/2;
    const y_start = -height/2
    const horizontalCover= this.dataLower['side_cover']/scale
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
     //drawing node rebar1 up
     let rebar1up = this.dataUpper;
     const rb_n1up = rebar1up['rebar_lines'];
     if (rb_n1up != null) {
      const total_length = width-horizontalCover*2;
      const range= total_length/(rb_n1up-1);
         if (rb_n1up != undefined && rb_n1up != null) {
           for (let i = 0; i < rb_n1up; i++) {
             startNode++;
             jsonData[`${startNode}`] = {
               x:  -(x_start+horizontalCover+(range * i)) ,
               y: y_start+rebar1up['rebar_cover']/ scale,
               z: 0
             }
           }
         }
       }
       //drawing rebar 2 up
     let rebar2up = this.dataUpper;
     let rb_n2up = rebar2up['rebar_n']-rebar2up['rebar_lines'];
     if (rb_n2up != null) {
      const total_length = width-horizontalCover*2;
      const range= total_length/(rb_n2up-1);
           for (let i = 0; i < rb_n2up; i++) {
             startNode++;
             jsonData[`${startNode}`] = {
               x:  -(x_start+horizontalCover+(range * i)),
               y:   y_start+  rebar2up ['rebar_space']/scale+  rebar2up ['rebar_cover']/ scale, 
               z: 0
             }
           }   
     }

     //drawing node rebar1 low
     let rebar1low = this.dataLower;
     const rb_n1low = rebar1low['rebar_lines'];
     if (rb_n1low != null) {
      const total_length = width-horizontalCover*2;
      const range= total_length/(rb_n1low-1);
         if (rb_n1low != undefined && rb_n1low != null) {
           for (let i = 0; i < rb_n1low; i++) {
             startNode++;
             jsonData[`${startNode}`] = {
               x: -(x_start+horizontalCover+(range * i)),
               y: -(y_start+  rebar1low ['rebar_space']/scale+  rebar1low ['rebar_cover']/ scale), 
               z: 0
              }
            }
          }
        }
        //drawing rebar 2 low
        let rebar2low = this.dataLower;
        let rb_n2low = rebar2low['rebar_n']-rebar2low['rebar_lines'];
        if (rb_n2low != null) {
          const total_length = width-horizontalCover*2;
          const range= total_length/(rb_n2low-1);
          for (let i = 0; i < rb_n2low; i++) {
            startNode++;
            jsonData[`${startNode}`] = {
              x: -(x_start+horizontalCover+(range * i)),
              y:-(y_start+rebar2low['rebar_cover']/ scale),
              z: 0
             }
           }   
     }
     //drawing sidebar
     const sb_n = this.dataNode['side_n'];
     const sb_cover = this.dataUpper['side_cover'] / scale;
     if (sb_n != null) {
      for (let i = 0; i < sb_n; i++) {
        startNode++
        jsonData[`${startNode}_s`] = {
          x: -(x_start+horizontalCover),
          y: (y_start+sb_cover)+(this.dataUpper['side_ss']*i)/scale,
          z: 0
        }
        startNode++
        jsonData[`${startNode}_s`] = {
          x: x_start+horizontalCover,
          y: (y_start+sb_cover)+(this.dataUpper['side_ss']*i)/scale,
          z: 0
        }
      }
    }
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
}
