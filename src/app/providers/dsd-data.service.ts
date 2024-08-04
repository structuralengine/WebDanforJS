import { Injectable } from '@angular/core';
import { SaveDataService } from './save-data.service';

import * as Encord from 'encoding-japanese';
import { DataHelperModule } from './data-helper.module';
import { InputBarsService } from '../components/bars/bars.service';
import { InputBasicInformationService } from '../components/basic-information/basic-information.service';
import { InputCalclationPrintService } from '../components/calculation-print/calculation-print.service';
import { InputCrackSettingsService } from '../components/crack/crack-settings.service';
import { InputDesignPointsService } from '../components/design-points/design-points.service';
import { InputFatiguesService } from '../components/fatigues/fatigues.service';
import { InputMembersService } from '../components/members/members.service';
import { InputSafetyFactorsMaterialStrengthsService } from '../components/safety-factors-material-strengths/safety-factors-material-strengths.service';
import { InputSectionForcesService } from '../components/section-forces/section-forces.service';
import { InputSteelsService } from '../components/steels/steels.service';
import { ShearStrengthService } from '../components/shear/shear-strength.service';
import { data } from 'jquery';
import { worker } from 'cluster';

@Injectable({
  providedIn: 'root'
})
export class DsdDataService {

  private float_max: number = 3.4 * Math.pow(10, 38);
  private float_min: number = 3.4 * Math.pow(10, -38);  //1.4 * Math.pow(10,-45);
  private byte_max: number = 255;

  constructor(
    private save: SaveDataService,
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private shear: ShearStrengthService,
    private crack: InputCrackSettingsService,
    private fatigues: InputFatiguesService,
    private members: InputMembersService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private force: InputSectionForcesService,
    private calc: InputCalclationPrintService,
    private helper: DataHelperModule
  ) { }

  /**
   * DSDデータの読み込み
   * @param buffer 
   * @returns ピックアップモードの場合はピックアップファイルへのフルパス\
   * 断面力モードの場合はnull
   */
  public readDsdData(buffer: any): string {
    const old = this.save.getInputJson();  // 現在のデータをキープ（読み込みエラーが発生したら元のデータに戻すため）
    try {
      this.save.clear();
      const buff: any = {
        u8array: new Uint8Array(buffer),  //Byteの配列
        byteOffset: 0  //u8arrayの現在の読み込み開始位置
      };

      // DSDデータバージョン、断面力データ数
      const verInfo = this.IsDSDFile(buff);      
      buff['datVersID'] = verInfo.datVersID;
      buff['isManualInput'] = (verInfo.ManualInput > 0);

      // 断面力データ（断面力モードの場合のみ）
      if (buff.isManualInput) {
        this.FrmManualGetTEdata(buff, verInfo.ManualInput);
      }
      // 基本データ、ピックアップ番号
      this.GetKIHONscrn(buff);
      // 部材・断面データ、ひび割れ検討条件、疲労検討用加工低減係数
      this.GetBUZAIscrn(buff)
      // 安全係数データ
      this.GetKEISUscrn(buff)
      // 算出点データ
      this.GetSANSHUTUscrn(buff)
      // 鉄筋配置データ、疲労検討条件
      this.GetTEKINscrn(buff)
      // 計算・印刷設定※未使用
      // this.GetPrtScrn(buff)

      // ピックアップモードの場合はピックアップファイルへのフルパスを返す
      if (buff.isManualInput) {
        return null;
      } else {
        return buff.PickFile.trim();
      }
    } catch (e) {
      // dsdファイル読み込み中にエラーが発生した場合は元々のデータに戻す
      this.save.setInputData(old);
      throw (e);
    }
  }

  // ピックアップファイルを読み込む
  private readPickUpData(PickFile: string, file: any) {
    file.name = PickFile;
    this.fileToText(file)
      .then(text => {
        this.save.readPickUpData(text, file.name); // データを読み込む
      })
      .catch(err => {
        console.log(err);
      });
  }

  // ファイルのテキストを読み込む
  private fileToText(file): any {
    const reader = new FileReader();
    reader.readAsText(file);
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
    });
  }

  /**
   * 基本データ、ピックアップ番号の読み込み
   * @param buff 
   */
  private GetKIHONscrn(buff: any): void {
    // デフォルトの基本データの準備
    this.basic.clear();
    
    // 未使用
    this.readSingle(buff);
    this.readByte(buff);

    // 仕様
    const dt1Spec = this.readByte(buff);
    if (this.isOlder('4.0.0', buff.datVersID)) {  // フィリピン版の場合は設定しない（デフォルト設定）
      if (dt1Spec != null && dt1Spec >= 0 && dt1Spec <= 2) {
        this.basic.set_specification2(dt1Spec);
      }
    }

    // 未使用
    this.readInteger(buff);

    // 杭の施工条件
    const dt1Sekou = this.readByte(buff);
    buff['dt1Sekou'] = dt1Sekou;  // buffで保持しておき安全係数データの読み込み時に設定する

    // 耐用年数
    const dt1Shusei = this.readSingle(buff);
    this.fatigues.service_life = dt1Shusei;

    // 未使用
    this.readByte(buff)
    if (!this.isOlder('0.1.6', buff.datVersID)) {
      this.readInteger(buff);
    }

    // ピックアップ番号の一時格納用変数
    let pickTmp : number;

    // 耐久性曲げ照査（縁応力度）ピックアップ番号
    pickTmp = this.readByte(buff);
    this.basic.set_pickup_moment(0, pickTmp);
    // 耐久性曲げ照査（永久作用）ピックアップ番号
    pickTmp = this.readByte(buff);
    if (pickTmp != null) {
      this.basic.set_pickup_moment(1, pickTmp);
      this.readByte(buff);
    } else {
      pickTmp = this.readByte(buff);
      this.basic.set_pickup_moment(1, pickTmp);
    }
    // 耐久性曲げ照査（変動作用）ピックアップ番号※未使用
    this.readByte(buff);
    // 耐久性曲げ照査（永久作用）ピックアップ番号
    if (pickTmp != null){
      pickTmp = this.readByte(buff);
      this.basic.set_pickup_moment(1, pickTmp);
    } else {
      this.readByte(buff);
    }
    // 曲げ照査用ピックアップ番号（3:疲労永久、4:疲労永久＋変動、5:破壊、6:復旧性地震時以外、7:復旧性地震時）
    for (let i = 3; i <= 7; i++) {
      pickTmp = this.readByte(buff);
      this.basic.set_pickup_moment(i, pickTmp);
    }
    // 未使用
    this.readByte(buff);
    this.readByte(buff);

    // せん断照査用ピックアップ番号
    // （0:耐久性ひび割れ判定、1:耐久性永久、2:耐久性変動※未使用、3:疲労永久、4:疲労永久＋変動、5:破壊、6:復旧性地震時以外、7:復旧性地震時）
    for (let i = 0; i <= 7; i++) {
      pickTmp = this.readByte(buff);
      this.basic.set_pickup_shear_force(i, pickTmp);
    }
    // 未使用
    this.readByte(buff);
    this.readByte(buff);

    // 縁応力度が制限値以内でも ひび割れ幅の検討を行う※未使用
    if (!this.isOlder('1.3.10', buff.datVersID)) {
      const iOutputHibiware = this.readInteger(buff);
      //this.basic.set_conditions('JR-000', iOutputHibiware !== 0);
    }
    // T形断面でフランジ側引張は矩形断面で計算する※未使用
    if (!this.isOlder('1.3.11', buff.datVersID)) {
      const iOutputTgataKeisan = this.readInteger(buff);
      //this.basic.set_conditions('JR-002', iOutputTgataKeisan !== 0);
    }

    // 疲労検討用列車本数(本/日)
    if (!this.isOlder('1.3.13', buff.datVersID)) {
      const trainA = this.readSingle(buff);
      this.fatigues.train_A_count = Math.round(trainA);
      const trainB = this.readSingle(buff);
      this.fatigues.train_B_count = Math.round(trainB);
    }

    // 未使用
    if (!this.isOlder('1.3.14', buff.datVersID)) {
      this.readByte(buff);
    }

    // // 円形断面で鉄筋を頂点に１本配置する※未使用
    if (!this.isOlder('1.4.1', buff.datVersID)) {
      const dt1ChoutenCheck = this.readByte(buff);
      //this.basic.set_conditions('JR-003', dt1ChoutenCheck !== 0);
    }

    // ひび割れ幅制限値に用いるかぶりは 100mm を上限とする※未使用
    if (!this.isOlder('2.1.2', buff.datVersID)) {
      const gひび割れ制限 = this.readByte(buff);
      //this.basic.set_conditions('JR-001', gひび割れ制限 !== 0);
    }

    // ひび割れ幅制限値(mm)
    if (!this.isOlder('3.1.8', buff.datVersID)) {
      const crackLim = this.readSingle(buff);
      buff['crackLim'] = crackLim;  // buffで保持しておき部材・断面データの読み込み時に設定する
    }
  }

  /**
   * 部材・断面データ、ひび割れ検討条件、疲労検討用加工低減係数の読み込み
   * @param buff 
   */
  private GetBUZAIscrn(buff: any): void {
    // 部材数
    const numMember = this.readInteger(buff)
    
    let mData: any = [];
    for (let i = 0; i < numMember; i++) {
      try {
        // 部材に含まれる第1算出点へのインデックス
        const index = this.readInteger(buff) + 1;
        // 部材に含まれる算出点数
        const iNumCalc = this.readInteger(buff);
        // 部材番号
        const iBzNo = this.readInteger(buff);

        // データ保存先のオブジェクトを取得
        let crackData = this.crack.getTableColumn(index);  // 第1算出点のひび割れ検討条件
        let fatigueData = this.fatigues.getTableColumn(index);  // 第1算出点の疲労検討条件
        let member = this.members.getTableColumns(iBzNo);  // 部材データ

        // ひび割れ条件、疲労条件データの部材番号の同期
        crackData.m_no = member.m_no;
        fatigueData.m_no = member.m_no;

        // 部材長(m)
        const sLeng = this.readSingle(buff);
        member.m_len = sLeng;
        // 部材グループ番号（ID）
        const strMark = this.readString(buff, 32);
        member.g_id = strMark.trim();
        member.g_no = this.helper.toNumber(member.g_id);
        //　部材グループ名
        const strBuzaiName = this.readString(buff, 32);
        member.g_name = strBuzaiName.trim();
        fatigueData.g_name = member.g_name;
        crackData.g_name = member.g_name;

        // 断面番号
        const intDanmenType = this.readInteger(buff);
        member.shape = intDanmenType;
        // 寸法値(mm)
        for (let i = 0; i < 4; i++) {
          let sizeTmp = this.readSingle(buff);
          if (sizeTmp > 0) {
            if (this.isOlder('3.1.1', buff.datVersID)) {
              sizeTmp *= 10;  // 3.1.1より前バージョンはcm入力のためmmに変更
            }
            switch (i) {
              case 0:
                if (member.shape == 3) { sizeTmp *= 2; }  // 円形の場合は直径に変換
                member.B = sizeTmp;
                break;
              case 1:
                if (member.shape != 3) { member.H = sizeTmp; }  // 円形以外
                break;
              case 2:
                if (member.shape == 2) { member.Bt = sizeTmp; }  // T形
                break;
              case 3:
                if (member.shape == 2) { member.t = sizeTmp; }  // T形
                break;
            }
          }
        }

        // 環境条件（曲げ上側引張）
        const envBU = this.readInteger(buff);
        if (envBU > 0 && envBU <= 3) { crackData.con_u = envBU; }
        // 環境条件（曲げ下側引張）
        const envBL = this.readInteger(buff);
        if (envBL > 0 && envBL <= 3) { crackData.con_l = envBL; }
        // 環境条件（せん断）
        if (!this.isOlder('0.1.4', buff.datVersID)) {
          const envS = this.readInteger(buff);
          if (envS > 0 && envS <= 3) { crackData.con_s = envS; }
        }

        // 外観照査の実施有無（上側引張）
        const bytHibi1 = this.readByte(buff);
        crackData.vis_u = bytHibi1 != 0;
        // 外観照査の実施有無（下側引張）
        const bytHibi2 = this.readByte(buff);
        crackData.vis_l = bytHibi2 != 0;

        // ε'csd(*10^-6)※整数部が上側引張用、小数点以下が下側引張用
        if (!this.isOlder("2.4.0", buff.datVersID)) {
          let sngEcsd = this.readSingle(buff);
          if (sngEcsd != null) {
            let intEcsd = Math.floor(sngEcsd);
            if (intEcsd > 0) {
              crackData.ecsd_u = intEcsd;
              crackData.ecsd_l = intEcsd;
            }
            sngEcsd = (sngEcsd - intEcsd) * 100000;
            intEcsd = Math.floor(sngEcsd);
            if (intEcsd > 0) {
              crackData.ecsd_l = intEcsd;
            }
          }
        }
        // kr
        if (!this.isOlder("0.1.4", buff.datVersID)) {
          const kr = this.readSingle(buff);
          if (kr > 0) { crackData.kr = kr; }
        }

        // 疲労照査用の加工低減係数（軸方向鉄筋、スターラップ、折曲げ鉄筋）
        if (this.isOlder("0.1.4", buff.datVersID)) {
          const intHirou1 = this.readInteger(buff);
          if (intHirou1 > 0) {
            fatigueData.M1.r1_1 = intHirou1;
            fatigueData.M2.r1_1 = intHirou1;
          }
          const intHirou2 = this.readInteger(buff);
          if (intHirou2 > 0) {
            fatigueData.V1.r1_2 = intHirou2;
            fatigueData.V2.r1_2 = intHirou2;
          }
          const intHirou3 = this.readInteger(buff);
          if (intHirou3 > 0) {
            fatigueData.V1.r1_3 = intHirou3;
            fatigueData.V2.r1_3 = intHirou3;
          }
        } else {
          const sngHirou1 = this.readSingle(buff);
          if (sngHirou1 > 0) {
            fatigueData.M1.r1_1 = Math.round(sngHirou1 * 100) / 100;
            fatigueData.M2.r1_1 = Math.round(sngHirou1 * 100) / 100;
          }
          const sngHirou2 = this.readSingle(buff);
          if (sngHirou2 > 0) {
            fatigueData.V1.r1_2 = Math.round(sngHirou2 * 100) / 100;
            fatigueData.V2.r1_2 = Math.round(sngHirou2 * 100) / 100;
          }
          const sngHirou3 = this.readSingle(buff);
          if (sngHirou3 > 0) {
            fatigueData.V1.r1_3 = Math.round(sngHirou3 * 100) / 100;
            fatigueData.V2.r1_3 = Math.round(sngHirou3 * 100) / 100;
          }
        }

        // k4
        if (!this.isOlder("3.6.1", buff.datVersID)) {
          const sngK4 = this.readSingle(buff);
          crackData.k4 = sngK4;
        }

        // 部材数
        if (this.isOlder("1.3.4", buff.datVersID)) {
          const sngNumBZI = this.readInteger(buff);
          if (sngNumBZI > 0) { member.n = sngNumBZI; }
        } else if (this.isOlder("3.6.2", buff.datVersID)) {
          const sngNumBZI = this.readSingle(buff);
          if (sngNumBZI > 0) { member.n = sngNumBZI; }
        } else if (!this.isOlder("4.0.0", buff.datVersID)
          && this.isOlder("4.1.0", buff.datVersID)) {  // フィリピン版用
          const sngNumBZI = this.readSingle(buff);
          if (sngNumBZI > 0) { member.n = sngNumBZI; }
        } else {
          const strNumBZI = this.helper.toNumber(this.readString(buff, 32));
          if (strNumBZI != null && strNumBZI > 0) { member.n = strNumBZI; }
        }

        // 未使用
        if (!this.isOlder("0.1.3", buff.datVersID)) {
          this.readByte(buff);
        }

        // ひび割れ幅制限値(mm)
        if (!this.isOlder('3.1.8', buff.datVersID)) {
          const crackLim = buff.crackLim;
          if (crackLim != null && crackLim > 0) {
            crackData.wlimit = crackLim;
          }
        }

        // 第2節点以降のデータ登録
        for (let j = index + 1; j < index + iNumCalc; j++) {
          // ひび割れ検討条件
          let crackTmp = this.crack.getTableColumn(j);
          for (const key of Object.keys(crackData)) {
            if (key === 'index') { continue; }
            crackTmp[key] = crackData[key];
          }
          // 疲労検討条件※fatigueDataは配列が含まれるためcloneを取得してからコピーする
          const fatigueData2 = JSON.parse(JSON.stringify(fatigueData));
          let fatigueTmp = this.fatigues.getTableColumn(j);
          for (const key of Object.keys(fatigueData2)) {
            if (key === 'index') { continue; }
            fatigueTmp[key] = fatigueData2[key];
          }       
        }

        // 部材データの保持
        mData.push(member);
      } catch (e) {
        throw (e);
      }
    }

    // 部材データの登録
    this.members.setSaveData(mData)
  }

  /**
   * 安全係数データの読み込み
   * @param buff 
   */
  private GetKEISUscrn(buff: any): void {
    // データ保存先のオブジェクトを取得
    let safetyData = this.safety.getSaveData();

    // バージョン分岐用の変数
    const isOlder328 = this.isOlder('3.2.8', buff.datVersID);
    const isOlder015 = this.isOlder('0.1.5', buff.datVersID);
    const isOlder014 = this.isOlder('0.1.4', buff.datVersID);

    // 部材グループ数
    const iDummyCount = this.readInteger(buff)

    // 部材グループID一覧の取得
    const groupIDs = this.members.getGroupes();

    for (let i = 0; i < iDummyCount; i++) {
      // ひとまず各種データのデフォルトを取得
      const g_id = groupIDs[i];  // 部材グループID
      let safety_factor = this.safety.default_safety_factor();  // 安全係数
      let material_bar = this.safety.default_material_bar();  // 鉄筋材料
      let material_steel = this.safety.default_material_steel();  // 鉄骨材料※未使用
      let material_concrete = this.safety.default_material_concrete();  // コンクリート材料
      let pile_factor = this.safety.default_pile_factor();  // 杭の施工条件

      // 安全係数（0:耐久性・使用性、1:疲労破壊、2:破壊、3:復旧性地震時以外、4:復旧性地震時、5:最小鉄筋量※未使用）
      for (let ii = 0; ii <= 5; ii++) {
        // 考慮する鉄筋範囲
        const mgTkin = this.readByte(buff);
        if (ii < 5 && mgTkin != null && mgTkin > 0 && mgTkin <= 3) {
          safety_factor[ii].range = mgTkin;
        }
        // 全安全係数の値の取得
        let safetyAll = [9]
        for (let j = 0; j < 9; j++) {
          safetyAll[j] = this.readSingle(buff);
        }
        // 安全係数の格納
        if (ii == 5) { continue; }  // 最小鉄筋量は未使用なのでスキップ
        if (isOlder328) {
          safety_factor[ii].M_rc = safetyAll[0];  // 曲げ照査用のコンクリートの材料係数
          safety_factor[ii].V_rc = safetyAll[1];  // せん断照査用のコンクリートの材料係数
          safety_factor[ii].M_rs = safetyAll[2];  // 曲げ照査用の鋼材の材料係数
          safety_factor[ii].V_rs = safetyAll[3];  // せん断照査用の鋼材の材料係数
          safety_factor[ii].M_rbs = safetyAll[4];  // 曲げ照査用の部材係数
          safety_factor[ii].V_rbc = safetyAll[5];  // せん断照査のVcd、Vwcd用の部材係数
          safety_factor[ii].ri = safetyAll[6];  // 構造物係数
          safety_factor[ii].V_rbs = safetyAll[7];  // せん断照査のVsd用の部材係数
          safety_factor[ii].V_rbv = safetyAll[8];  // せん断照査のVdd用の部材係数
        } else {
          safety_factor[ii].M_rc = safetyAll[0];  // 曲げ照査用のコンクリートの材料係数
          safety_factor[ii].M_rs = safetyAll[1];  // 曲げ照査用の鋼材の材料係数
          safety_factor[ii].M_rbs = safetyAll[2];  // 曲げ照査用の部材係数
          safety_factor[ii].V_rc = safetyAll[3];  // せん断照査用のコンクリートの材料係数
          safety_factor[ii].V_rs = safetyAll[4];  // せん断照査用の鋼材の材料係数
          safety_factor[ii].V_rbc = safetyAll[5];  // せん断照査のVcd、Vwcd用の部材係数
          safety_factor[ii].V_rbs = safetyAll[6];  // せん断照査のVsd用の部材係数
          safety_factor[ii].V_rbv = safetyAll[7];  // せん断照査のVdd用の部材係数
          safety_factor[ii].ri = safetyAll[8];  // 構造物係数
        }
      }

      // 鉄筋材料※折曲げ鉄筋（bend）は未使用
      for (const k1 of ['tensionBar', 'sidebar', 'stirrup', 'bend']) {  // 鉄筋種別
        for (const k2 of ['fsy', 'fsu']) {  // 強度種別
          for (let j = 0; j < 2; j++) {  // 分類{0:D25以下、1:D29以上}
            let Kyodo = this.readInteger(buff);
            if (Kyodo != null && Kyodo > 0) {
              if (material_bar.length < (j + 1)) { continue; }
              const mb = material_bar[j];  // 分類オブジェクトの取得
              if (mb == null) { continue; }
              if (!(k1 in mb)) { continue; }
              const mbk1 = mb[k1];  // 鉄筋種別オブジェクトの取得
              if (!(k2 in mbk1)) { continue; }
              // 強度の登録
              material_bar[j][k1][k2] = Kyodo;
            }
          }
        }
      }

      // 未使用
      if (!isOlder015) {
        for (let j = 0; j < 2; j++){
          const KyodoD = this.readInteger(buff);
          // 分類（D25以下、D29以上）はひとまず固定なので下記はコメントアウト
          // if (KyodoD > 0 && material_bar.length > j) {
          //   material_bar[j].separate = KyodoD;
          // }
        }
        this.readInteger(buff);
        this.readInteger(buff);
      }

      // コンクリート強度(N/mm2)
      if (isOlder014) {
        const fck = this.readInteger(buff);
        material_concrete.fck = fck;
      } else {
        const fck = this.readSingle(buff);
        material_concrete.fck = Math.round(fck * 10) / 10;
      }

      // 杭の施工条件の登録※部材グループ番号が3以上を杭と認識する？
      if (this.helper.toNumber(g_id) >= 3) {
        const dt1Sekou = buff['dt1Sekou'];
        let id = null;
        if (dt1Sekou === 0 || dt1Sekou === 1 || dt1Sekou === 2 || dt1Sekou === 3) {
          id = 'pile-00' + dt1Sekou;
        } else if (dt1Sekou == 9) {
          id = 'pile-004';
        }
        if (id != null) {
          for (const key of Object.keys(pile_factor)) {
            const value = pile_factor[key];
            value.selected = (value.id === id) ? true : false;
          }
        }
      }

      // 各種データの保持
      safetyData.safety_factor[g_id] = safety_factor;
      safetyData.material_bar[g_id] = material_bar;
      safetyData.material_steel[g_id] = material_steel;
      safetyData.material_concrete[g_id] = material_concrete;
      safetyData.pile_factor[g_id] = pile_factor;
    }

    // データの登録
    this.safety.setSaveData(safetyData);
  }

  /**
   * 算出点データの読み込み
   * @param buff 
   */
  private GetSANSHUTUscrn(buff: any): void {
    // 謎の数値
    const iTmp = this.readInteger(buff)

    if (iTmp !== 0) {
      // ピックアップファイルへのフルパス
      buff['PickFile'] = this.readString(buff, 100).trim();
      // ピックアップファイル名
      // Shift-JISとUnicodeでデコードした時の文字列長が短い方を採用（この処理いるのか？）
      const buff2 = { u8array: buff.u8array.slice(0, buff.u8array.length) };
      let strFix100 = this.readString(buff, 100, 'unicode').trim();
      let strFix102 = this.readString(buff2, 100).trim();
      if (strFix102.length < strFix100.length) {
        strFix100 = strFix102;
        buff.u8array = buff2.u8array;
      }
      const D_Name = strFix100.trim();

      // 未使用
      for (let i = 0; i < iTmp; i++) {
        this.readInteger(buff);
        this.readString(buff, 32);
        this.readSingle(buff);
      }
    }

    // 算出点数
    const nPoints = this.readInteger(buff)
    // 算出点データ
    for (let i = 0; i < nPoints; i++) {
      // データ保存先のオブジェクトを取得
      const index = i + 1;
      let point = this.points.getTableColumn(index);  // 算出点データ
      let shearCondition = this.shear.getTableColumn(index);  // せん断条件
      point.p_id = index;

      // 算出点名
      const CalName = this.readString(buff, 12).trim();
      point.p_name = CalName;
      // 部材番号
      const iBzNo = this.readInteger(buff);
      point.m_no = iBzNo;
      // せん断照査の実施有無
      if (this.isOlder('0.1.2', buff.datVersID)) {
        const calShear = this.readByte(buff);
        point.isVyCalc = calShear !== 0;
      } else {
        const calShear = this.readInteger(buff);
        point.isVyCalc = calShear !== 0;
      }
      // 曲げ照査の実施有無
      const calBending = this.readBoolean(buff);
      point.isMzCalc = calBending;

      // 未使用
      this.readBoolean(buff);
      this.readBoolean(buff);

      // せん断スパン(mm)
      const shearSpan = this.readSingle(buff);
      if (!buff.isManualInput) {
        // ピックアップモードの場合のみ（断面力モードの場合は断面力の読み込み時に設定される）
        if (shearSpan != null && shearSpan != 0){
          shearCondition.La = shearSpan;
        }
      }

      // 未使用
      if (!this.isOlder('3.2.8', buff.datVersID)) {
        this.readSingle(buff);
        this.readSingle(buff);
      }

      // 算出点名などの同期
      const bar = this.bars.getTableColumn(index);  // 鉄筋配置データ
      for (const key of Object.keys(bar)) {
        if (key in point) {
          bar[key] = point[key];
        }
      }
      const fatigue = this.fatigues.getTableColumn(index);  // 疲労条件
      for (const key of Object.keys(fatigue)) {
        if (key in point) {
          fatigue[key] = point[key];
        }
      }
      const crack = this.crack.getTableColumn(index);  // ひび割れ条件
      for (const key of Object.keys(crack)) {
        if (key in point) {
          crack[key] = point[key];
        }
      }
    }
  }

  /**
   * 鉄筋配置データ、疲労検討条件の読み込み
   * @param buff 
   */
  private GetTEKINscrn(buff: any): void {
    // 未使用
    this.readByte(buff);
    // 算出点数
    const nPoints = this.readInteger(buff);
    // 算出点ごとのデータ読み込み
    for (let i = 0; i < nPoints; i++) {
      // データ保存先のオブジェクトを取得
      const index = i + 1;
      const bar = this.bars.getTableColumn(index);  // 鉄筋配置データ
      let point = this.points.getTableColumn(index);  // 算出点データ
      const member = this.members.getCalcData(bar.m_no);  // 部材データ

      // 未使用
      this.readInteger(buff);
      this.readInteger(buff);

      // ハンチ高(mm)（曲げ用、せん断用）
      for (let j = 0; j < 2; j++) {
        const haunch = this.readSingle(buff);
        if (haunch > 0) {
          if (member.g_no < 2 && member.shape != 3 && member.shape != 4) {
            // 円形、小判以外で部材グループ番号が2未満のものをハンチ有効と判定？
            if (j == 0) {
              bar.haunch_M = haunch;
            } else {
              bar.haunch_V = haunch;
            }
          }
        }
      }

      // 鉄筋径(mm)（上側引張鉄筋、下側引張鉄筋）
      let diaTmp: number;
      for (let j = 0; j < 2; j++) {
        if (this.isOlder("3.1.4", buff.datVersID)) {
          diaTmp = this.readByte(buff);
        } else {
          diaTmp = this.readInteger(buff);
        }
        if (diaTmp > 0) {
          if (j == 0) {
            bar.rebar1.rebar_dia = diaTmp;
          } else if (j == 1 && member.shape != 3) {
            bar.rebar2.rebar_dia = diaTmp;
          }
        }
      }
      // 鉄筋本数（上側引張鉄筋、下側引張鉄筋）
      for (let j = 0; j < 2; j++) {
        let nBar = this.readSingle(buff);  // 負値の場合は鉄筋ピッチ(mm)
        if (nBar < 0) {
          nBar = -1000 / nBar;  // ピッチを1m幅あたりの本数に変換
        }
        if (nBar > 0) {
          if (j == 0) {
            bar.rebar1.rebar_n = nBar;
          } else if (j == 1 && member.shape != 3) {
            bar.rebar2.rebar_n = nBar;
          }
        }
      }
      // 芯かぶり(mm)（上側引張鉄筋）
      const JikuKABURI0 = this.readSingle(buff);
      if (JikuKABURI0 > 0) {
        bar.rebar1.rebar_cover = Math.round(JikuKABURI0 * 10) / 10;
      }
      // 芯かぶり(mm)（下側引張鉄筋）
      const JikuKABURI1 = this.readSingle(buff);
      if (JikuKABURI1 > 0 && member.shape != 3) {
        bar.rebar2.rebar_cover = Math.round(JikuKABURI1 * 10) / 10;
      }
      // 1段目本数（上側引張鉄筋、下側引張鉄筋）
      for (let j = 0; j < 2; j++) {
        let nBar1: number;
        if (this.isOlder('3.1.4', buff.datVersID)) {
          nBar1 = this.readInteger(buff);
        } else if (!this.isOlder('3.1.4', buff.datVersID) && this.isOlder('3.2.6', buff.datVersID)) {
          nBar1 = this.readByte(buff);
        } else {
          nBar1 = this.readSingle(buff);
        }
        if (nBar1 > 0 && member.g_no < 3) {  // 部材グループ番号3未満が対象？
          if (j == 0) {
            bar.rebar1.rebar_lines = nBar1;
          } else if (j == 1 && member.shape != 3) {
            bar.rebar2.rebar_lines = nBar1;
          }
        }
      }
      // 段間隔(mm)（上側引張鉄筋、下側引張鉄筋)
      for (let j = 0; j < 2; j++) {
        let rowPitch: number;
        if (!this.isOlder('3.1.4', buff.datVersID) && this.isOlder('3.2.6', buff.datVersID)) {
          rowPitch = this.readSingle(buff);
        } else if (this.isOlder('3.3.2', buff.datVersID)) {
          rowPitch = this.readByte(buff);
        } else {
          rowPitch = this.readSingle(buff);
        }
        if (rowPitch > 0 && member.g_no < 3) {  // 部材グループ番号3未満が対象？
          if (j == 0) {
            bar.rebar1.rebar_space = rowPitch;
          } else if (j == 1 && member.shape != 3) {
            bar.rebar2.rebar_space = rowPitch;
          }
        }
      }
      // 鉄筋間隔(mm)（上側引張鉄筋、下側引張鉄筋)
      for (let j = 0; j < 2; j++) {
        const pitch = this.readSingle(buff);
        if (pitch > 0 && member.g_no < 3) {  // 部材グループ番号3未満が対象？
          if (j == 0) {
            bar.rebar1.rebar_ss = Math.round(pitch * 10) / 10;
          } else if (j == 1 && member.shape != 3) {
            bar.rebar2.rebar_ss = Math.round(pitch * 10) / 10;
          }
        }
      }
      // 斜率cos（上側引張鉄筋、下側引張鉄筋)
      for (let j = 0; j < 2; j++) {
        const cosTmp = this.readSingle(buff);
        if (cosTmp > 0 && member.g_no < 2) {  // 部材グループ番号2未満が対象？
          if (j == 0) {
            bar.rebar1.cos = Math.round(cosTmp * 1000) / 1000;
          } else if (j == 1 && member.shape != 3) {
            bar.rebar2.cos = Math.round(cosTmp * 1000) / 1000;
          }
        }
      }

      // 側方鉄筋径(mm)
      const SokuR0 = this.readByte(buff);
      if (SokuR0 > 0 && member.g_no < 3 && member.shape != 3) {  // 部材グループ番号3未満が対象？
        bar.sidebar1.side_dia = SokuR0;
      }
      // 未使用
      this.readByte(buff);
      // 側方鉄筋本数
      const SokuHON0 = this.readByte(buff);
      if (SokuHON0 > 0 && member.g_no < 3 && member.shape != 3) {  // 部材グループ番号3未満が対象？
        bar.sidebar1.side_n = SokuHON0;
      }
      // 未使用
      this.readByte(buff);
      // 側方鉄筋芯かぶり(mm)、側方鉄筋間隔※整数部が芯かぶり、小数点以下が間隔
      const SokuKABURI0 = this.readSingle(buff);
      if (SokuKABURI0 > 0 && member.g_no < 2 && member.shape != 3) {  // 部材グループ番号2未満が対象？
        const s1 = Math.floor(SokuKABURI0);
        const s2 = Math.ceil((SokuKABURI0 - s1) * 10000);
        if (s1 > 0) {
          bar.sidebar1.side_cover = s1;
        }
        if (s2 > 0) {
          bar.sidebar1.side_ss = s2;
        }
      }
      // 未使用
      this.readSingle(buff);

      // スターラップ径(mm)
      const StarR0 = this.readByte(buff);
      if (StarR0 > 0) { bar.stirrup.stirrup_dia = StarR0; }
      // 未使用
      this.readByte(buff);
      // スターラップ組数
      const StarKUMI0 = this.readSingle(buff);
      if (StarKUMI0 > 0) { bar.stirrup.stirrup_n = StarKUMI0 * 2; }  // 組数から本数に変換
      // 未使用
      this.readSingle(buff);
      // スターラップ間隔(mm)
      const StarPitch0 = this.readSingle(buff);
      if (StarPitch0 > 0) { bar.stirrup.stirrup_ss = StarPitch0; }
      // 未使用
      this.readSingle(buff);

      // 有効高が変化する場合の係数tan
      const StarTanTHETA0 = this.readSingle(buff);
      if (StarTanTHETA0 > 0 && member.g_no < 2) {  // 部材グループ番号2未満が対象？
        bar.tan = StarTanTHETA0;
      }
      // 未使用
      this.readSingle(buff);

      // 折曲げ鉄筋径(mm)
      const OrimgR = this.readByte(buff);
      if (OrimgR > 0 && member.g_no < 2) {  // 部材グループ番号2未満が対象？
        bar.bend.bending_dia = OrimgR;
      }
      // 折曲げ鉄筋本数
      let nBent: number;
      if (this.isOlder("3.4.5", buff.datVersID)) {
        nBent = this.readByte(buff);
      } else {
        nBent = this.readSingle(buff);
      }
      if (nBent > 0 && member.g_no < 2) {  // 部材グループ番号2未満が対象？
        bar.bend.bending_n = nBent;
      }
      // 折曲げ鉄筋角度(°)
      const OrimgANGLE = this.readByte(buff);
      if (OrimgANGLE > 0 && member.g_no < 2) {  // 部材グループ番号2未満が対象？
        bar.bend.bending_angle = OrimgANGLE;
      }
      // 折曲げ鉄筋間隔(mm)
      if (!this.isOlder("0.1.5", buff.datVersID)) {
        const OrimgKankaku = this.readSingle(buff);
        if (OrimgKankaku > 0 && member.g_no < 2) {  // 部材グループ番号2未満が対象？
          bar.bend.bending_ss = OrimgKankaku;
        }
      }
      
      // 上側引張照査の実施有無
      const Shori0 = this.readByte(buff);
      point.isUpperCalc = Shori0 !== 0;
      // 下側引張照査の実施有無
      if (this.isOlder("0.1.5", buff.datVersID)) {
        point.isLowerCalc = point.isUpperCalc;
      } else {
        const Shori1 = this.readByte(buff);
        point.isLowerCalc = Shori1 !== 0;
      }

      // 疲労検討条件
      if (!this.isOlder("3.1.6", buff.datVersID)) {
        // データ保存先のオブジェクトを取得
        const fatigue = this.fatigues.getTableColumn(index);
        
        // 曲げ照査用疲労条件
        fatigue.M1.SA = this.readSingle(buff);  // 上側引張のSA/SC
        fatigue.M2.SA = this.readSingle(buff);  // 下側引張のSA/SC
        fatigue.M1.SB = this.readSingle(buff);  // 上側引張のSB/SC
        fatigue.M2.SB = this.readSingle(buff);  // 下側引張のSB/SC
        fatigue.M1.NA06 = this.readSingle(buff);  // 上側引張のA列車繰返し回数（k=0.06）
        fatigue.M2.NA06 = this.readSingle(buff);  // 下側引張のA列車繰返し回数（k=0.06）
        fatigue.M1.NB06 = this.readSingle(buff);  // 上側引張のB列車繰返し回数（k=0.06）
        fatigue.M2.NB06 = this.readSingle(buff);  // 下側引張のB列車繰返し回数（k=0.06）
        fatigue.M1.NA12 = this.readSingle(buff);  // 上側引張のA列車繰返し回数（k=0.12）
        fatigue.M2.NA12 = this.readSingle(buff);  // 下側引張のA列車繰返し回数（k=0.12）
        fatigue.M1.NB12 = this.readSingle(buff);  // 上側引張のB列車繰返し回数（k=0.12）
        fatigue.M2.NB12 = this.readSingle(buff);  // 下側引張のB列車繰返し回数（k=0.12）
        fatigue.M1.A = this.readSingle(buff);  // 上側引張の列車分担比
        fatigue.M2.A = this.readSingle(buff);  // 下側引張の列車分担比
        fatigue.M1.B = this.readSingle(buff);  // 上側引張の複線載荷確率
        fatigue.M2.B = this.readSingle(buff);  // 下側引張の複線載荷確率
        // 未使用
        for (let j = 0; j < 6 ; j++) {
          this.readSingle(buff);
        }

        // せん断照査用疲労条件
        fatigue.V1.SA = this.readSingle(buff);  // 上側引張のSA/SC
        fatigue.V2.SA = this.readSingle(buff);  // 下側引張のSA/SC
        fatigue.V1.SB = this.readSingle(buff);  // 上側引張のSB/SC
        fatigue.V2.SB = this.readSingle(buff);  // 下側引張のSB/SC
        fatigue.V1.NA06 = this.readSingle(buff);  // 上側引張のA列車繰返し回数（k=0.06）
        fatigue.V2.NA06 = this.readSingle(buff);  // 下側引張のA列車繰返し回数（k=0.06）
        fatigue.V1.NB06 = this.readSingle(buff);  // 上側引張のB列車繰返し回数（k=0.06）
        fatigue.V2.NB06 = this.readSingle(buff);  // 下側引張のB列車繰返し回数（k=0.06）
        fatigue.V1.NA12 = this.readSingle(buff);  // 上側引張のA列車繰返し回数（k=0.12）
        fatigue.V2.NA12 = this.readSingle(buff);  // 下側引張のA列車繰返し回数（k=0.12）
        fatigue.V1.NB12 = this.readSingle(buff);  // 上側引張のB列車繰返し回数（k=0.12）
        fatigue.V2.NB12 = this.readSingle(buff);  // 下側引張のB列車繰返し回数（k=0.12）
        fatigue.V1.A = this.readSingle(buff);  // 上側引張の列車分担比
        fatigue.V2.A = this.readSingle(buff);  // 下側引張の列車分担比
        fatigue.V1.B = this.readSingle(buff);  // 上側引張の複線載荷確率
        fatigue.V2.B = this.readSingle(buff);  // 下側引張の複線載荷確率
        // 未使用
        for (let j = 0; j < 6 ; j++) {
          this.readSingle(buff);
        }
      }
    }
  }

  /**
   * 計算・印刷設定の読み込み※未使用
   * @param buff 
   */
  private GetPrtScrn(buff: any): void {
    const bCollect = this.readBoolean(buff);
    const bDoDraft = this.readBoolean(buff);
    const bDoPrev = this.readBoolean(buff);
    for (let i = 0; i <= 4; i++) {
      const bDoPrint = this.readBoolean(buff);
    }
    for (let i = 0; i <= 1; i++) {
      const bDoType = this.readBoolean(buff);
    }
    const bN_Fixed = this.readBoolean(buff);
    const bDummy = this.readBoolean(buff);
    for (let i = 0; i <= 3; i++) {
      const byteDanSokuHON = this.readByte(buff);
    }
    const iDanBUZAI = this.readInteger(buff);
    for (let i = 0; i <= 3; i++) {
      const fDanHON = this.readSingle(buff);
    }
    const iDanOtoshi = this.readInteger(buff);
    const iJIKUScale = this.readInteger(buff);
    const iKOUKAN_ATUMI = this.readInteger(buff);
    const iMOMENTperCM = this.readInteger(buff);
    const intKetaFlag = this.readInteger(buff);
    for (let i = 0; i <= 3; i++) {
      const fDSY = this.readSingle(buff);
    }
    const strSubTITLE = this.readString(buff, 100);
    if (!this.isOlder("2.1.0", buff.datVersID)) {
      for (let i = 0; i <= 2; i++) {
        const KuiTKIN_D = this.readInteger(buff);
      }
    }
  }

  /**
   * 断面力データの読み込み
   * @param buff 
   * @param NumManualDt 断面力データ数
   */
  private FrmManualGetTEdata(buff: any, NumManualDt: number): void {

    let strfix10: string;
    let strfix32: string;

    for (let i = 0; i < NumManualDt; i++) {
      // データ保存先のオブジェクトを取得
      const index = i + 1;  //各データテーブルへのindex
      let member = this.members.getTableColumns(index);  // 部材・断面データ
      let point = this.points.getTableColumn(index);  // 算出点データ
      let force = this.force.getTable1Columns(index);  // 断面力データ
      let bar = this.bars.getTableColumn(index);  // 鉄筋配置データ
      let fatigue = this.fatigues.getTableColumn(index);  // 疲労条件
      let shearCondition = this.shear.getTableColumn(index);  // せん断条件

      // 部材グループNo
      strfix10 = this.readString(buff, 10);
      member.g_no = this.helper.toNumber(strfix10.trim());

      // 部材グループNoを文字列化したものをグループIDとする
      if (member.g_no === null) {
        member.g_id = 'blank';
      } else {
        member.g_id = member.g_no.toString();
      }

      // 部材グループ名
      strfix32 = this.readString(buff, 32);
      member.g_name = strfix32.trim();

      // 部材データと算出点データの共通プロパティの同期
      // 着目点データの読み込みで上書きされるので必要ないかも
      for (const key of Object.keys(point)) {
        if (key in member) {
          point[key] = member[key];
        }
      }

      // 着目点名
      strfix32 = this.readString(buff, 32);
      point.p_name = strfix32.trim();

      // 着目点のデフォルト設定
      point.isMzCalc = true;
      point.isVyCalc = true;
      point.axis_type = 2;  // dsdデータは2次元のみ

      // 断面力の一時格納用変数
      let forceTmp: number;
      
      // 耐久性曲げ照査（縁応力度検討用）曲げモーメント(kNm)、軸力(kN)
      for (const k3 of ['Md0_Md', 'Md0_Nd']) {
        forceTmp = this.readSingle(buff);
        if (forceTmp !== null) {
          force[k3] = Math.round(forceTmp * 100) / 100;
        }
      }

      // 耐久性曲げ照査（永久作用）曲げモーメント(kNm)、軸力(kN)※最後に読み込まれた有効値が採用される
      for (let id = 0; id <= 1; id++) {
        for (const k3 of ['Md1_Md', 'Md1_Nd']) {
          forceTmp = this.readSingle(buff);
          if (forceTmp !== null) {
            force[k3] = Math.round(forceTmp * 100) / 100;
          }
        }
      }

      // 耐久性曲げ照査（変動作用）曲げモーメント(kNm)、軸力(kN)※未使用
      this.readSingle(buff);
      this.readSingle(buff);

      // 耐久性曲げ照査（永久作用）曲げモーメント(kNm)、軸力(kN)※最後に読み込まれた有効値が採用される
      for (const k3 of ['Md1_Md', 'Md1_Nd']) {
        forceTmp = this.readSingle(buff);
        if (forceTmp !== null) {
          force[k3] = Math.round(forceTmp * 100) / 100;
        }
      }

      // 各曲げ照査（3:疲労永久作用、4:疲労永久＋変動、5:安全性破壊、6:復旧性地震時以外、7:復旧性地震時）曲げモーメント(kNm)、軸力(kN)
      for (let id = 3; id <= 7; id++) {
        const k1 = 'Md' + id;
        for (const k2 of ['_Md', '_Nd']) {
          const k3 = k1 + k2;
          forceTmp = this.readSingle(buff);
          if (forceTmp !== null) {
            force[k3] = Math.round(forceTmp * 100) / 100;
          }
        }
      }

      // 未使用
      this.readSingle(buff);
      this.readSingle(buff);

      // 各せん断照査（0:耐久性ひび割れ判定、1:耐久性永久作用、2:未使用、3:疲労永久作用、4:疲労永久＋変動、5:安全性破壊、6:復旧性地震時以外、7:復旧性地震時）
      // せん断力(kN)、曲げモーメント(kNm)、軸力(kN)
      for (let id = 0; id <= 7; id++) {
        const k1 = 'Vd' + id;
        for (const k2 of ['_Vd', '_Md', '_Nd']) {
          const k3 = k1 + k2;
          forceTmp = this.readSingle(buff);
          if (forceTmp !== null) {
            force[k3] = Math.round(forceTmp * 100) / 100;
          }
        }
      }

      // せん断スパン(mm)
      if (!this.isOlder('3.1.7', buff.datVersID)) {
        const shearSpan = this.readSingle(buff);
        if (shearSpan != null && shearSpan != 0){
          shearCondition.La = shearSpan;
        }
      }

      // 安全性破壊の設計軸圧縮力(kN)※未使用
      if (!this.isOlder('3.2.4', buff.datVersID)) {
        this.readSingle(buff);
      }

      // min(t/2, d)の入力※未使用
      if (!this.isOlder('3.2.7', buff.datVersID)) {
        this.readSingle(buff);
      }

      // 杭の直径※未使用
      if (!this.isOlder('3.2.8', buff.datVersID)) {
        this.readSingle(buff);
      }

      // 鉄筋配置データおよび疲労条件に部材データと算出点データの共通プロパティを同期
      // 後で各データの読み込みで上書きされるので必要ないかも
      for (const key of Object.keys(bar)) {
        if (key in member) {
          bar[key] = member[key];
        }
        if (key in point) {
          bar[key] = point[key];
        }
      }
      for (const key of Object.keys(fatigue)) {
        if (key in member) {
          fatigue[key] = member[key];
        }
        if (key in point) {
          fatigue[key] = point[key];
        }
      }
    }
  }

  /**
   * DSDファイルのバージョンを調べる
   * @param buff 
   * @returns datVersID：バージョン番号(ex. 1.1.1)\
   * ManualInput：断面力データ数
   */
  private IsDSDFile(buff: any): any {
    const strfix32 = this.readString(buff, 32);
    const strT: string[] = strfix32.replace("WINDAN", "").trim().split(" ");
    return {
      datVersID: strT[0],
      ManualInput: this.helper.toNumber(strT[1])
    };
  }

  // string型の情報を バイナリから取り出す
  private readString(buff: any, length: number, encode = 'sjis'): string {
    let str: string = '';
    while (str.length < length) {
      const tmp1 = String.fromCharCode.apply("", buff.u8array.slice(0, 2));
      const tmp = (encode !== 'unicode') ? Encord.convert(tmp1, 'UNICODE', 'SJIS') : tmp1;
      if (tmp.length == 1) {
        // ２バイト文字（日本語）
        str += tmp;
        buff.u8array = buff.u8array.slice(2);
      } else {
        const tmp1 = String.fromCharCode.apply("", buff.u8array.slice(0, 1));
        const tmp = (encode !== 'unicode') ? Encord.convert(tmp1, 'UNICODE', 'SJIS') : tmp1;
        str += tmp;
        buff.u8array = buff.u8array.slice(1);
      }
    }
    return str;
  }

  // Boolean型の情報を バイナリから読み取る
  private readBoolean(buff: any): boolean {
    const view = this.getDataView(buff, 2);
    const num = view.getInt16(0);
    return num < 0;
  }

  // Byte型の情報を バイナリから読み取る
  private readByte(buff: any): number {
    const view = this.getDataView(buff, 1);
    let num = view.getUint8(0);
    if (num === this.byte_max) num = null;
    return num;
  }

  // Integer型の情報を バイナリから読み取る
  private readInteger(buff: any): number {
    const view = this.getDataView(buff, 2);
    const num = view.getInt16(0);
    return num;
  }

  //Long型の情報を バイナリから読み取る
  private readLong(buff: any): number {
    const view = this.getDataView(buff, 4);
    const num = view.getInt32(0);
    return num;
  }

  // single型の情報を バイナリから読み取る
  private readSingle(buff: any): number {
    const view = this.getDataView(buff, 4);
    let num = view.getFloat32(0);
    if (Math.abs(num) > this.float_max || (0 < Math.abs(num) && Math.abs(num) < this.float_min)) {
      num = null;
    }
    return num;
  }

  private getDataView(buff, length: number): DataView {
    const data = buff.u8array.slice(0, length);
    const re = data.reverse();
    const b = re.buffer;
    const view = new DataView(b);
    buff.u8array = buff.u8array.slice(length);
    return view;
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

}
