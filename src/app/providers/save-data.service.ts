import { Injectable } from "@angular/core";
import { DataHelperModule } from "./data-helper.module";
import { InputBarsService } from "../components/bars/bars.service";
import { InputBasicInformationService } from "../components/basic-information/basic-information.service";
import { InputDesignPointsService } from "../components/design-points/design-points.service";
import { InputFatiguesService } from "../components/fatigues/fatigues.service";
import { InputMembersService } from "../components/members/members.service";
import { InputSafetyFactorsMaterialStrengthsService } from "../components/safety-factors-material-strengths/safety-factors-material-strengths.service";
import { InputSectionForcesService } from "../components/section-forces/section-forces.service";
import { InputCalclationPrintService } from "../components/calculation-print/calculation-print.service";
import { InputCrackSettingsService } from "../components/crack/crack-settings.service";
import { InputSteelsService } from "../components/steels/steels.service";
import { ShearStrengthService } from "../components/shear/shear-strength.service";
import { AlertDialogComponent } from "../components/alert-dialog/alert-dialog.component";

import packageJson from '../../../package.json';
import { InputMaterialStrengthVerificationConditionService } from "../components/material-strength-verification-conditions/material-strength-verification-conditions.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { TranslateService } from "@ngx-translate/core";

import { read, utils, WorkBook, writeFile } from 'xlsx';
import { forEach } from "jszip";
import { each } from "jquery";

@Injectable({
  providedIn: "root",
})
export class SaveDataService {
  // ピックアップファイル
  private pickup_filename: string;
  private pickup_data: Object;
  private arrayAxis: any[];
  //={
  //  1:[
  //    { index: 1, m_no, p_id, position,
  //      M:{max:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb },
  //         min:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb }},
  //      S:{max:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb },
  //         min:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb }},
  //      N:{max:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb },
  //         min:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb }},
  //    },
  //    { index: 2, m_no, ...
  //  ],
  //  2:[
  //    ...
  // }

  constructor(
    private helper: DataHelperModule,
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private shear: ShearStrengthService,
    private crack: InputCrackSettingsService,
    private fatigues: InputFatiguesService,
    private members: InputMembersService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private material: InputMaterialStrengthVerificationConditionService,
    private force: InputSectionForcesService,
    private calc: InputCalclationPrintService,
    private modalService: NgbModal,
    private translate: TranslateService,
  ) {
    this.arrayAxis = this.safety.arrayAxis;
    this.clear();
  }

  public clear(): void {
    this.pickup_filename = "";
    this.pickup_data = {};
    this.basic.clear();
    this.members.clear();
    this.shear.clear();
    this.crack.clear();
    this.points.clear();
    this.bars.clear();
    this.fatigues.clear();
    this.safety.clear();
    this.force.clear();
    this.material.clear();
    this.calc.clear();
  }

  // 断面力て入力モードかどうか判定する
  public isManual(): boolean {
    if (this.pickup_filename.trim().length === 0) {
      return true;
    } else {
      return false;
    }
  }

  // 3次元解析のピックアップデータかどうか判定する
  public is3DPickUp(): boolean {
    if (this.helper.getExt(this.pickup_filename) === "csv") {
      return true;
    }
    return false;
  }

  // ピックアップファイルを読み込む
  public readPickUpData(str: string, filename: string, checkOpenDSD?:boolean) {
    try {
      const tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成
      // 各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
      const pickup1 = {};
      let i: number = 0;
      let oldMark: string = '';
      const mode = this.helper.getExt(filename);

      for (let j = 1; j < tmp.length; ++j) {
        const line = tmp[j].trim();
        if (line.length === 0) {
          continue;
        }

        let data: any;
        switch (mode) {
          case "pik":
            data = this.pikFileRead(tmp[j]); // 2次元（平面）解析のピックアップデータ
            break;
          case "csv":
            data = this.csvFileRead(line); // 3次元（立体）解析のピックアップデータ
            break;
          default:
            this.pickup_filename = "";
            this.pickup_data = {};
            return;
        }
        // 最初の行か判定する
        if (data.mark !== oldMark) {
          i = 0;
        }
        oldMark = data.mark;

        // 
        if (!(data.pickUpNo in pickup1)) {
          pickup1[data.pickUpNo] = new Array();
        }
        const pickup2 = pickup1[data.pickUpNo];

        let pickup3 = { index: i + 1, m_no: data.m_no, p_id: data.p_id, position: data.position };
        if (pickup2.length > i) {
          pickup3 = pickup2[i];
        } else {
          pickup2.push(pickup3);
        }

        if (!(data.mark in pickup3)) {
          pickup3[data.mark] = { max: {}, min: {} };
        }
        const pickup4 = pickup3[data.mark];

        pickup4.max = {
          Mtd: data.maxMdx,
          Mdy: data.maxMdy,
          Mdz: data.maxMdz,
          Vdy: data.maxVdy,
          Vdz: data.maxVdz,
          Nd: data.maxNd,
          comb: data.maxPickupCase,
        };

        pickup4.min = {
          Mtd: data.minMdx,
          Mdy: data.minMdy,
          Mdz: data.minMdz,
          Vdy: data.minVdy,
          Vdz: data.minVdz,
          Nd: data.minNd,
          comb: data.minPickupCase,
        };

        i += 1;
      }

      this.basic.setPickUpData();
      this.members.setPickUpData(pickup1);
      this.points.setPickUpData(pickup1, mode, checkOpenDSD);
      this.bars.setPickUpData();
      this.steel.setPickUpData();
      this.basic.setPickUpData();
      this.shear.setPickUpData();
      this.crack.setPickUpData();
      this.fatigues.setPickUpData();
      // this.safety.clear();
      this.force.clear();

      this.pickup_filename = filename;
      this.pickup_data = pickup1;
    } catch {
      this.pickup_filename = "";
      this.pickup_data = {};
    }
  }

  // .pik 形式のファイルを 1行読む
  private pikFileRead(line: string): any {
    const mark: string = line.slice(5, 10).trim();
    let ma: string = mark;
    switch (mark) {
      case "M":
        ma = "mz";
        break;
      case "S":
        ma = "fy";
        break;
      case "N":
        ma = "fx";
        break;
    }

    const result = {
      pickUpNo: line.slice(0, 5).trim(),
      mark: ma,
      m_no: this.helper.toNumber(line.slice(10, 15)),
      maxPickupCase: line.slice(15, 20).trim(),
      minPickupCase: line.slice(20, 25).trim(),
      p_id: line.slice(25, 30).trim(),
      position: this.helper.toNumber(line.slice(30, 40)),
      maxMdx: 0,
      maxMdy: 0,
      maxMdz: this.helper.toNumber(line.slice(40, 50)),
      maxVdy: this.helper.toNumber(line.slice(50, 60)),
      maxVdz: 0,
      maxNd: -1 * this.helper.toNumber(line.slice(60, 70)),
      minMdx: 0,
      minMdy: 0,
      minMdz: this.helper.toNumber(line.slice(70, 80)),
      minVdy: this.helper.toNumber(line.slice(80, 90)),
      minVdz: 0,
      minNd: -1 * this.helper.toNumber(line.slice(90, 100)),
    };
    return result;
    // ※ このソフトでは 圧縮がプラス(+)
  }

  // .csv 形式のファイルを 1行読む
  private csvFileRead(tmp: string): any {
    const line = tmp.split(",");
    return {
      pickUpNo: line[0].trim(),
      mark: line[1].trim(),
      m_no: this.helper.toNumber(line[2].trim()),
      maxPickupCase: line[3].trim(),
      minPickupCase: line[4].trim(),
      p_id: line[5].trim(),
      position: this.helper.toNumber(line[6]),
      maxNd: -1 * this.helper.toNumber(line[7]),
      maxVdy: this.helper.toNumber(line[8]),
      maxVdz: this.helper.toNumber(line[9]),
      maxMdx: this.helper.toNumber(line[10]),
      maxMdy: this.helper.toNumber(line[11]),
      maxMdz: this.helper.toNumber(line[12]),
      minNd: -1 * this.helper.toNumber(line[13]),
      minVdy: this.helper.toNumber(line[14]),
      minVdz: this.helper.toNumber(line[15]),
      minMdx: this.helper.toNumber(line[16]),
      minMdy: this.helper.toNumber(line[17]),
      minMdz: this.helper.toNumber(line[18]),
    };
    // ※ このソフトでは 圧縮がプラス(+)
  }

  // Midasのピックアップファイルを読み込む
  public readMidasData(wb: WorkBook){
    // 有効判定
    if(wb.SheetNames.length == 0){
      return;
    }
    // 3次元解析のピックアップデータかどうか判定する
    if(wb.SheetNames.length < 3){
      alert("3次元解析のピックアップデータは対応していません。");
      return;
    }
    // .pik 形式に変換する
    let result = "Convert Midas File\n";

    const ws_name_Nd = wb.SheetNames.find((name) => name.includes("軸力")) || null;
    const ws_name_Vd = wb.SheetNames.find((name) => name.includes("せん断")) || null;
    const ws_name_Md = wb.SheetNames.find((name) => name.includes("曲げ")) || null;
    if(ws_name_Nd == null || ws_name_Vd == null || ws_name_Md == null){
      alert("「軸力」「せん断」「曲げ」シートがありません");
      return;
    }
    // 
    const ws_Nd = wb.Sheets[ws_name_Nd];
    const ws_Vd = wb.Sheets[ws_name_Vd];
    const ws_Md = wb.Sheets[ws_name_Md];

    // PickUpNo
    const range_Nd  = utils.decode_range(ws_Nd['!ref']);
    // const range_Vd  = utils.decode_range(ws_Vd['!ref']);
    // const range_Md  = utils.decode_range(ws_Md['!ref']);

    // Sheet ws_Nd の 2行目と3行目に値がある列を探す
    const PickUpCase = [];
    for (let col = 8; col <= range_Nd.e.c; col++) {
      let val2 = this.getCellValue(ws_Nd, 1, col);
      const val3 = this.getCellValue(ws_Nd, 2, col);
      if (val2.trim().length > 0) {
        if (val3.trim().length > 0){
          val2 += "-" + val3;
        }
        PickUpCase.push(val2);
      }
    }

    // 部材No,最大CaseNo,最小CaseNo,着目点,着目点距離 を取得
    /// Sheet ws_Nd の 5行目から値がある行を探す
    const rows = [];
    for (let row = 4; row <= range_Nd.e.r; row++) {
      const mNo = this.getCellValue(ws_Nd, row, 2);
      if (mNo.toString().trim().length > 0) {
        const point_name =this.getCellValue(ws_Nd, row, 6);
        const l =this.getCellValue(ws_Nd, row, 7);
        rows.push({
          mNo: mNo,
          point_name,
          l: Number(l),
          row
        });
      }
    }

    // 書き込む
    for (let No = 0; No < PickUpCase.length; No++) {
      const key = ["M", "S", "N"];

      for (let i = 0; i < key.length; i++) {

        rows.forEach((item) => {
          const mz = this.getCellValue(ws_Md, item.row, 8 + No);
          const fy = this.getCellValue(ws_Vd, item.row, 8 + No);
          const fx = this.getCellValue(ws_Nd, item.row, 8 + No);

          result += this.spacePadding((No + 1).toString(), 5);
          result += this.spacePadding(key[i], 5);
          result += this.spacePadding(item.mNo, 5);
          result += this.spacePadding(PickUpCase[No], 5);
          result += this.spacePadding(PickUpCase[No], 5);
          result += this.spacePadding(item.point_name, 5);
          result += this.spacePadding(item.l.toFixed(3), 10);

          result += this.spacePadding(Number(mz).toFixed(2), 10);
          result += this.spacePadding(Number(fy).toFixed(2), 10);
          result += this.spacePadding(Number(fx).toFixed(2), 10);

          result += this.spacePadding(Number(mz).toFixed(2), 10);
          result += this.spacePadding(Number(fy).toFixed(2), 10);
          result += this.spacePadding(Number(fx).toFixed(2), 10);

          result += "\n";
        });
      }
    }
    
    // 読み込み処理を行う
    let fileName = wb.Props?.Title || 'Convert Midas File'
    fileName += ".pik";
    this.readPickUpData(result, fileName, false);
  }

  // 指定の文字数になるまでスペースを追加する
  private spacePadding(val, len) {
    for (var i = 0; i < len; i++) {
      val = " " + val;
    }
    return val.slice(-1 * len);
  }

  // シートからセルの値を取得
  private getCellValue(ws, row, col): string {
    const ad = utils.encode_cell({ r: row, c: col });
    return ws[ad].v;
  }

  // ファイルに保存用データを生成
  public getInputText(): string {

    const jsonData = this.getInputJson();

    // string 型にする
    const result: string = JSON.stringify(jsonData);
    return result;
  }

  public getInputJson(): any {
    return {
      ver: packageJson.version,

      // ピックアップ断面力
      pickup_filename: this.pickup_filename,
      pickup_data: this.pickup_data,
      // 設計条件
      basic: this.basic.getSaveData(),
      // 部材情報
      members: this.members.getSaveData(),
      // せん断耐力
      shear: this.shear.getSaveData(),
      // ひび割れ情報
      crack: this.crack.getSaveData(),
      // 着目点情報
      points: this.points.getSaveData(),
      // 鉄筋情報
      bar: this.bars.getSaveData(),
      // 鉄骨情報
      // steel: this.steel.getSaveData(),
      // 疲労情報
      fatigues: this.fatigues.getSaveData(),
      // 安全係数情報
      safety: this.safety.getSaveData(),
      // 断面力手入力情報
      force: this.force.getSaveData(),
      // 計算印刷設定
      calc: this.calc.getSaveData(),
      // axis_max_min: this.safety.getAxisForceJson()
    };
  }

  // インプットデータを読み込む
  public readInputData(inputText: string) {
    const jsonData: {} = JSON.parse(inputText);
    this.processData(jsonData);
    this.setInputData(jsonData);
  }
  processData(data: any) {
    if (data && Array.isArray(data.steel)) {
      let hasNonNullValues = false;

      // data.steel.forEach(steelItem => {
      //   if ((steelItem.I && Object.values(steelItem.I).some(value => value !== null)) ||
      //       (steelItem.H && Object.values(steelItem.H).some(value => value !== null))) {
      //     hasNonNullValues = true;
      //   }
      // });
      data.steel.forEach(steelItem => {
        // Check if the 'I' or 'H' properties of the current steelItem have any non-null values
        const IValues = steelItem.I ? Object.entries(steelItem.I).filter(([key, value]) => key !== 'title' && value !== null) : [];
        const HValues = steelItem.H ? Object.entries(steelItem.H).filter(([key, value]) => key !== 'title' && value !== null) : [];
  
        if (IValues.length > 0 || HValues.length > 0) {
          hasNonNullValues = true;
        }
      });

      // Remove the steel array
      delete data.steel;

      if (hasNonNullValues) {
        // this.showMessage = true;
        const modalRef = this.modalService.open(AlertDialogComponent, {
          centered: true,
          backdrop: true,
          keyboard: true,
          size: "sm",
          windowClass: "confirm-modal",
        });
        modalRef.componentInstance.message = this.translate.instant(
          "menu.removed_steel"
        );
        modalRef.componentInstance.dialogMode = "confirm";
        modalRef.componentInstance.close = false;
        // const result = await modalRef.result;
        // return result === "yes";
      }

    }
  }

  public setInputData(jsonData: any) {
    this.clear();

    // ピックアップ断面力
    if ("pickup_filename" in jsonData) {
      this.pickup_filename = jsonData.pickup_filename;
    }
    if ("pickup_data" in jsonData) {
      this.pickup_data = jsonData.pickup_data;
    } else {
      this.pickup_filename = '';
    }

    // 設計条件
    if ("basic" in jsonData) {
      this.basic.setSaveData(jsonData.basic);
    } else {
      this.basic.clear();
    }
    // 部材情報
    if ("members" in jsonData) {
      this.members.setSaveData(jsonData.members);
    } else {
      this.members.clear();
    }
    // ひび割れ情報
    if ("crack" in jsonData) {
      this.crack.setSaveData(jsonData.crack);
    } else {
      this.crack.clear();
    }
    // 着目点情報
    if ("points" in jsonData) {
      this.points.setSaveData(jsonData.points,this.is3DPickUp(),this.isManual(),jsonData.bar);
    } else {
      this.points.clear();
    }
    // せん断耐力式
    if ("shear" in jsonData) {
      this.shear.setSaveData(jsonData.shear);
      this.shear.setLaFromPoint();
    } else {
      this.shear.clear();
    }
    // 鉄筋情報
    if ("bar" in jsonData) {
      this.bars.setSaveData(jsonData.bar);
    } else {
      this.bars.clear();
    }
    // 鉄骨情報
    // if ("steel" in jsonData) {
    //   this.steel.setSaveData(jsonData.steel);
    // } else {
    //   this.steel.clear();
    // }
    // 疲労情報
    if ("fatigues" in jsonData) {
      this.fatigues.setSaveData(jsonData.fatigues);
    } else {
      this.fatigues.clear();
    }
    // 安全係数情報
    if ("safety" in jsonData) {
      if ("axis_max_min" in jsonData){
        this.safety.setSaveData(jsonData.safety, jsonData.axis_max_min);
      }else{
        this.safety.setSaveData(jsonData.safety);
      }
      this.material.setSaveData(jsonData.safety);
    } else {
      this.safety.clear();
      this.material.clear();
    }
    // 断面力手入力情報
    if ("force" in jsonData) {
      this.force.setSaveData(jsonData.force);
    } else {
      this.force.clear();
    }
    // 計算印刷設定
    if ("calc" in jsonData) {
      this.calc.setSaveData(jsonData.calc);
    } else {
      this.calc.clear();
    }

    this.updateOldData(jsonData);
  }

  //Hide design condition
  public hideDC(inputText: any): boolean {
    const jsonData: any = JSON.parse(inputText);
    if ("members" in jsonData) {
      const hide = this.members.checkHideDesignCondition(jsonData.members);
      return hide;
    }
    return false;
  }

  /// ファイルのバージョンによってはデータに手を加える必要がある
  private updateOldData(jsonData: object): void {

    const programVer: string = packageJson.version;
    let filetVer: string = '0.0.0';
    if ('ver' in jsonData)
      filetVer = jsonData['ver'] as string;

    if (this.isOlder('1.13.7', filetVer)) {

      //console.log("translate!!");

      // 各国語の形状名を形状名キーに直す
      this.members.translateData_old_to_1_13_7();
      return;
    }
  }

  // バージョン文字列比較処理
  private isOlder(a: string, b: string): boolean {
    if (a === b) return false;
    const aUnits = a.split(".");
    const bUnits = b.split(".");
    // 探索幅に従ってユニット毎に比較していく
    for (var i = 0; i < Math.min(aUnits.length, bUnits.length); i++) {
      if (parseInt(aUnits[i]) > parseInt(bUnits[i])) return true; // A > B
      if (parseInt(aUnits[i]) < parseInt(bUnits[i])) return false;  // A < B
    }
    return false;
  }

  public getPickUpData(): Object {
    return JSON.parse(
      JSON.stringify({
        temp: this.pickup_data
      })
    ).temp;
  }

  public getPickupFilename(): string {
    return this.pickup_filename;
  }

  public getBasicData(): any{
    return this.basic;
  }

  public checkVerFile(inputText: string) {
    this.clear();
    const jsonData: any = JSON.parse(inputText);
    if ("basic" in jsonData) {
      let specification1_list = jsonData.basic.specification1_list
      let indexRoad = specification1_list.findIndex(data=> data.id === 2 )
      if (indexRoad !== -1) {
        if (specification1_list[indexRoad].selected) {
          return true
        } else {
          return false
        }
      } else {
        return false
      }
    } else {
      return false
    }
  }
}
