import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputBasicInformationService } from "../basic-information/basic-information.service";
import { InputMembersService } from "../members/members.service";
import { TranslateService } from "@ngx-translate/core";
import { InputMaterialStrengthVerificationConditionService } from "../material-strength-verification-conditions/material-strength-verification-conditions.service";

@Injectable({
  providedIn: "root",
})
export class InputSafetyFactorsMaterialStrengthsService {
  private safety_factor: any;
  private material_bar: any;
  private material_steel: any;
  private material_concrete: any;
  public pile_factor: any;
  public axisforce_condition: any;
  public arrayAxis: any[];
  public arrayAxisBase: any[];
  public groupe_name: any[];
  constructor(
    private basic: InputBasicInformationService,
    private members: InputMembersService,
    private helper: DataHelperModule,
    private translate: TranslateService,
    private material: InputMaterialStrengthVerificationConditionService
  ) {
    this.clear();
  }
  public clear(): void {
    this.safety_factor = {};
    this.material_bar = {};
    this.material_steel = {};
    this.material_concrete = {};
    this.pile_factor = {};
    this.arrayAxis = new Array();
    this.axisforce_condition = new Array();
  }

  // 材料強度情報
  /// specification1_selected によって変わる項目の設定
  public default_safety_factor(): any {
    let result: any;
    const sp1 = this.basic.get_specification1();
    const sp2 = this.basic.get_specification2();
    switch (sp1) {
      case 0: // 鉄道
      case 1: // フィリピン版
      case 3: // バングラディッシュ版
        result = [
          {
            id: 0,
            title: this.translate.instant(
              "safety-factors-material-strengths.d_u"
            ),
            M_rc: 1.0,
            M_rs: 1.0,
            M_rbs: 1.0,
            V_rc: 1.0,
            V_rs: 1.0,
            V_rbc: 1.0,
            V_rbs: 1.0,
            V_rbv: null,
            T_rbt: 1.0,
            ri: 1.0,
            range: 1,
            // S_rs: 1.0, S_rb: 1.0,
            NoCalc: false,
          },
          {
            id: 2,
            title: this.translate.instant(
              "safety-factors-material-strengths.safe_ff"
            ),
            M_rc: 1.3,
            M_rs: 1.05,
            M_rbs: 1.0,
            V_rc: 1.3,
            V_rs: 1.05,
            V_rbc: 1.3,
            V_rbs: 1.0,
            V_rbv: null,
            T_rbt: null,
            ri: 1.1,
            range: 2,
            // S_rs: 1.0, S_rb: 1.1,
            NoCalc: false,
          },
          {
            id: 5,
            title: this.translate.instant(
              "safety-factors-material-strengths.safe_d"
            ),
            M_rc: 1.3,
            M_rs: 1.0,
            M_rbs: 1.1,
            V_rc: 1.3,
            V_rs: 1.0,
            V_rbc: 1.3,
            V_rbs: 1.1,
            V_rbv: 1.2,
            T_rbt: 1.3,
            ri: 1.2,
            range: 2,
            // S_rs: 1.05, S_rb: 1.1,
            NoCalc: false,
          },
          {
            id: 6,
            title:
              sp2 !== 3 && sp2 !== 4
                ? this.translate.instant(
                    "safety-factors-material-strengths.r_ex"
                  )
                : this.translate.instant(
                    "safety-factors-material-strengths.u_damage"
                  ),
            M_rc: 1.3,
            M_rs: 1.0,
            M_rbs: 1.0,
            V_rc: 1.3,
            V_rs: 1.0,
            V_rbc: 1.3,
            V_rbs: 1.1,
            V_rbv: 1.2,
            T_rbt: 1.3,
            ri: 1.2,
            range: 3,
            // S_rs: 1.05, S_rb: 1.1,
            NoCalc: false,
          },
          {
            id: 7,
            title: this.translate.instant(
              "safety-factors-material-strengths.r_at"
            ),
            M_rc: 1.3,
            M_rs: 1.0,
            M_rbs: 1.0,
            V_rc: 1.3,
            V_rs: 1.0,
            V_rbc: 1.3,
            V_rbs: 1.1,
            V_rbv: 1.2,
            T_rbt: 1.3,
            ri: 1.0,
            range: 3,
            // S_rs: 1.05, S_rb: 1.1,
            NoCalc: false,
          },
          {
            id: 8,
            title: this.translate.instant(
              "safety-factors-material-strengths.min_rebar"
            ),
            M_rc: 1.3,
            M_rs: 1.0,
            M_rbs: 1.0,
            V_rc: null,
            V_rs: null,
            V_rbc: null,
            V_rbs: null,
            V_rbv: null,
            T_rbt: null,
            ri: 1.0,
            range: 3,
            // S_rs: 1.05, S_rb: 1.1,
            NoCalc: false,
          },
        ];

        break;

      case 2: // 港湾
        result = new Array();
        break;
    }

    // 例外
    if (sp1 === 0) {
      if (this.basic.get_specification2() === 2) {
        // JR東日本
        result[3].r1 = 1.0; // 復旧性の γi =1.00
      }
    }

    return result;
  }

  // 材料強度情報
  public default_material_bar(): any {
    const sp1 = this.basic.get_specification1();
    let result: any = [
      {
        separate: 25,
        tensionBar: { fsy: 345, fsu: 490 },
        sidebar: { fsy: 345, fsu: 490 },
        stirrup: { fsy: 345, fsu: 490 },
        // bend: { fsy: 345, fsu: 490 }
      },
      {
        separate: 29,
        tensionBar: { fsy: 345, fsu: 490 },
        sidebar: { fsy: 345, fsu: 490 },
        stirrup: { fsy: 345, fsu: 490 },
        // bend: { fsy: 345, fsu: 490 }
      },
      // {
      //   separate: 29,
      //   tensionBar: { fsy: 390, fsu: 560 },
      //   sidebar: { fsy: 390, fsu: 560 },
      //   stirrup: { fsy: 390, fsu: 560 },
      //   // bend: { fsy: 390, fsu: 560 }
      // }
    ];
    if (sp1 === 1) {
      result = [
        {
          tensionBar: { fsy: 415, fsu: 550 },
          sidebar: { fsy: 415, fsu: 550 },
          stirrup: { fsy: 415, fsu: 550 },
          // bend: { fsy: 415, fsu: 550 }
        },
      ];
    }

    return result;
  }

  // 材料強度情報
  public default_material_steel(): any {
    const result = [
      {
        separate: 16,
        fsyk: 245,
        fsvyk: 140,
        fsuk: 400,
      },
      {
        separate: 40,
        fsyk: 235,
        fsvyk: 135,
        fsuk: 400,
      },
      {
        separate: 75,
        fsyk: 215,
        fsvyk: 125,
        fsuk: 400,
      },
    ];
    return result;
  }

  public default_material_concrete(): any {
    const result = {
      fck: 24,
      dmax: 25,
    };
    return result;
  }

  // 杭の施工係数
  public default_pile_factor(): any {
    let result = [];

    switch (this.basic.get_specification1()) {
      case 0: // 鉄道
      case 3: // バングラディッシュ鉄道
        result = [
          {
            id: "pile-000",
            title: this.translate.instant(
              "safety-factors-material-strengths.dont_use"
            ),
            rfck: 1.0,
            rfbok: 1.0,
            rEc: 1.0,
            rVcd: 1.0,
            selected: true,
          },
          {
            id: "pile-001",
            title: this.translate.instant(
              "safety-factors-material-strengths.muddy_less"
            ),
            rfck: 0.8,
            rfbok: 0.7,
            rEc: 0.8,
            rVcd: 0.9,
            selected: false,
          },
          {
            id: "pile-002",
            title: this.translate.instant(
              "safety-factors-material-strengths.natural_less"
            ),
            rfck: 0.7,
            rfbok: 0.6,
            rEc: 0.8,
            rVcd: 0.9,
            selected: false,
          },
          {
            id: "pile-003",
            title: this.translate.instant(
              "safety-factors-material-strengths.bentonite"
            ),
            rfck: 0.6,
            rfbok: 0.5,
            rEc: 0.7,
            rVcd: 0.8,
            selected: false,
          },
          {
            id: "pile-004",
            title: this.translate.instant(
              "safety-factors-material-strengths.aerial"
            ),
            rfck: 0.9,
            rfbok: 0.9,
            rEc: 0.9,
            rVcd: 1.0,
            selected: false,
          },
        ];
        break;

      case 1: // フィリピン版
        result = [
          {
            id: "pile-000",
            title: this.translate.instant(
              "safety-factors-material-strengths.dont_use"
            ),
            rfck: 1.0,
            rfbok: 1.0,
            rEc: 1.0,
            rVcd: 1.0,
            selected: true,
          },
          {
            id: "pile-001",
            title: this.translate.instant(
              "safety-factors-material-strengths.muddy_less"
            ),
            rfck: 0.8,
            rfbok: 0.7,
            rEc: 0.8,
            rVcd: 0.9,
            selected: false,
          },
          {
            id: "pile-002",
            title: this.translate.instant(
              "safety-factors-material-strengths.natural_less"
            ),
            rfck: 0.7,
            rfbok: 0.6,
            rEc: 0.8,
            rVcd: 0.9,
            selected: false,
          },
          {
            id: "pile-003",
            title: this.translate.instant(
              "safety-factors-material-strengths.bentonite"
            ),
            rfck: 0.6,
            rfbok: 0.5,
            rEc: 0.7,
            rVcd: 0.8,
            selected: false,
          },
          {
            id: "pile-004",
            title: this.translate.instant(
              "safety-factors-material-strengths.aerial"
            ),
            rfck: 0.9,
            rfbok: 0.9,
            rEc: 0.9,
            rVcd: 1.0,
            selected: false,
          },
        ];
        break;

      case 2: // 道路
        result = new Array();

        break;
    }
    return result;
  }

  public default_axisforce_condition(): any {
    const result = {
      used: true,
      opt_max_min: false,
      opt_tens_only: false,
      opt_no_for_v: false,
    };
    return result;
  }

  // component で使う用
  // 部材グループ別に並べている
  public getTableColumns(): any {
    const safety_factor = {};
    const material_bar = {};
    const material_steel = {};
    const material_concrete = {};
    const pile_factor = {};
    const axisforce_condition = {};

    // グリッド用データの作成
    const groupe_list = this.members.getGroupeList();
    for (const groupe of groupe_list) {
      const first = groupe[0];
      const id = first.g_id;

      // 空のデータを1行追加する
      const tmp_safety_factor = this.default_safety_factor();
      const tmp_material_bar = this.default_material_bar();
      const tmp_material_steel = this.default_material_steel();
      const tmp_material_concrete = this.default_material_concrete();
      const tmp_pile_factor = this.default_pile_factor();
      const tmp_axisforce_condition = this.default_axisforce_condition();

      if (id in this.safety_factor) {
        const old_safety_factor = this.safety_factor[id];
        for (const tmp of tmp_safety_factor) {
          const old = old_safety_factor.find((v) => v.id === tmp.id);
          if (old !== undefined) {
            for (const key of Object.keys(tmp)) {
              if (key === "title") continue;
              if (key in old) {
                // tmp[key] = old[key];
                tmp[key] = old[key] !== null ? old[key] : tmp[key];
              } else tmp[key] = null;
            }
          }
        }
      }
      // check for V_rbv and T_rbt
      if (tmp_safety_factor.length > 0) {
        tmp_safety_factor[0].V_rbv = null;
      }

      if (tmp_safety_factor.length > 1) {
        tmp_safety_factor[1].V_rbv = null;
        tmp_safety_factor[1].T_rbt = null;
      }
      //
      if (id in this.material_bar) {
        const old_material_bar = this.material_bar[id];
        for (let i = 0; i < tmp_material_bar.length; i++) {
          const tmp = tmp_material_bar[i];
          const old = old_material_bar[i];
          for (const key of Object.keys(tmp)) {
            if (key in old) {
              tmp[key] = old[key];
            }
          }
        }
      }

      if (id in this.material_steel) {
        const old_material_steel = this.material_steel[id];
        for (let i = 0; i < tmp_material_steel.length; i++) {
          const tmp = tmp_material_steel[i];
          const old = old_material_steel[i];
          for (const key of Object.keys(tmp)) {
            if (key in old) {
              tmp[key] = old[key];
            }
          }
        }
      }
      const default_material_concrete = this.default_material_concrete()
      if (id in this.material_concrete) {
        const old_material_concrete = this.material_concrete[id];
        for (const key of Object.keys(tmp_material_concrete)) {
          if (key in old_material_concrete) {
            tmp_material_concrete[key] = old_material_concrete[key];
          }
          if (tmp_material_concrete[key] === null) {
            tmp_material_concrete[key] = default_material_concrete[key];
        }
        }
      }

      if (id in this.pile_factor) {
        const old_pile_factor = this.pile_factor[id];
        for (let i = 0; i < tmp_pile_factor.length; i++) {
          const tmp = tmp_pile_factor[i];
          const old = old_pile_factor[i];
          for (const key of Object.keys(tmp)) {
            if (key === "title") continue;
            if (key in old) tmp[key] = old[key];
          }
        }
      }
      if (id in this.axisforce_condition) {
        const old_axisforce_condition = this.axisforce_condition[id];
        const tmp = tmp_axisforce_condition;
        const old = old_axisforce_condition;
        for (const key of Object.keys(tmp)) {
          if (key in old) tmp[key] = old[key];
        }
      }
      safety_factor[id] = tmp_safety_factor;
      material_bar[id] = tmp_material_bar;
      material_steel[id] = tmp_material_steel;
      material_concrete[id] = tmp_material_concrete;
      pile_factor[id] = tmp_pile_factor;
      axisforce_condition[id] = tmp_axisforce_condition;
    }
    return {
      groupe_list,
      safety_factor,
      material_bar,
      material_steel,
      material_concrete,
      pile_factor,
      axisforce_condition,
    };
  }

  public setTableColumns(safety: any): void {
    this.clear();

    for (const id of Object.keys(safety.safety_factor)) {
      const tmp_safety_factor = this.default_safety_factor();
      const tmp_material_bar = this.default_material_bar();
      const tmp_material_steel = this.default_material_steel();
      const tmp_material_concrete = this.default_material_concrete();
      const tmp_pile_factor = this.default_pile_factor();

      if (id in safety.safety_factor) {
        const new_safety_factor = safety.safety_factor[id];
        for (const tmp of tmp_safety_factor) {
          const org = new_safety_factor.find((v) => v.id === tmp.id);
          if (org !== undefined) {
            for (const key of Object.keys(tmp)) {
              if (key in org) {
                tmp[key] = org[key];
              }
            }
          }
        }
      }

      if (id in safety.material_bar) {
        const new_material_bar = safety.material_bar[id];
        for (let i = 0; i < tmp_material_bar.length; i++) {
          const tmp = tmp_material_bar[i];
          const org = new_material_bar[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) {
              tmp[key] = org[key];
            }
          }
        }
      }

      if (id in safety.material_steel) {
        const new_material_steel = safety.material_steel[id];
        for (let i = 0; i < tmp_material_steel.length; i++) {
          const tmp = tmp_material_steel[i];
          const org = new_material_steel[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) {
              tmp[key] = org[key];
            }
          }
        }
      }

      const default_material_concrete = this.default_material_concrete()
      if (id in safety.material_concrete) {
        const new_material_concrete = safety.material_concrete[id];
        for (const key of Object.keys(tmp_material_concrete)) {
          if (key in new_material_concrete) {
            tmp_material_concrete[key] = new_material_concrete[key];
          }
          if (tmp_material_concrete[key] === null) {
            tmp_material_concrete[key] = default_material_concrete[key];
        }
        }
      }

      if (id in safety.pile_factor) {
        const new_pile_factor = safety.pile_factor[id];
        for (let i = 0; i < tmp_pile_factor.length; i++) {
          const tmp = tmp_pile_factor[i];
          const org = new_pile_factor[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) {
              tmp[key] = org[key];
            }
          }
        }
      }
      this.safety_factor[id] = tmp_safety_factor;
      this.material_bar[id] = tmp_material_bar;
      this.material_steel[id] = tmp_material_steel;
      this.material_concrete[id] = tmp_material_concrete;
      this.pile_factor[id] = tmp_pile_factor;
    }
  }

  // ファイルに書き込む用
  public getSaveData(): any {
    return {
      safety_factor: this.safety_factor,
      material_bar: this.material_bar,
      material_steel: this.material_steel,
      material_concrete: this.material_concrete,
      pile_factor: this.pile_factor,
      axisforce_condition: this.axisforce_condition,
      component: this.material.getSaveData().component,
      verification: this.material.getSaveData().verification,
      other: this.material.getSaveData().other,
    };
  }

  public setSaveData(safety: any, axisMaxMin?: any) {
    (this.safety_factor = safety.safety_factor),
      (this.material_bar = safety.material_bar),
      //this.material_steel = safety.material_steel,
      (this.material_concrete = safety.material_concrete),
      (this.pile_factor = safety.pile_factor),
      (this.axisforce_condition = this.handleAxisforceCondition(
        safety,
        axisMaxMin
      ));
  }

  public getGroupeName(i: number): string {
    return this.members.getGroupeName(i);
  }

  // 計算に必要なデータを返す
  public getCalcData(target: string, g_id: string, safetyID: number): any {
    const result = {};

    // 安全係数 を代入する
    const safety_factor = this.getSafetyFactor(target, g_id, safetyID);
    if (this.helper.toNumber(safety_factor.range) === null) {
      safety_factor.range = 3;
    }
    result["safety_factor"] = safety_factor; // 安全係数

    // 鉄筋強度 を代入する
    let bar = this.material_bar[g_id];
    if (bar == null) {
      bar = this.default_material_bar();
    }
    result["material_bar"] = bar;

    // コンクリート強度 を代入する
    let conc = this.material_concrete[g_id];
    if (conc == null) {
      conc = this.default_material_concrete();
    }
    result["material_concrete"] = conc;

    // 鉄骨強度 を代入する
    let steel = this.material_steel[g_id];
    if (steel == null) {
      steel = this.default_material_steel();
    }
    result["material_steel"] = steel;

    // 杭の施工条件
    let pile = this.pile_factor[g_id];
    if (pile == null) {
      pile = this.default_pile_factor();
    }
    result["pile_factor"] = pile.find((e) => e.selected === true);

    return result;
  }

  public getSafetyFactor(target: string, g_id: string, safetyID: number): any {
    let safe = this.safety_factor[g_id];
    let current: any;

    if (safe == null) {
      safe = this.default_safety_factor();
      current = safe[safetyID];
      for (const key of Object.keys(current)) {
        if (key === "id" || key === "title") continue;
        current[key] = null;
      }
    } else {
      current = safe[safetyID];
      if (current == null) {
        const temp = this.default_safety_factor();
        current = temp[safetyID];
      }
    }

    const a = this.default_safety_factor();
    const b = a[safetyID];
    for (const key of Object.keys(b)) {
      if (!(key in current) || current[key] === null || current[key] == null) {
        current[key] = b[key];
      }
    }

    const result = {};
    if (target === "Md") {
      // 曲げモーメントの照査の;合
      result["M_rc"] = current.M_rc;
      result["M_rs"] = current.M_rs;
      result["M_rb"] = current.M_rbs;
    }
    if (target === "Vd") {
      // せん断力の照査の場合
      result["V_rc"] = current.V_rc;
      result["V_rs"] = current.V_rs;
      result["V_rbc"] = current.V_rbc;
      result["V_rbs"] = current.V_rbs;
      result["V_rbd"] = current.V_rbv;
      result["T_rbt"] = current.T_rbt;
    }
    if (target === "Mt") {
      // ねじり曲げモーメントの照査の;合
      result["M_rc"] = current.M_rc;
      result["M_rs"] = current.M_rs;
      result["M_rb"] = current.M_rbs;
      result["V_rc"] = current.V_rc;
      result["V_rs"] = current.V_rs;
      result["V_rbc"] = current.V_rbc;
      result["V_rbs"] = current.V_rbs;
      result["V_rbd"] = current.V_rbv;
      result["T_rbt"] = current.T_rbt;
    }

    result["S_rb"] = current.S_rb;
    result["S_rs"] = current.S_rs;
    result["ri"] = current.ri;
    result["range"] = current.range;

    return result;
  }
  public getAxisForceJson() {
    this.groupe_name = new Array();
    const safety = this.getTableColumns();
    this.arrayAxisBase = new Array();
    for (let i = 0; i < safety.groupe_list.length; i++) {
      this.groupe_name.push(this.members.getGroupeName(i));
    }
    this.groupe_name.map((data: any) => {
      if (this.arrayAxisBase.length < this.groupe_name.length)
        this.arrayAxisBase.push({ id: data, consider_moment_checked: false });
    });
    if (this.arrayAxis !== undefined && this.arrayAxis.length > 0) {
      return this.arrayAxis;
    } else return this.arrayAxisBase;
  }
  public handleAxisforceCondition(safety: any, axisMaxMin: any = []): any {
    const groupe_list = this.members.getGroupeList();
    const conditions_list = this.basic.conditions_list;
    let axisforce_condition: any = {};
    let indexJR4 = conditions_list.findIndex((data) => data.id === "JR-004");
    if (safety.axisforce_condition === undefined) {
      for (const groupe of groupe_list) {
        const first = groupe[0];
        const id = first.g_id;
        let temp = {
          used: false,
          opt_max_min: false,
          opt_tens_only: false,
          opt_no_for_v: false,
        };
        axisforce_condition[id] = temp;
        axisforce_condition[id]["used"] = true;
        if (indexJR4 !== -1 && conditions_list[indexJR4].selected) {
          axisforce_condition[id]["opt_no_for_v"] = true;
        } else {
          axisforce_condition[id]["opt_no_for_v"] = false;
        }
        let indexMoment =
          axisMaxMin.length > 0
            ? axisMaxMin.findIndex((data) => data.id === id)
            : -1;
        if (
          indexMoment !== -1 &&
          axisMaxMin[indexMoment].consider_moment_checked
        ) {
          axisforce_condition[id]["opt_max_min"] = true;
        } else {
          axisforce_condition[id]["opt_max_min"] = false;
        }
      }
    } else {
      axisforce_condition = safety["axisforce_condition"];
    }
    return axisforce_condition;
  }
}
