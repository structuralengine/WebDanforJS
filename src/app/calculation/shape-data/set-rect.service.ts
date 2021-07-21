import { Injectable } from '@angular/core';
import { InputBarsService } from 'src/app/components/bars/bars.service';
import { InputSteelsService } from 'src/app/components/steels/steels.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { ResultDataService } from '../result-data.service';

@Injectable({
  providedIn: 'root'
})
export class SetRectService {

  constructor(
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private helper: DataHelperModule
  ) { }

  // 矩形断面の POST 用 データ作成
  public getRectangle(
    target: string, member: any, index: number, 
    side: string, safety: any, option: any): any {

    const result = { symmetry: true, Concretes: [], ConcreteElastic:[] };

    // 断面情報を集計
    const shape = this.getRectangleShape(member, target, index, side, safety, option)
    const h: number = shape.H;
    const b: number = shape.B;

    const section = {
      Height: h, // 断面高さ
      WTop: b,        // 断面幅（上辺）
      WBottom: b,     // 断面幅（底辺）
      ElasticID: 'c'  // 材料番号
    };
    result.Concretes.push(section);
    result['member'] = shape;

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋情報を集計  
    const result2 = this.getRectBar(shape, safety);
    for(const key of Object.keys(result2)){
      result[key] = result2[key];
    }

    // 配筋が上下対象でなければ、symmetry = false
    const Bars = result['Bars'];
    let j = Bars.length-1;
    grid_loop:
    for(let i=0; i<Bars.length; i++){
      const b1 = Bars[i];
      const b2 = Bars[j];
      const d1 = b1.Depth
      const d2 = section.Height - b2.Depth;
      if(d1 !== d2){
        result.symmetry = false;
        break;
      }
      for(const key of ['i', 'n', 'ElasticID']){
        if(d1[key] !== d2[key]){
          result.symmetry = false;
          break grid_loop;
        }
      }
      j--;
    }
    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getTsection(
    target: string, member: any, index: number, 
    side: string, safety: any, option: any): object {

    const result = { symmetry: false, Concretes: [], ConcreteElastic:[] };

    // 断面情報を集計
    const shape = this.getTsectionShape(member, target, index, side, safety, option);
    const h: number = shape.H;
    const b: number = shape.B;
    const bf: number = shape.Bt;
    const hf: number = shape.t;

    const section1 = {
      Height: hf,
      WTop: bf,
      WBottom: bf,
      ElasticID: 'c'
    };
    result.Concretes.push(section1);

    const section2 = {
      Height: h - hf,
      WTop: b,
      WBottom: b,
      ElasticID: 'c'
    };
    result.Concretes.push(section2);

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋情報を集計  
    const result2 = this.getRectBar(shape, safety);
    for(const key of Object.keys(result2)){
      result[key] = result2[key];
    }

    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getInvertedTsection(
    target: string, member: any, index: number, 
    side: string, safety: any, option: any): object {
    
    const result = { symmetry: false, Concretes: [], ConcreteElastic:[] };

    // 断面情報を集計
    const shape = this.getTsectionShape(member, target, index, side, safety, option);
    const h: number = shape.H;
    const b: number = shape.B;
    const bf: number = shape.Bt;
    const hf: number = shape.t;

    const section2 = {
      Height: h - hf,
      WTop: b,
      WBottom: b,
      ElasticID: 'c'
    };
    result.Concretes.push(section2);

    const section1 = {
      Height: hf,
      WTop: bf,
      WBottom: bf,
      ElasticID: 'c'
    };
    result.Concretes.push(section1);

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋情報を集計  
    const result2 = this.getRectBar(shape, safety);
    for(const key of Object.keys(result2)){
      result[key] = result2[key];
    }

    return result;
  }
  
  public getSection(member: any, target: string, index: number){
    
    const result = {
      H: null,
      B: null,
      Bt: null,
      t: null,
      tan: null
    };

    const bar: any = this.bars.getCalcData(index);
    const haunch: number = (target === 'Md') ? bar.haunch_M : bar.haunch_V;

    let h: number = this.helper.toNumber(member.H);
    if (this.helper.toNumber(haunch) !== null) {
      h += haunch * 1;
    }
    result.H = h;

    const b = this.helper.toNumber(member.B);
    result.B = b;

    if (h === null || b === null) {
      throw('形状の入力が正しくありません');
    }

    result.tan = bar.tan;
    
    return result
  }

  public getTSection(member: any, target: string, index: number){
    
    const result = this.getSection(member, target, index);

    let bf = this.helper.toNumber(member.Bt);
    let hf = this.helper.toNumber(member.t);
    if (bf === null) { bf = result.B; }
    if (hf === null) { hf = result.H; }
    result['Bt'] = bf;
    result['t'] = hf;

    return result
  }

  // 断面の幅と高さ（フランジ幅と高さ）を取得する
  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getRectangleShape(
    member: any, target: string, index: number, 
    side: string, safety: any, option: any): any {

    const result = this.getSection(member, target, index);

    const bar: any = this.bars.getCalcData(index); // 鉄筋
    const stl: any = this.steel.getCalcData(index); // 鉄骨

    let tension: any;
    let compress: any;
    switch (side) {
      case "上側引張":
        tension = this.helper.rebarInfo(bar.rebar1);
        compress = this.helper.rebarInfo(bar.rebar2);
        break;
      case "下側引張":
        tension = this.helper.rebarInfo(bar.rebar2);
        compress = this.helper.rebarInfo(bar.rebar1);
        break;
    }
    if(tension === null){
      throw("引張鉄筋情報がありません");
    }
    if(tension.rebar_ss === null){
      tension.rebar_ss = result.B / tension.line;
    }
    if( 'barCenterPosition' in option ){
      if(option.barCenterPosition){
        // 多段配筋を１段に
        tension.dsc = this.helper.getBarCenterPosition(tension, 1);
        tension.line = tension.rebar_n;
        tension.n = 1;
      }
    }

    // tension
    const fsyt = this.helper.getFsyk(
      tension.rebar_dia,
      safety.material_bar,
      "tensionBar"
    );
    if (fsyt.fsy === 235)  tension.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
    tension['fsy'] = fsyt;
    tension['rs'] = safety.safety_factor.rs;;
    

    // 登録
    result['tension'] = tension;

    // steel
    const steel = {
      I: {
        position: null,
        tension_thickness: null,
        tension_width: null,
        compress_thickness: null,
        compress_width: null,
        web_thickness: null,
        web_height: null,
        fsy_tension: null,
        fsy_web: null,
        fsy_compress: null,
        fvy_web: null,
        },
      H: {
        position: null,
        left_thickness: null,
        left_width: null,
        right_thickness: null,
        right_width: null,
        web_thickness: null,
        web_height: null,
        fsy_left: null,
        fsy_web: null,
        fsy_right: null,
        fvy_web: null,
      }
    };

    // 横向き
    for (const key of ['left', 'right']){
      const key1 = key + '_thickness';
      const key2 = key + '_width';

      const thickness = stl.H[key1];
      steel.H[key1] = thickness;
      steel.H[key2] = stl.H[key2];

      steel.H['fsy_' + key] = this.helper.getFsyk2(
        thickness,
        safety.material_steel,
      );
    }
    steel.H.web_thickness = stl.H.web_thickness;
    steel.H.web_height = stl.H.web_height;
    steel.H.fsy_web = this.helper.getFsyk2(
      steel.H.web_thickness,
      safety.material_steel,
    );


    // 縦向きのH鋼
    switch (side) {
      case "上側引張":

        steel.I.tension_thickness = stl.I.upper_thickness;
        steel.I.tension_width = stl.I.upper_width;
        steel.I.compress_thickness = stl.I.lower_thickness;
        steel.I.compress_width = stl.I.lower_width;

        const I_Height = stl.I.upper_thickness + stl.I.web_height + stl.I.lower_thickness;
        steel.I.position = result.H - (stl.I.upper_cover + I_Height);

        let H_Height = 0;
        if (stl.H.left_width !== null){
          H_Height = stl.H.left_width;
        }
        if (stl.H.right_width !== null){
          H_Height = Math.max(H_Height, stl.H.right_width);
        }
        if(H_Height !== 0){
          steel.H.position = result.H - (stl.H.left_cover + H_Height);
        }

        steel.I.fsy_tension = this.helper.getFsyk2(
          stl.I.upper_thickness,
          safety.material_steel,
        );
        steel.I.fsy_compress = this.helper.getFsyk2(
          stl.I.lower_thickness,
          safety.material_steel,
        );
        break;

      case "下側引張":
        steel.I.tension_thickness = stl.I.lower_thickness;
        steel.I.tension_width = stl.I.lower_width;
        steel.I.compress_thickness = stl.I.upper_thickness;
        steel.I.compress_width = stl.I.upper_width;

        steel.I.position = stl.I.upper_cover;

        steel.H.position = stl.H.left_cover;

        steel.I.fsy_tension = this.helper.getFsyk2(
          stl.I.lower_thickness,
          safety.material_steel,
        );
        steel.I.fsy_compress = this.helper.getFsyk2(
          stl.I.upper_thickness,
          safety.material_steel,
        );
        break;
    }
    steel.I.web_thickness = stl.I.web_thickness;
    steel.I.web_height = stl.I.web_height;
    steel.I.fsy_web = this.helper.getFsyk2(
      steel.I.web_thickness,
      safety.material_steel,
    );


    // web のせん断強度
    for (const key of ['I', 'H']) {
      steel[key].fvy_web = this.helper.getFsyk2(
        stl[key].web_thickness,
        safety.material_steel,
        'fvy'
      );
    }

    result['steel'] = steel;



    // compres
    if (safety.safety_factor.range >= 2 && compress !== null) {
      const fsyc = this.helper.getFsyk(
        compress.rebar_dia,
        safety.material_bar,
        "tensionBar"
      );
      if (fsyc.fsy === 235) compress.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
      compress['fsy'] = fsyc;
      compress['rs'] = safety.safety_factor.rs;;
      result['compress'] = compress;
    }

    // sidebar
    if (safety.safety_factor.range >= 3) {
      if (compress===null){compress = {dsc: 0}}
      const sidebar: any = this.helper.sideInfo(bar.sidebar, tension.dsc, compress.dsc, result.H);
      if(sidebar !== null){
        const fsye = this.helper.getFsyk(
          sidebar.rebar_dia,
          safety.material_bar,
          "sidebar"
        );
        if (fsye.fsy === 235) sidebar.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
        sidebar['fsy'] = fsye;
        sidebar['rs'] = safety.safety_factor.rs;
        result['sidebar'] = sidebar;
      }
    }
    
    result['stirrup'] = bar.stirrup;
    result['bend'] = bar.bend;

    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // } 
  public getTsectionShape(
    member: any, target: string, index: number, 
    side: string, safety: any, option: any): any {

    const result = this.getRectangleShape(member, target, index, side, safety, option);
    
    let bf = this.helper.toNumber(member.Bt);
    let hf = this.helper.toNumber(member.t);
    if (bf === null) { bf = result.B; }
    if (hf === null) { hf = result.H; }
    result['Bt'] = bf;
    result['t'] = hf;

    return result;
  }

  // 矩形、Ｔ形断面の 鉄筋のPOST用 データを登録する。
  private getRectBar( section: any, safety: any ): any {

    const result = {
      Bars: new Array(),
      Steels: new Array(),
      SteelElastic: new Array(),
    };

    const h: number = section.H; // ハンチを含む高さ
    const tension: any = section.tension;

    const tensionBar = this.getCompresBar(tension, safety);
    const tensionBarList = tensionBar.Bars;
    // 有効な入力がなかった場合は null を返す.
    if (tensionBarList.length < 1) {
      return null;
    }

    // 鉄筋強度の入力
    for (const elastic of tensionBar.SteelElastic) {
      if ( result.SteelElastic.find(
          (e) => e.ElasticID === elastic.ElasticID) === undefined ) {
        result.SteelElastic.push(elastic);
      }
    }

    // 圧縮鉄筋 をセットする
    let compresBarList: any[] = new Array();
    if ('compress' in section) {
      const compress: any = section.compress;
      const compresBar = this.getCompresBar(compress, safety);
      compresBarList = compresBar.Bars;

      // 鉄筋強度の入力
      for (const elastic of compresBar.SteelElastic) {
        if ( result.SteelElastic.find(
          (e) => e.ElasticID === elastic.ElasticID) === undefined ) {
          result.SteelElastic.push(elastic);
        }
      }
    }

    // 側方鉄筋 をセットする
    let sideBarList = new Array();
    if ('sidebar' in section) {
      const sideInfo: any = section.sidebar;
      const sideBar = this.getSideBar(
        sideInfo,
        safety
      );
      sideBarList = sideBar.Bars;
      // 鉄筋強度の入力
      for (const elastic of sideBar.SteelElastic) {
        result.SteelElastic.push(elastic);
      }
    }

    // 圧縮鉄筋の登録
    for (const Asc of compresBarList) {
      Asc.n = Asc.n;
      Asc.Depth = Asc.Depth;
      result.Bars.push(Asc);
    }

    // 側面鉄筋の登録
    for (const Ase of sideBarList) {
      Ase.n = Ase.n;
      result.Bars.push(Ase);
    }

    // 引張鉄筋の登録
    for (const Ast of tensionBarList) {
      Ast.n = Ast.n;
      Ast.Depth = h - Ast.Depth;
      Ast.IsTensionBar = true;
      result.Bars.push(Ast);
    }

    // I 鉄骨の入力
    // 最初の1つめ の鉄骨材料を登録する
    result.SteelElastic.push({
      ElasticID: 'st',
      Es:200,
      fsk: section.steel.I.fsy_tension.fsy,
    });

    // かぶり部分
    if(section.steel.I.position > 0){
      result.Steels.push({
        Height: section.steel.I.position,  // 断面高さ
        WTop: 0,        // 断面幅（上辺）
        WBottom: 0,     // 断面幅（底辺）
        ElasticID: 'st' // 材料番号
      })
    }
    // 圧縮側フランジ
    if ( section.steel.I.compress_thickness !== null) {
      const fsk = section.steel.I.fsy_compress.fsy;
      const e = result.SteelElastic.find(v => v.fsk === fsk);
      let ElasticID = 'sc';
      if(e === undefined){
        result.SteelElastic.push({
          ElasticID: ElasticID,
          Es:200,
          fsk: fsk,
        });
      } else {
        ElasticID = e.ElasticID;
      }
      result.Steels.push({
        Height: section.steel.I.compress_thickness,  // 断面高さ
        WTop: section.steel.I.compress_width,        // 断面幅（上辺）
        WBottom: section.steel.I.compress_width,     // 断面幅（底辺）
        ElasticID
      })
    }
    // 腹板
    if ( section.steel.I.web_height !== null) {
      const fsk = section.steel.I.fsy_web.fsy;
      const e = result.SteelElastic.find(v => v.fsk === fsk);
      let ElasticID = 'sw';
      if(e === undefined){
        result.SteelElastic.push({
          ElasticID: ElasticID,
          Es:200,
          fsk: fsk,
        });
      } else{
        ElasticID = e.ElasticID;
      }
      result.Steels.push({
        Height: section.steel.I.web_height,  // 断面高さ
        WTop: section.steel.I.web_thickness,        // 断面幅（上辺）
        WBottom: section.steel.I.web_thickness,     // 断面幅（底辺）
        ElasticID: ElasticID // 材料番号
      })
    }
    // 引張側フランジ
    if ( section.steel.I.tension_thickness !== null) {
      const fsk = section.steel.I.fsy_tension.fsy;
      const e = result.SteelElastic.find(v => v.fsk === fsk);
      let ElasticID = 'st';
      if(e === undefined){
        result.SteelElastic.push({
          ElasticID: ElasticID,
          Es:200,
          fsk: fsk,
        });
      } else{
        ElasticID = e.ElasticID;
      }
      result.Steels.push({
        Height: section.steel.I.tension_thickness,  // 断面高さ
        WTop: section.steel.I.tension_width,        // 断面幅（上辺）
        WBottom: section.steel.I.tension_width,     // 断面幅（底辺）
        ElasticID // 材料番号
      })
    }

    return result;
  }

  // 矩形、Ｔ形断面における 上側（圧縮側）の 鉄筋情報を生成する関数
  private getCompresBar(barInfo: any, safety: any): any {
    const result = {
      Bars: new Array(),
      SteelElastic: new Array(),
    };

    // 鉄筋強度の入力
    const rs = barInfo.rs;

    const fsy = barInfo.fsy;
    const id = "t" + fsy.id;

    result.SteelElastic.push({
      fsk: fsy.fsy / rs,
      Es: 200,
      ElasticID: id,
    });

    // 鉄筋径
    const dia: string = barInfo.mark + barInfo.rebar_dia;

    // 鉄筋情報を登録
    let rebar_n = barInfo.rebar_n;
    const dsc = barInfo.dsc / barInfo.cos;
    const space = barInfo.space / barInfo.cos;
    for (let i = 0; i < barInfo.n; i++) {
      const dst: number = dsc + i * space;
      const Steel1 = {
        Depth: dst,
        i: dia,
        n: Math.min(barInfo.line, rebar_n * barInfo.cos),
        IsTensionBar: false,
        ElasticID: id,
      };
      result.Bars.push(Steel1);
      rebar_n = rebar_n - barInfo.line;
    }

    return result;
  }

  // 矩形、Ｔ形断面における 側面鉄筋 の 鉄筋情報を生成する関数
  private getSideBar( barInfo: any, safety: any): any {

    const result = {
      Bars: new Array(),
      SteelElastic: new Array(),
    };

    if (barInfo === null) {
      return result; // 側方鉄筋の入力が無い場合
    }

    // 鉄筋強度
    const fsy1 = barInfo.fsy;
    const id = "s" + fsy1.id;

    // 鉄筋径
    let dia: string = barInfo.mark + barInfo.side_dia;

    // 鉄筋情報を登録
    for (let i = 0; i < barInfo.n; i++) {
      const Steel1 = {
        Depth: barInfo.cover + i * barInfo.space,
        i: dia,
        n: barInfo.line,
        IsTensionBar: false,
        ElasticID: id,
      };
      result.Bars.push(Steel1);
    }

    // 鉄筋強度の入力
    const rs = barInfo.rs;

    result.SteelElastic.push({
      fsk: fsy1.fsy / rs,
      Es: 200,
      ElasticID: id,
    });

    return result;
  }

}
