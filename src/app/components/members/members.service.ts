import { Injectable } from '@angular/core';
import { TranslateService } from "@ngx-translate/core";
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { LanguagesService } from 'src/app/providers/languages.service';
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { forEach } from 'jszip';
import { parse } from 'path';
import { toDouble } from 'igniteui-angular-core';
import { publicDecrypt } from 'crypto';

@Injectable({
  providedIn: 'root'
})
export class InputMembersService {

  // 部材情報
  private member_list: any[];
  private langs: string[] = ["en", "ja"];
  private shape_names: any =
    [
      [],
      ["1", 'RC-矩形'],
      ["2", 'RC-T形'],
      ["3", 'RC-円形'],
      ["4", 'RC-小判']
    ];

  private lang_shape_names: any = {};

  constructor(private translate: TranslateService,
    private helper: DataHelperModule,
    private language: LanguagesService,
    private basicService: InputBasicInformationService,
  ) {
    this.clear();

    for (const lang of this.langs) {
      this.translate.getTranslation(lang).subscribe((obj) => {
        this.shape_names[1].push(obj.members.rectangle.trim());
        this.shape_names[2].push(obj.members.t_shape.trim());
        this.shape_names[3].push(obj.members.r_shape.trim());
        this.shape_names[4].push(obj.members.oval.trim());

        this.lang_shape_names[lang] = [];
        this.lang_shape_names[lang].push("");
        this.lang_shape_names[lang].push(obj.members.rectangle.trim());
        this.lang_shape_names[lang].push(obj.members.t_shape.trim());
        this.lang_shape_names[lang].push(obj.members.r_shape.trim());
        this.lang_shape_names[lang].push(obj.members.oval.trim());
      });
    }
  }

  public clear(): void {
    this.member_list = new Array();
  }

  // 部材情報
  public default_member(m_no: number): any {
    // メモ:
    // g_no: 表面上の(member.component だけで用いる)グループ番号
    // g_id: 本当のグループ番号
    return {
      m_no: m_no,
      m_len: null,
      g_no: null,
      g_id: '',
      g_name: '',
      shape: 0,
      B: null,
      H: null,
      Bt: null,
      t: null,
      n: null
    };
  }

  // member_list から 指定行 のデータを返す関数
  public getTableColumns(m_no: number): any {

    let result = this.default_member(m_no);
    let member = this.getData(m_no);

    // 対象データが無かった時に処理
    if (member !== undefined) {
      if (result.g_no === null) {
        result.g_id = '';
      }

      for (const k of Object.keys(result)) {
        if (k in member)
          result[k] = member[k];
      }
    } else {
      this.member_list.push(result);
    }

    result.shape = this.getShapeDispFromShapeID(result.shape);
    return result;
  }

  public getCalcData(m_no: number) {
    const result = this.getData(m_no);
    return JSON.parse(
      JSON.stringify({
        temp: result
      })
    ).temp;
  }

  private getData(m_no: number) {
    return this.member_list.find((item) => item.m_no === m_no);
  }

  // 同じグループの部材リストを取得する
  public getSameGroupeMembers(m_no: number): any {

    const m = this.getCalcData(m_no);

    if (!('g_id' in m) || m.g_id == null || m.g_id === null || m.g_id.trim().length === 0) {
      return [];
    }

    return this.member_list.filter(v => v.g_id === m.g_id);
  }

  public setTableColumns(table_datas: any, isManual: boolean = false) {

    // 本来データと表示データが違うので行はコピーする必要がある
    // もうちょっと効率良くできる可能性もあるがとりあえず完全二重管理

    // 断面力手入力モードの場合に適用する
    this.member_list = new Array();
    if (!isManual) {
      // 断面力手入力モードじゃない場合
      for (const column of table_datas) {

        const def = this.default_member(column.m_no);

        if (this.isEnable(column)) {
          if (column.g_no === null) {
            column.g_id = '';
          }

          for (const k of Object.keys(def)) {
            if (k in column)
              def[k] = column[k];
          }
        } else
          def.m_len = column.m_len;

        def.shape = this.getShapeIDFromUserInput(def.shape);

        this.member_list.push(def);
      }
    } else {
      for (const column of table_datas) {

        if (this.isEnable(column)) {
          // グループNo の入力がない入力行には、仮のグループid をつける
          if (column.g_no === null) {
            column.g_id = 'blank'; //'row' + column.m_no; //仮のグループid
          }

          const def = this.default_member(column.m_no);
          for (const k of Object.keys(def)) {
            if (k in column)
              def[k] = column[k];
          }

          def.shape = this.getShapeIDFromUserInput(def.shape);

          this.member_list.push(def)
        }
      }
    }
  }

  // 各国の言語で表現した形状から形状情報をIDの数値に変換する
  /*
  public getShapeIDFromDisp(value: string): number {

    let result:number = 0;

    if (value === null)
      return result;

    switch (value.trim()) {
      case this.translate.instant("members.rectangle"):
        result = 1 // '矩形';
        break;
      case this.translate.instant("members.t_shape"):
        result = 2 // 'T形';
        break;
      case this.translate.instant("members.r_shape"):
        result = 3 // '円形';
        break;
      case this.translate.instant("members.oval"):
        result = 4 // '小判';
        break;
      default:
        result = 0; // 未入力であることを意味する
    }

    return result;
    }
    */

  public translateData_old_to_1_13_7() {

    for (let member of this.member_list)
      member.shape = this.getShapeIDFromUserInput(member.shape);
  }

  public getShapeDispFromShapeID(shape_id: number) {
    if (this.lang_shape_names.length <= shape_id)
      return 0;


    return this.lang_shape_names[this.language.browserLang][shape_id];
  }

  // 入力された文字列から形状IDを返す
  public getShapeIDFromUserInput(key: string): number {

    if (key === undefined || key === null)
      return 0;

    let key_ = key.trim();

    for (let shape_id = 1; 4 >= shape_id; shape_id++) {
      if (-1 != this.shape_names[shape_id].indexOf(key_))
        return shape_id;
    }

    return 0;
  }

  /// pick up ファイルをセットする関数
  public setPickUpData(pickup_data: Object) {
    const keys: string[] = Object.keys(pickup_data);
    const members: any[] = pickup_data[keys[0]];

    // 部材リストを作成する
    const old_member_list = this.member_list.slice(0, this.member_list.length);
    this.member_list = new Array();

    // 部材番号のもっとも大きい数
    let n = 0;
    members.forEach((v, i, a) => {
      n = Math.max(n, v.m_no);
    });
    for (let m_no = 1; m_no <= n; m_no++) {
      // 同じ部材番号を抽出
      const tar = members.filter((v, i, a) => v.m_no === m_no);
      if (tar.length === 0) {
        continue;
      }
      let pos = 0;
      tar.forEach((v, i, a) => {
        pos = Math.max(pos, v.position);
      });
      // 今の入力を踏襲
      let new_member = old_member_list.find((value) => value.m_no === m_no);
      if (new_member == null) {
        new_member = this.default_member(m_no);
      }
      // 部材長をセットする
      new_member.m_len = pos;
      this.member_list.push(new_member);
    }

  }


  // 部材に何か入力されたタイミング
  // 1行でも有効なデータ存在したら true
  public checkMemberEnables(member_list: any = this.member_list): boolean {
    for (const columns of member_list) {
      if (this.isEnable(columns)) {
        return true;
      }
    }
    return false;
  }

  // 有効なデータ存在したら true
  public isEnable(columns) {
    if (columns.g_name !== null && columns.g_name !== undefined) {
      if (columns.g_name.trim().length > 0) {
        return true;
      }
    }
    if (columns.shape !== null && columns.shape !== undefined) {
      return true;
    }
    if (columns.B !== null && columns.B !== undefined) {
      return true;
    }
    if (columns.H !== null && columns.H !== undefined) {
      return true;
    }
    if (columns.Bt !== null && columns.Bt !== undefined) {
      return true;
    }
    if (columns.t !== null && columns.t !== undefined) {
      return true;
    }

    return false;
  }

  public getGroupeName(i: number): string {

    // 一時リスト
    const temp_list = [];
    for (const groupe of this.getGroupeList()) {
      if (this.helper.toNumber(groupe[0].g_no) !== null) {
        const index = Math.round(groupe[0].g_no * 10000);
        temp_list[index] = groupe;
      }
    }

    const groupe = temp_list.filter(x => Array.isArray(x)).map(x => x);

    const target = groupe[i];
    const first = target[0];
    let result: string = '';
    if (first.g_name === null) {
      result = first.g_id;
    } else if (first.g_name === '') {
      result = first.g_id;
    } else {
      result = first.g_name;
    }
    if (result === '') {
      result = 'No' + i;
    }
    return result;
  }

  // グループ別 部材情報{m_no, m_len, g_no, g_id, g_name, shape, B, H, Bt, t} の配列
  public getGroupeList(): any[] {
    // 全てのグループ番号をリストアップする
    const id_list: string[] = this.getGroupes();

    // グループ番号を持つ部材のリストを返す
    const result = new Array();
    for (const id of id_list) {
      // グループ番号を持つ部材のリスト
      const members: any[] = this.member_list.filter(
        item => item.g_id === id);
      result.push(members);
    }
    return JSON.parse(
      JSON.stringify({
        temp: result
      })
    ).temp;
  }

  // グループNoでソートする
  public getGroupes(): string[] {
    const temp_list = [];

    for (const m of this.member_list) {
      if (!('g_id' in m) || m.g_id === 'blank' || m.g_id == null || m.g_id === null || m.g_id.trim().length === 0) {
        continue;
      }

      if (temp_list.find((value) => value === m.g_no) == null) {
        temp_list.push(m.g_no);
      }
    }

    temp_list.sort(function (a, b) {
      return a - b;
    });

    const id_list: string[] = new Array();

    for (const id of temp_list) {
      const m = this.member_list.find((m) => m.g_no === id);

      // g_id リストを出力するので、g_id が設定されている必要がある
      if (m != null && m.g_id !== '') {
        id_list.push(m.g_id);
      }
    }

    return id_list;
  }

  // 保存しているデータの取得
  public getSaveData(): any {
    const result = [];
    for (const m of this.member_list) {
      const def = this.default_member(m.m_no);
      for (const k of Object.keys(def)) {
        if (k in m)
          def[k] = m[k];
      }
      result.push(def)
    }
    return result;
  }

  // 内部保持用のデータに変換
  public setSaveData(members: any) {
    this.clear();
    debugger

    var isHide = this.checkHideDesignCondition(members);
    for (const m of members) {
      const def = this.default_member(m.m_no);
      for (const k of Object.keys(def)) {
        if (k in m) {
          def[k] = m[k];
        }
      }
      this.setGType(def, m.g_type);
      this.member_list.push(def)
    }
    console.log(this.member_list)
  }


  //Set for g_type in member
  public setGTypeForMembers() {
    this.member_list.forEach(m => {
      this.setGType(m);
    })
    console.log(this.member_list)
  }

  //Set for g_type in member
  public setGType(member: any, gType?: any) {
    if (gType === undefined || gType === null) {
      const conditions_list = this.basicService.conditions_list;

      var jr003 = conditions_list.find(e => e.id === "JR-003");
      var jr005 = conditions_list.find(e => e.id === "JR-005");
      // Circle
      if (member.shape === 3) {
        if (gType === null) member.g_type = 1;
        else {
          if (jr003.selected === false && jr005.selected === true) member.g_type = 1;
          if (jr003.selected === true && jr005.selected === false) member.g_type = 2;
          if (jr003.selected === false && jr005.selected === false) member.g_type = 3;
        }
      }

      // rectangle or t-shape
      if (member.shape === 1 || member.shape === 2) {
        member.g_type = null;
      }
      // oval
      if (member.shape === 4) {
        if (member.g_type === undefined) member.g_type = null;
      }
    }
    else {
      member.g_type = gType;
    }
  }

  public checkHideDesignCondition(members: any[]) {
    let hasGType = members.some(member => "g_type" in member);
    if (hasGType) {
      let gTypes = members.filter(m => m.shape === 3)
        .map(member => member.g_id);
      //   CHECK ALL IS SAME VALUE
      let allEqual = gTypes.every((val, i, arr) => val === arr[0]);
      return !allEqual;
    }
    return false;
  }
}
