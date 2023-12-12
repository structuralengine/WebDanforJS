import { forEach } from 'jszip';
import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { TranslateService } from "@ngx-translate/core";
import { MenuService } from '../menu/menu.service';

@Injectable({
  providedIn: "root",
})
export class InputBasicInformationService {
  // pick up table に関する変数
  public pickup_moment: any[];
  public pickup_shear_force: any[];
  public pickup_torsional_moment: any[];

  // 適用 に関する変数
  private specification1_list: any[];

  // 仕様 に関する変数
  public specification2_list: any[];

  // 設計条件
  public conditions_list: any[];

  constructor(
    private helper: DataHelperModule,
    private translate: TranslateService,
    private menuService: MenuService
  ) {
    this.clear();
  }
  public clear(): void {
    this.pickup_moment = new Array();
    this.pickup_shear_force = new Array();
    this.pickup_torsional_moment = new Array();

    this.specification1_list = new Array();
    this.specification2_list = new Array();
    this.conditions_list = new Array();

    this.specification1_list = this.default_specification1();
    this.set_default_pickup();
  }

  private default_specification1(): any {
    return [
      {
        id: 0,
        title: this.translate.instant("basic-information.rail"),
        selected: true,
      },
      {
        id: 2,
        title: this.translate.instant("basic-information.road"),
        selected: false,
      },
      // 一時的にフィリピン版を非表示
      /*{ 
        id: 1, 
        title: this.translate.instant("basic-information.Pilipinas"),
        selected: false }*/
    ];
  }

  public set_specification1_data_file(specification1_list_file: any): any {
    if (specification1_list_file != undefined) {
      this.specification1_list.forEach((element) => {
        let value = specification1_list_file.find(
          (e) => e.id === element.id
        ).selected;
        if (value === true) this.menuService.selectApply(element.id);
        element.selected = value;
      });
    }
  }
  /// get_specification1 によって変わる項目の設定
  private set_default_pickup(): void {
    const sp1 = this.get_specification1();
    const sp2 = this.get_specification2();

    // 曲げモーメントテーブル
    const keys_moment = this.default_pickup_moment(sp1, sp2);
    // 古い入力があれば no の入力を 保持
    const tmp_moment: any[] = new Array();
    for (const def of keys_moment) {
      const old = this.pickup_moment.find((v) => v.id === def.id);
      if (old !== undefined) {
        def.no = old.no;
      }
      tmp_moment.push(def);
    }
    this.pickup_moment = tmp_moment;

    // せん断力テーブル
    const keys_shear = this.default_pickup_shear(sp1, sp2);
    // 古い入力があれば no の入力を 保持
    const tmp_shear: any[] = new Array();
    for (const def of keys_shear) {
      const old = this.pickup_shear_force.find((v) => v.id === def.id);
      if (old !== undefined) {
        def.no = old.no;
      }
      tmp_shear.push(def);
    }
    this.pickup_shear_force = tmp_shear;

    // ねじりモーメントテーブル
    const keys_torsional = this.default_pickup_torsional(sp1, sp2);
    // 古い入力があれば no の入力を 保持
    const tmp_torsional: any[] = new Array();
    for (const def of keys_torsional) {
      const old = this.pickup_torsional_moment.find((v) => v.id === def.id);
      if (old !== undefined) {
        def.no = old.no;
      }
      tmp_torsional.push(def);
    }
    this.pickup_torsional_moment = tmp_torsional;

    this.specification2_list = this.default_specification2(sp1);

    this.conditions_list = this.default_conditions(sp1);
  }

  // 曲げモーメントテーブルの初期値
  private default_pickup_moment(
    specification1: number,
    specification2?: number
  ): any {
    let result: any[] = new Array();
    switch (specification1) {
      case 0: // 鉄道
      case 1: // 土木学会
        result = [
          {
            id: 0,
            title: this.translate.instant("basic-information.d_stress"),
            no: null,
          },
          {
            id: 1,
            title: this.translate.instant("basic-information.pl_d"),
            no: null,
          },
          {
            id: 2,
            title: this.translate.instant("basic-information.safe_limit"),
            no: null,
          },
          {
            id: 3,
            title: this.translate.instant("basic-information.safe_pa"),
            no: null,
          },
          {
            id: 4,
            title: this.translate.instant("basic-information.safe_pv"),
            no: null,
          },
          {
            id: 5,
            title: this.translate.instant("basic-information.safe_d"),
            no: null,
          },
          {
            id: 6,
            title:
              specification2 != 3 && specification2 != 4
                ? this.translate.instant("basic-information.r_ex")
                : this.translate.instant("basic-information.u_damage"),
            no: null,
          },
          {
            id: 7,
            title: this.translate.instant("basic-information.r_at"),
            no: null,
          },
          {
            id: 8,
            title: this.translate.instant("basic-information.min_rebar"),
            no: null,
          },
        ];
        break;

      case 2: // 道
        result = [
          {
            id: 0,
            title: this.translate.instant(
              "basic-information-road.bs_dcp_of_is"
            ),
            no: null,
          },
          {
            id: 1,
            title: this.translate.instant(
              "basic-information-road.bs_durability_fatigue"
            ),
            no: null,
          },
          {
            id: 2,
            title: this.translate.instant("basic-information-road.bs_lcc1"),
            no: null,
          },
          {
            id: 3,
            title: this.translate.instant("basic-information-road.bs_lcc2_8"),
            no: null,
          },
          {
            id: 4,
            title: this.translate.instant("basic-information-road.bs_lcc9"),
            no: null,
          },
          {
            id: 5,
            title: this.translate.instant("basic-information-road.bs_lcc10"),
            no: null,
          },
          {
            id: 6,
            title: this.translate.instant("basic-information-road.bs_lcc11"),
            no: null,
          },
          {
            id: 7,
            title: this.translate.instant("basic-information-road.bs_lcc12"),
            no: null,
          },
          // {
          //   id: 8,
          //   title: this.translate.instant(
          //     "basic-information-road.bs_min_rebar_amount"
          //   ),
          //   no: null,
          // },
        ];
        // case 2: // 道
        //   result = [
        //     {
        //       id: 0,
        //       title: this.translate.instant("basic-information.u_stress"),
        //       no: null,
        //     },
        //     {
        //       id: 1,
        //       title: this.translate.instant("basic-information.pl_u"),
        //       no: null,
        //     },
        //     {
        //       id: 3,
        //       title: this.translate.instant("basic-information.pl_f"),
        //       no: null,
        //     },
        //     {
        //       id: 4,
        //       title: this.translate.instant("basic-information.f_pv"),
        //       no: null,
        //     },
        //     {
        //       id: 5,
        //       title: this.translate.instant("basic-information.ul"),
        //       no: null,
        //     },
        //     {
        //       id: 6,
        //       title: this.translate.instant("basic-information.us_earth"),
        //       no: null,
        //     },
        //     {
        //       id: 7,
        //       title: this.translate.instant("basic-information.ul_earth"),
        //       no: null,
        //     },
        //   ];
        break;
      // case 2: // 港湾
      //   result = [
      //     {
      //       id: 0,
      //       title: this.translate.instant("basic-information.u_stress"),
      //       no: null,
      //     },
      //     {
      //       id: 1,
      //       title: this.translate.instant("basic-information.pl_u"),
      //       no: null,
      //     },
      //     {
      //       id: 3,
      //       title: this.translate.instant("basic-information.pl_f"),
      //       no: null,
      //     },
      //     {
      //       id: 4,
      //       title: this.translate.instant("basic-information.f_pv"),
      //       no: null,
      //     },
      //     {
      //       id: 5,
      //       title: this.translate.instant("basic-information.ul"),
      //       no: null,
      //     },
      //     {
      //       id: 6,
      //       title: this.translate.instant("basic-information.us_earth"),
      //       no: null,
      //     },
      //     {
      //       id: 7,
      //       title: this.translate.instant("basic-information.ul_earth"),
      //       no: null,
      //     },
      //   ];
      //   break;
      default:
      // まだ対応していない
    }
    return result;
  }
  public set_pickup_moment(id: number, no: number) {
    const target = this.pickup_moment.find((e) => e.id === id);
    if (target == null) return;
    target.no = no;
  }
  // せん断テーブルの初期値
  private default_pickup_shear(
    specification1: number,
    specification2?: number
  ): any {
    let result: any[] = new Array();
    switch (specification1) {
      case 0: // 鉄道
      case 1: // 土木学会
        result = [
          {
            id: 0,
            title: this.translate.instant("basic-information.d_shear_judge"),
            no: null,
          },
          {
            id: 1,
            title: this.translate.instant("basic-information.pl_d"),
            no: null,
          },
          {
            id: 2,
            title: this.translate.instant("basic-information.vl_d"),
            no: null,
          },
          {
            id: 3,
            title: this.translate.instant("basic-information.safe_pa"),
            no: null,
          },
          {
            id: 4,
            title: this.translate.instant("basic-information.safe_pv"),
            no: null,
          },
          {
            id: 5,
            title: this.translate.instant("basic-information.safe_d"),
            no: null,
          },
          {
            id: 6,
            title:
              specification2 != 3 && specification2 != 4
                ? this.translate.instant("basic-information.r_ex")
                : this.translate.instant("basic-information.u_damage"),
            no: null,
          },
          {
            id: 7,
            title: this.translate.instant("basic-information.r_at"),
            no: null,
          },
        ];
        break;

      case 2: // 港湾
        result = [
          {
            id: 0,
            title: this.translate.instant(
              "basic-information-road.sfv_dcp_of_is"
            ),
            no: null,
          },
          {
            id: 1,
            title: this.translate.instant(
              "basic-information-road.sfv_durability_fatigue"
            ),
            no: null,
          },
          {
            id: 2,
            title: this.translate.instant("basic-information-road.sfv_lcc1"),
            no: null,
          },
          {
            id: 3,
            title: this.translate.instant("basic-information-road.sfv_lcc2_8"),
            no: null,
          },
          {
            id: 4,
            title: this.translate.instant("basic-information-road.sfv_lcc9"),
            no: null,
          },
          {
            id: 5,
            title: this.translate.instant("basic-information-road.sfv_lcc10"),
            no: null,
          },
          {
            id: 6,
            title: this.translate.instant("basic-information-road.sfv_lcc11"),
            no: null,
          },
          {
            id: 7,
            title: this.translate.instant("basic-information-road.sfv_lcc12"),
            no: null,
          },
        ];
        break;
      // case 2: // 港湾
      //   result = [
      //     {
      //       id: 0,
      //       title: this.translate.instant("basic-information.u_shear_judge"),
      //       no: null,
      //     },
      //     {
      //       id: 1,
      //       title: this.translate.instant("basic-information.pl_u"),
      //       no: null,
      //     },
      //     {
      //       id: 2,
      //       title: this.translate.instant("basic-information.vl_u"),
      //       no: null,
      //     },
      //     {
      //       id: 3,
      //       title: this.translate.instant("basic-information.pl_f"),
      //       no: null,
      //     },
      //     {
      //       id: 4,
      //       title: this.translate.instant("basic-information.f_pv"),
      //       no: null,
      //     },
      //     {
      //       id: 5,
      //       title: this.translate.instant("basic-information.ul"),
      //       no: null,
      //     },
      //     {
      //       id: 6,
      //       title: this.translate.instant("basic-information.us_earth"),
      //       no: null,
      //     },
      //     {
      //       id: 7,
      //       title: this.translate.instant("basic-information.ul_earth"),
      //       no: null,
      //     },
      //   ];
      //   break;
      default:
      // まだ対応していない
    }
    return result;
  }
  public set_pickup_shear_force(id: number, no: number) {
    const target = this.pickup_shear_force.find((e) => e.id === id);
    if (target == null) return;
    target.no = no;
  }

  // ねじりモーメントテーブルの初期値
  private default_pickup_torsional(
    specification1: number,
    specification2?: number
  ): any {
    let result: any[] = new Array();
    switch (specification1) {
      case 0: // 鉄道
      case 1: // 土木学会
        result = [
          {
            id: 0,
            title: this.translate.instant("basic-information.d_torsion_judge"),
            no: null,
          },
          {
            id: 1,
            title: this.translate.instant("basic-information.pl_d"),
            no: null,
          },
          {
            id: 5,
            title: this.translate.instant("basic-information.safe_d"),
            no: null,
          },
          {
            id: 6,
            title:
              specification2 != 3 && specification2 != 4
                ? this.translate.instant("basic-information.r_ex")
                : this.translate.instant("basic-information.u_damage"),
            no: null,
          },
          {
            id: 7,
            title: this.translate.instant("basic-information.r_at"),
            no: null,
          },
        ];
        break;

      case 2: // 港湾
        result = [
          {
            id: 0,
            title: this.translate.instant(
              "basic-information-road.tv_dcp_of_is"
            ),
            no: null,
          },
          {
            id: 1,
            title: this.translate.instant(
              "basic-information-road.tv_durability_fatigue"
            ),
            no: null,
          },
          {
            id: 2,
            title: this.translate.instant("basic-information-road.tv_lcc1"),
            no: null,
          },
          {
            id: 3,
            title: this.translate.instant("basic-information-road.tv_lcc2_8"),
            no: null,
          },
          {
            id: 4,
            title: this.translate.instant("basic-information-road.tv_lcc9"),
            no: null,
          },
          {
            id: 5,
            title: this.translate.instant("basic-information-road.tv_lcc10"),
            no: null,
          },
          {
            id: 6,
            title: this.translate.instant("basic-information-road.tv_lcc11"),
            no: null,
          },
          {
            id: 7,
            title: this.translate.instant("basic-information-road.tv_lcc12"),
            no: null,
          },
        ];
        break;
      // case 2: // 港湾
      //   result = [
      //     {
      //       id: 0,
      //       title: this.translate.instant("basic-information.u_shear_judge"),
      //       no: null,
      //     },
      //     {
      //       id: 1,
      //       title: this.translate.instant("basic-information.pl_u"),
      //       no: null,
      //     },
      //     {
      //       id: 5,
      //       title: this.translate.instant("basic-information.ul"),
      //       no: null,
      //     },
      //     {
      //       id: 6,
      //       title: this.translate.instant("basic-information.us_earth"),
      //       no: null,
      //     },
      //     {
      //       id: 7,
      //       title: this.translate.instant("basic-information.ul_earth"),
      //       no: null,
      //     },
      //   ];
      //   break;
      default:
      // まだ対応していない
    }
    return result;
  }
  public set_pickup_torsional_moment(id: number, no: number) {
    const target = this.pickup_torsional_moment.find((e) => e.id === id);
    if (target == null) return;
    target.no = no;
  }

  // 仕様の初期値
  private default_specification2(specification1: number): any {
    let result: any[] = new Array();
    switch (specification1) {
      case 0: // 鉄道
        result = [
          {
            id: 0,
            title: this.translate.instant("basic-information.jr_standard"),
            selected: true,
          },
          {
            id: 1,
            title: this.translate.instant("basic-information.trans"),
            selected: false,
          },
          {
            id: 2,
            title: this.translate.instant("basic-information.jr_east"),
            selected: false,
          },
          {
            id: 3, // JR各社 令和5年 RC標準
            title: this.translate.instant("basic-information.jr_stan5"),
            selected: false,
          },
          {
            id: 4, // 運輸機構 令和5年 RC標準
            title: this.translate.instant("basic-information.trans5"),
            selected: false,
          },
          // { id: 5, title: 'ＪＲ東日本（既存構造物）', selected: false }
        ];
        break;

      case 1: // 土木学会
        result = [];
        break;

      case 2: // 港湾
        result = [
          {
            id: 5,
            title: this.translate.instant(
              "basic-information.limit_design_method"
            ),
            selected: false,
          },
          {
            id: 6,
            title: this.translate.instant(
              "basic-information.partial_coefficient_method"
            ),
            selected: false,
          },
          {
            id: 7,
            title: this.translate.instant(
              "basic-information.allowable_stress_method"
            ),
            selected: false,
          },
        ];
        break;
      default:
      // まだ対応していない
    }
    return result;
  }
  public set_specification2(id: number): any {
    if (this.specification2_list.find((e) => e.id === id) == null) {
      return;
    }

    this.specification2_list.map(
      (obj) => (obj.selected = obj.id === id ? true : false)
    );

    this.set_default_pickup();
  }

  // 設計条件の初期値
  private default_conditions(specification1: number): any {
    let result: any[] = new Array();
    switch (specification1) {
      case 0: // 鉄道
      case 1: // 土木学会
      case 2: // 港湾
        result = [
          {
            id: "JR-001",
            title: this.translate.instant("basic-information.limit100"),
            selected: true,
          },
          {
            id: "JR-003",
            title: this.translate.instant("basic-information.apex"),
            selected: true,
          },
          {
            id: 'JR-005',
            title: this.translate.instant("basic-information.adopt"),
            selected: false
          },
          {
            id: "JR-004",
            title: this.translate.instant("basic-information.Mud"),
            selected: false,
          },
        ];
        break;

      default:
      // まだ対応していない
    }
    return result;
  }
  public set_conditions(id: string, value: boolean): any {
    const target = this.conditions_list.find((e) => e.id === id);
    if (target == null) {
      return;
    }

    target.selected = value;
  }
  public get_conditions(): any {
    return this.conditions_list;
  }

  public pickup_moment_no(id: number) {
    const old = this.pickup_moment.find((v) => v.id === id);
    if (old !== undefined) {
      return this.helper.toNumber(old.no);
    }
    return null;
  }
  public pickup_shear_force_no(id: number) {
    const old = this.pickup_shear_force.find((v) => v.id === id);
    if (old !== undefined) {
      return this.helper.toNumber(old.no);
    }
    return null;
  }
  public pickup_torsional_moment_no(id: number) {
    const old = this.pickup_torsional_moment.find((v) => v.id === id);
    if (old !== undefined) {
      return this.helper.toNumber(old.no);
    }
    return null;
  }

  public get_specification1(): number {
    const sp = this.specification1_list.find(
      (value) => value.selected === true
    );

    return sp != undefined ? sp.id : 0;
  }

  public get_specification2(): number {
    const sp = this.specification2_list.find(
      (value) => value.selected === true
    );
    const id = sp !== undefined ? sp.id : -1;
    return id;
  }
  // public set_specification1(index: number): any {
  public set_specification1(id: number): any {
    // const id: number = this.specification1_list.findIndex(
    //   (value) => value.id === index
    // );

    this.specification1_list.map(
      (obj) => (obj.selected = obj.id === id ? true : false)
    );

    this.set_default_pickup();

    return this.getSaveData();
  }

  //Temporary: If road Selected and all spe2 id false
  private setDefault() {
    const isRoad = this.specification1_list.find((v, i) => {
      return v.id === 2 && v.selected === true;
    })
    const allFalse = this.specification2_list.every((v, i) => v.selected === false)
    if(isRoad && allFalse)
    {
      this.specification2_list.map((v, i)=> {
        if(v.id === 6) v.selected = true
      })
    }
  }

  public setSaveData(basic: any) {
    this.specification1_list = this.default_specification1();
    for (const sp1 of this.specification1_list) {
      const _sp1 = basic.specification1_list.find((v) => v.id === sp1.id);
      if (_sp1 != null) {
        sp1.selected = _sp1.selected;
      }
    }
    const sp1: number = this.get_specification1();

    //Then get specification_list 2;
    // this.specification2_list = basic.specification2_list;
    this.specification2_list = this.default_specification2(sp1);
    for (const sp2 of this.specification2_list) {
      const _sp2 = basic.specification2_list.find((v) => v.id === sp2.id);
      if (_sp2 != null) {
        sp2.selected = _sp2.selected;
      }
    }
    this.setDefault();

    const sp2: number = this.get_specification2();

    this.pickup_moment = this.default_pickup_moment(sp1, sp2);
    for (let i = 0; i < basic.pickup_moment.length; i++) {
      const e = this.pickup_moment[i];
      if(e === undefined ||e === null ) continue
      const t = basic.pickup_moment[i];
      if (t == null) {
        continue;
      }
      for (const k of Object.keys(e)) {
        if (k === 'title')
          continue;
        if (k === 'id')
          continue;        
        if (k in t)
          e[k] = t[k];
      }
    }

    this.pickup_shear_force = this.default_pickup_shear(sp1, sp2);
    for (let i = 0; i < basic.pickup_shear_force.length; i++) {
      const e = this.pickup_shear_force[i];
      if(e === undefined ||e === null ) continue
      const t = basic.pickup_shear_force[i];
      for (const k of Object.keys(e)) {
        if (k === 'title')
          continue;
        if (k === 'id')
          continue;          
        if (k in t)
          e[k] = t[k];
      }
    }

    this.pickup_torsional_moment = this.default_pickup_torsional(sp1, sp2);
    if ("pickup_torsional_moment" in basic) {
      for (let i = 0; i < basic.pickup_torsional_moment.length; i++) {
        const e = this.pickup_torsional_moment[i];
        if(e === undefined ||e === null ) continue
        const t = basic.pickup_torsional_moment[i];
        for (const k of Object.keys(e)) {
          if (k === 'title')
            continue;
          if (k === 'id')
            continue;            
          if (k in t)
            e[k] = t[k];
        }
      }
    }

    // this.conditions_list = basic.conditions_list;
    const conditions = basic.conditions_list;
    let jr005 = conditions.find((item) => item.id === "JR-005");
    if(jr005 !== null && jr005 !== undefined){
      this.updateTitleCondition(conditions);
    }
    else {
      this.updateTitleCondition(conditions);

      // Find index of insertAfterId
      var indexToInsertAfter = conditions.findIndex(function (condition) {
        return condition.id === "JR-003";
      });
      if (indexToInsertAfter !== -1) {
        conditions.splice(indexToInsertAfter + 1, 0, {
          id: "JR-005",
          title: this.translate.instant("basic-information.adopt"),
          selected: false,
        });
      }
    }
    this.conditions_list = conditions;
  }

  public setPickUpData() {}

  public getSaveData(): any {
    return {
      pickup_moment: this.pickup_moment,
      pickup_shear_force: this.pickup_shear_force,
      pickup_torsional_moment: this.pickup_torsional_moment,

      specification1_list: this.specification1_list, // 適用
      specification2_list: this.specification2_list, // 仕様
      conditions_list: this.conditions_list, // 設計条件
    };
  }
 
  public updateTitleCondition (conditions: any[]){
    conditions.forEach(item => {
      switch(item.id) {
        case "JR-001":
          item.title = this.translate.instant("basic-information.limit100");
          break;
        case "JR-003":
          item.title = this.translate.instant("basic-information.apex");
          break;
        case "JR-005":
          item.title = this.translate.instant("basic-information.adopt");
          break;
        case "JR-004":
          item.title = this.translate.instant("basic-information.Mud");
          break;
        default:
          // nothing
      }
    })
  }

  public updateTitleSpecification (id: number, specs: any){
    ///specification1_list
    if(id === 1){
      specs.forEach(item => {
        switch(item.id) {
          case 0:
            item.title = this.translate.instant("basic-information.rail");
            break;
          case 1:
            item.title = this.translate.instant("basic-information.Pilipinas");
            break;
          case 2:
            item.title = this.translate.instant("basic-information.road");
            break;
          default:
            // nothing
        }
      })
    }
    else if(id === 2){
      specs.forEach(item => {
        switch(item.id) {
          case 0:
            item.title = this.translate.instant("basic-information.jr_com");
            break;
          case 1:
            item.title = this.translate.instant("basic-information.trans");
            break;
          case 2:
            item.title = this.translate.instant("basic-information.jr_east");
            break;
          case 3:
            item.title = this.translate.instant("basic-information.jr_com5");
            break;
          case 4:
            item.title = this.translate.instant("basic-information.trans5");
            break;
          case 5:
            item.title = this.translate.instant("basic-information.limit_design_method");
            break;
          case 6:
            item.title = this.translate.instant("basic-information.partial_coefficient_method");
            break;
          case 7:
            item.title = this.translate.instant("basic-information.allowable_stress_method");
            break;
          default:
            // nothing
        }
      })
    }
  }
}
