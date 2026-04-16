import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { TranslateService } from "@ngx-translate/core";
import { Subject } from "rxjs";

/**
 * 設計分野
 */
export const Specification1 = {
  /** 鉄道 */
  Rail: 0,
  /** フィリピン鉄道 */
  Rail_Ph: 1,
  /** 道路 */
  Road: 2,
  /** バングラディッシュ鉄道 */
  Rail_Bd: 3,
} as const;
export type Specification1 =
  (typeof Specification1)[keyof typeof Specification1];

/**
 * 設計基準
 */
export const Specification2 = {
  /** 鉄道標準 平成16年版 */
  RailStd_H16: 0,
  /** 運輸機構 (H16標準ベース) */
  Shinkansen_H16: 1,
  /** JR東日本 (H16標準ベース) */
  JREast_H16: 2,
  /** 鉄道標準 令和5年版 */
  RaidStd_R5: 3,
  /** 運輸機構 (R5標準ベース) */
  Shinkansen_R5: 4,
  /** 平成29年版道路橋示方書・限界設計法 */
  RoadStd_H29_Limit: 5,
  /** 平成29年版道路橋示方書・部分係数法 */
  RoadStd_H29_Partial: 6,
  /** 許容応力度法 */
  Allowable: 7,
  /** JR東日本 (R5標準ベース) */
  JREast_R5: 8,
} as const;
export type Specification2 =
  (typeof Specification2)[keyof typeof Specification2];

export type Specification1List = {
  id: number;
  title: string;
  selected: boolean;
}[];
export type Specification2List = {
  id: number;
  title: string;
  selected: boolean;
}[];
export type PickupMomentList = {
  id: number;
  title: string;
  no: number | null;
}[];
export type PickupShearForceList = {
  id: number;
  title: string;
  no: number | null;
}[];
export type PickupTorsionalMomentList = {
  id: number;
  title: string;
  no: number | null;
}[];
export type ConditionsList = { id: string; title: string; selected: boolean }[];
export type BasicInformation = {
  specification1_list: Specification1List | undefined;
  specification2_list: Specification2List | undefined;
  pickup_moment: PickupMomentList | undefined;
  pickup_shear_force: PickupShearForceList | undefined;
  pickup_torsional_moment: PickupTorsionalMomentList | undefined;
  // conditions_list: ConditionsList // バックエンド側で参照されていない
};

type Category = "Rail" | "Road";

@Injectable({
  providedIn: "root",
})
export class InputBasicInformationService {
  constructor(
    private helper: DataHelperModule,
    private translate: TranslateService,
  ) {
    this.clear();
  }
  public clear(): void {
    this._specification1 = Specification1.Rail;
    this._specification2_dic = this._initial_specification2_dic;
    this._pickup_moment_dic = {};
    this._pickup_shear_force_dic = {};
    this._pickup_torsional_moment_dic = {};
  }

  private _specification1: Specification1 = Specification1.Rail;
  private _isValid_specification1(value: Specification1): boolean {
    let result = false;
    switch (value) {
      case Specification1.Rail:
      // case Specification1.Rail_Ph:
      // case Specification1.Road:
      case Specification1.Rail_Bd:
        result = true;
        break;
    }
    return result;
  }
  private get _specification1_list(): Specification1List {
    const result = [
      {
        id: Specification1.Rail as number,
        title: "basic-information.rail",
        selected: this.specification1 === Specification1.Rail,
      },
      {
        id: Specification1.Rail_Bd as number,
        title: "basic-information.rail_Bangladesh",
        selected: this.specification1 === Specification1.Rail_Bd,
      },
      // {
      //   id: Specification1.Road as number,
      //   title: "basic-information.road",
      //   selected: this.specification1 === Specification1.Road,
      // },
      // {
      //   id: Specification1.Rail_Ph as number,
      //   title: "basic-information.Pilipinas",
      //   selected: this.specification1 === Specification1.Rail_Ph,
      // },
    ];
    return result;
  }
  get specification1(): Specification1 {
    const value = this._specification1;
    if (!this._isValid_specification1(value)) {
      throw new Error(`Invalid specification1: ${value}`);
    }
    return value;
  }
  set specification1(value: Specification1) {
    if (!this._isValid_specification1(value)) {
      throw new Error(`Invalid specification1: ${value}`);
    }
    this._specification1 = value;

    this.setSpecification1Subject.next(value);
  }
  get specification1_list(): Specification1List {
    return this._specification1_list.map((s) => ({
      id: s.id,
      title: this.translate.instant(s.title),
      selected: s.selected,
    }));
  }
  private set specification1_list(
    specification1_list: Specification1List | undefined,
  ) {
    if (specification1_list) {
      for (const specification1 of specification1_list) {
        if (specification1.selected) {
          const id = specification1.id as Specification1;
          if (this._isValid_specification1(id)) {
            this.specification1 = id;
            return;
          }
        }
      }
      throw new Error(`No selected: ${specification1_list}`);
    }
  }
  get specification1_title(): string {
    const id = this.specification1 as number;
    const s = this.specification1_list.find((s) => s.id === id);
    const title = s!.title;
    return this.translate.instant(title);
  }

  private _category(specification1 = this.specification1): Category {
    switch (this.specification1) {
      case Specification1.Rail:
      case Specification1.Rail_Ph:
      case Specification1.Rail_Bd:
        return "Rail";
      case Specification1.Road:
        return "Road";
      default:
        throw new Error(`Invalid specification1: ${specification1}`);
    }
  }
  get category(): Category {
    return this._category(this.specification1);
  }
  isRail(specification1 = this.specification1): boolean {
    const result = this._category(specification1) === "Rail";
    return result;
  }
  isRoad(specification1 = this.specification1): boolean {
    const result = this._category(specification1) === "Road";
    return result;
  }

  private _specification2_dic: { [key in Category]?: Specification2 } =
    this._initial_specification2_dic;
  private _isValid_specification2(value: Specification2): boolean {
    let result = false;
    switch (this.specification1) {
      case Specification1.Rail:
      // case Specification1.Rail_Ph:
      case Specification1.Rail_Bd:
        switch (value) {
          case Specification2.RailStd_H16:
          case Specification2.Shinkansen_H16:
          case Specification2.JREast_H16:
          case Specification2.RaidStd_R5:
          case Specification2.Shinkansen_R5:
          case Specification2.JREast_R5:
            result = true;
            break;
        }
        break;
      // case Specification1.Road:
      //   switch (value) {
      //     case Specification2.RoadStd_H29_Limit:
      //     case Specification2.RoadStd_H29_Partial:
      //     case Specification2.Allowable:
      //       result = true;
      //       break;
      //   }
      //   break;
    }
    return result;
  }
  private get _initial_specification2_dic(): {
    [key in Category]?: Specification2;
  } {
    const result: { [key in Category]?: Specification2 } = {
      Rail: Specification2.RailStd_H16,
      Road: Specification2.RoadStd_H29_Limit,
    };
    return result;
  }
  private get _specification2_list(): Specification2List {
    const specification1 = this.specification1;
    let result: Specification2List;
    switch (specification1) {
      case Specification1.Rail:
      // case Specification1.Rail_Ph:
      case Specification1.Rail_Bd:
        result = [
          {
            id: Specification2.RailStd_H16 as number,
            title: "basic-information.jr_standard",
            selected: this.specification2 === Specification2.RailStd_H16,
          },
          {
            id: Specification2.Shinkansen_H16 as number,
            title: "basic-information.trans",
            selected: this.specification2 === Specification2.Shinkansen_H16,
          },
          {
            id: Specification2.JREast_H16 as number,
            title: "basic-information.jr_east",
            selected: this.specification2 === Specification2.JREast_H16,
          },
          {
            id: Specification2.RaidStd_R5 as number,
            title: "basic-information.jr_stan5",
            selected: this.specification2 === Specification2.RaidStd_R5,
          },
          {
            id: Specification2.Shinkansen_R5 as number,
            title: "basic-information.trans5",
            selected: this.specification2 === Specification2.Shinkansen_R5,
          },
          {
            id: Specification2.JREast_R5 as number,
            title: "basic-information.jr_east5",
            selected: this.specification2 === Specification2.JREast_R5,
          },
        ];
        break;
      // case Specification1.Road:
      //   result = [
      //     {
      //       id: Specification2.RoadStd_H29_Limit as number,
      //       title: "basic-information.limit_design_method",
      //       selected: this.specification2 === Specification2.RoadStd_H29_Limit,
      //     },
      //     {
      //       id: Specification2.RoadStd_H29_Partial as number,
      //       title: "basic-information.partial_coefficient_method",
      //       selected: this.specification2 === Specification2.RoadStd_H29_Partial,
      //     },
      //     {
      //       id: Specification2.Allowable as number,
      //       title: "basic-information.allowable_stress_method",
      //       selected: this.specification2 === Specification2.Allowable,
      //     },
      //   ];
      //   break;
      default:
        throw new Error(`Invalid specification1: ${specification1}`);
    }
    return result;
  }
  get specification2(): Specification2 {
    const category = this.category;
    const value = this._specification2_dic[category];
    if (value === undefined) {
      throw new Error(`Unregistered category: ${category}`);
    }
    if (!this._isValid_specification2(value)) {
      throw new Error(`Invalid specification2: ${value}`);
    }
    return value;
  }
  set specification2(value: Specification2) {
    const category = this.category;
    if (!this._isValid_specification2(value)) {
      throw new Error(`Invalid specification2: ${value}`);
    }
    this._specification2_dic[category] = value;

    this.setSpecification2Subject.next(value);
  }
  get specification2_list(): Specification2List {
    return this._specification2_list.map((s) => ({
      id: s.id,
      title: this.translate.instant(s.title),
      selected: s.selected,
    }));
  }
  private set specification2_list(
    specification2_list: Specification2List | undefined,
  ) {
    if (specification2_list) {
      for (const specification2 of specification2_list) {
        if (specification2.selected) {
          const id = specification2.id as Specification2;
          if (this._isValid_specification2(id)) {
            this.specification2 = id;
            return;
          }
        }
      }
      throw new Error(`No selected contained: ${specification2_list}`);
    }
  }
  get specification2_title(): string {
    const id = this.specification2 as number;
    const s = this.specification2_list.find((s) => s.id === id);
    const title = s!.title;
    return this.translate.instant(title);
  }

  private setSpecification1Subject = new Subject<Specification1>();
  setSpecification1Subject$ = this.setSpecification1Subject.asObservable();

  private setSpecification2Subject = new Subject<Specification2>();
  setSpecification2Subject$ = this.setSpecification2Subject.asObservable();

  isH16(specification2 = this.specification2): boolean {
    let result = false;
    switch (specification2) {
      case Specification2.RailStd_H16:
      case Specification2.Shinkansen_H16:
      case Specification2.JREast_H16:
        result = true;
        break;
      case Specification2.RaidStd_R5:
      case Specification2.Shinkansen_R5:
      case Specification2.JREast_R5:
        break;
      case Specification2.RoadStd_H29_Limit:
      case Specification2.RoadStd_H29_Partial:
      case Specification2.Allowable:
        break;
      default:
        throw new Error(`Invalid specification2: ${specification2}`);
    }
    return result;
  }
  isR5(specification2 = this.specification2): boolean {
    let result = false;
    switch (specification2) {
      case Specification2.RailStd_H16:
      case Specification2.Shinkansen_H16:
      case Specification2.JREast_H16:
        break;
      case Specification2.RaidStd_R5:
      case Specification2.Shinkansen_R5:
      case Specification2.JREast_R5:
        result = true;
        break;
      case Specification2.RoadStd_H29_Limit:
      case Specification2.RoadStd_H29_Partial:
      case Specification2.Allowable:
        break;
      default:
        throw new Error(`Invalid specification2: ${specification2}`);
    }
    return result;
  }

  private _pickup_moment_dic: {
    [key in Category]?: { [key: number]: number };
  } = {};
  set pickup_moment(pickup_moment: PickupMomentList | undefined) {
    if (pickup_moment) {
      const category = this.category;
      const dic: { [key: number]: number } = {};
      for (const pm of pickup_moment) {
        const id = pm.id;
        const no = pm.no;
        if (no !== null) {
          dic[id] = no;
        }
      }
      this._pickup_moment_dic[category] = dic;
    }
  }
  get pickup_moment_without_id2(): PickupMomentList {
    return this._get_pickup_moment().map((s) => ({
      id: s.id,
      title: this.translate.instant(s.title),
      no: s.no,
    }));
  }
  get pickup_moment(): PickupMomentList {
    return this._get_pickup_moment(true).map((s) => ({
      id: s.id,
      title: this.translate.instant(s.title),
      no: s.no,
    }));
  }
  private _get_pickup_moment(requires_id2: boolean = false): PickupMomentList {
    const specification1 = this.specification1;
    const category = this.category;
    const dic = this._pickup_moment_dic[category] ?? {};
    let result: PickupMomentList;
    switch (specification1) {
      case Specification1.Rail:
      // case Specification1.Rail_Ph:
      case Specification1.Rail_Bd:
        const isH16 = !this.isR5();
        result = [
          {
            id: 0,
            title: "basic-information.d_stress",
            no: dic[0] ?? null,
          },
          {
            id: 1,
            title: "basic-information.pl_d",
            no: dic[1] ?? null,
          },
          // id=2はwdjファイルには出力されるがピックアップ番号入力画面には表示されない
          {
            id: 3,
            title: "basic-information.safe_pa",
            no: dic[3] ?? null,
          },
          {
            id: 4,
            title: "basic-information.safe_pv",
            no: dic[4] ?? null,
          },
          {
            id: 5,
            title: "basic-information.safe_d",
            no: dic[5] ?? null,
          },
          {
            id: 6,
            title: isH16
              ? "basic-information.r_ex"
              : "basic-information.u_damage",
            no: dic[6] ?? null,
          },
          {
            id: 7,
            title: "basic-information.r_at",
            no: dic[7] ?? null,
          },
          {
            id: 8,
            title: "basic-information.min_rebar",
            no: dic[8] ?? null,
          },
        ];
        if (requires_id2) {
          const id2 = {
            id: 2,
            title: "basic-information.safe_limit",
            no: dic[2] ?? null,
          };
          result.splice(2, 0, id2);
        }
        break;
      // case Specification1.Road:
      //   result = [
      //     {
      //       id: 0,
      //       title: "basic-information-road.bs_dcp_of_is",
      //       no: dic[0] ?? null,
      //     },
      //     {
      //       id: 1,
      //       title: "basic-information-road.bs_durability_fatigue",
      //       no: dic[1] ?? null,
      //     },
      //     {
      //       id: 2,
      //       title: "basic-information-road.bs_lcc1",
      //       no: dic[2] ?? null,
      //     },
      //     {
      //       id: 3,
      //       title: "basic-information-road.bs_lcc2_8",
      //       no: dic[3] ?? null,
      //     },
      //     {
      //       id: 4,
      //       title: "basic-information-road.bs_lcc9",
      //       no: dic[4] ?? null,
      //     },
      //     {
      //       id: 5,
      //       title: "basic-information-road.bs_lcc10",
      //       no: dic[5] ?? null,
      //     },
      //     {
      //       id: 6,
      //       title: "basic-information-road.bs_lcc11",
      //       no: dic[6] ?? null,
      //     },
      //     {
      //       id: 7,
      //       title: "basic-information-road.bs_lcc12",
      //       no: dic[7] ?? null,
      //     },
      //     // {
      //     //   id: 8,
      //     //   title: "basic-information-road.bs_min_rebar_amount",
      //     //   no: dic[8] ?? null,
      //     // },
      //   ];
      //   break;
      default:
        throw new Error(`Invalid specification1: ${specification1}`);
    }
    return result;
  }

  private _pickup_shear_force_dic: {
    [key in Category]?: { [key: number]: number };
  } = {};
  set pickup_shear_force(pickup_shear_force: PickupShearForceList | undefined) {
    if (pickup_shear_force) {
      const category = this.category;
      const dic: { [key: number]: number } = {};
      for (const ps of pickup_shear_force) {
        const id = ps.id;
        const no = ps.no;
        if (no !== null) {
          dic[id] = no;
        }
      }
      this._pickup_shear_force_dic[category] = dic;
    }
  }
  get pickup_shear_force(): PickupShearForceList {
    return this._pickup_shear_force.map((s) => ({
      id: s.id,
      title: this.translate.instant(s.title),
      no: s.no,
    }));
  }
  private get _pickup_shear_force(): PickupShearForceList {
    const specification1 = this.specification1;
    const category = this.category;
    const dic = this._pickup_shear_force_dic[category] ?? {};
    let result: PickupShearForceList;
    switch (specification1) {
      case Specification1.Rail:
      // case Specification1.Rail_Ph:
      case Specification1.Rail_Bd:
        const isH16 = !this.isR5();
        result = [
          {
            id: 0,
            title: "basic-information.d_shear_judge",
            no: dic[0] ?? null,
          },
          {
            id: 1,
            title: "basic-information.pl_d",
            no: dic[1] ?? null,
          },
          {
            id: 2,
            title: "basic-information.vl_d",
            no: dic[2] ?? null,
          },
          {
            id: 3,
            title: "basic-information.safe_pa",
            no: dic[3] ?? null,
          },
          {
            id: 4,
            title: "basic-information.safe_pv",
            no: dic[4] ?? null,
          },
          {
            id: 5,
            title: "basic-information.safe_d",
            no: dic[5] ?? null,
          },
          {
            id: 6,
            title: isH16
              ? "basic-information.r_ex"
              : "basic-information.u_damage",
            no: dic[6] ?? null,
          },
          {
            id: 7,
            title: "basic-information.r_at",
            no: dic[7] ?? null,
          },
        ];
        break;
      case Specification1.Road:
        result = [
          {
            id: 0,
            title: "basic-information-road.sfv_dcp_of_is",
            no: dic[0] ?? null,
          },
          {
            id: 1,
            title: "basic-information-road.sfv_durability_fatigue",
            no: dic[1] ?? null,
          },
          {
            id: 2,
            title: "basic-information-road.sfv_lcc1",
            no: dic[2] ?? null,
          },
          {
            id: 3,
            title: "basic-information-road.sfv_lcc2_8",
            no: dic[3] ?? null,
          },
          {
            id: 4,
            title: "basic-information-road.sfv_lcc9",
            no: dic[4] ?? null,
          },
          {
            id: 5,
            title: "basic-information-road.sfv_lcc10",
            no: dic[5] ?? null,
          },
          {
            id: 6,
            title: "basic-information-road.sfv_lcc11",
            no: dic[6] ?? null,
          },
          {
            id: 7,
            title: "basic-information-road.sfv_lcc12",
            no: dic[7] ?? null,
          },
        ];
        break;
      default:
        throw new Error(`Invalid specification1: ${specification1}`);
    }
    return result;
  }

  private _pickup_torsional_moment_dic: {
    [key in Category]?: { [key: number]: number };
  } = {};
  set pickup_torsional_moment(
    pickup_torsional_moment: PickupTorsionalMomentList | undefined,
  ) {
    if (pickup_torsional_moment) {
      const category = this.category;
      const dic: { [key: number]: number } = {};
      for (const pt of pickup_torsional_moment) {
        const id = pt.id;
        const no = pt.no;
        if (no !== null) {
          dic[id] = no;
        }
      }
      this._pickup_torsional_moment_dic[category] = dic;
    }
  }
  get pickup_torsional_moment(): PickupTorsionalMomentList {
    return this._pickup_torsional_moment.map((s) => ({
      id: s.id,
      title: this.translate.instant(s.title),
      no: s.no,
    }));
  }
  private get _pickup_torsional_moment(): PickupTorsionalMomentList {
    const specification1 = this.specification1;
    const category = this.category;
    const dic = this._pickup_torsional_moment_dic[category] ?? {};
    let result: PickupTorsionalMomentList;
    switch (specification1) {
      case Specification1.Rail:
      // case Specification1.Rail_Ph:
      case Specification1.Rail_Bd:
        const isH16 = !this.isR5();
        result = [
          {
            id: 0,
            title: "basic-information.d_torsion_judge",
            no: dic[0] ?? null,
          },
          {
            id: 1,
            title: "basic-information.pl_d",
            no: dic[1] ?? null,
          },
          {
            id: 5,
            title: "basic-information.safe_d",
            no: dic[5] ?? null,
          },
          {
            id: 6,
            title: isH16
              ? "basic-information.r_ex"
              : "basic-information.u_damage",
            no: dic[6] ?? null,
          },
          {
            id: 7,
            title: "basic-information.r_at",
            no: dic[7] ?? null,
          },
        ];
        break;
      case Specification1.Road:
        result = [
          {
            id: 0,
            title: "basic-information-road.tv_dcp_of_is",
            no: dic[0] ?? null,
          },
          {
            id: 1,
            title: "basic-information-road.tv_durability_fatigue",
            no: dic[1] ?? null,
          },
          {
            id: 2,
            title: "basic-information-road.tv_lcc1",
            no: dic[2] ?? null,
          },
          {
            id: 3,
            title: "basic-information-road.tv_lcc2_8",
            no: dic[3] ?? null,
          },
          {
            id: 4,
            title: "basic-information-road.tv_lcc9",
            no: dic[4] ?? null,
          },
          {
            id: 5,
            title: "basic-information-road.tv_lcc10",
            no: dic[5] ?? null,
          },
          {
            id: 6,
            title: "basic-information-road.tv_lcc11",
            no: dic[6] ?? null,
          },
          {
            id: 7,
            title: "basic-information-road.tv_lcc12",
            no: dic[7] ?? null,
          },
        ];
        break;
      default:
        throw new Error(`Invalid specification1: ${specification1}`);
    }
    return result;
  }

  get conditions_list(): ConditionsList {
    return [];
  }

  setPickUpData(): void {}

  getSaveData(): BasicInformation {
    const result: BasicInformation = {
      specification1_list: this.specification1_list,
      specification2_list: this.specification2_list,
      pickup_moment: this.pickup_moment,
      pickup_shear_force: this.pickup_shear_force,
      pickup_torsional_moment: this.pickup_torsional_moment,
    };
    return result;
  }
  setSaveData(basic: BasicInformation): void {
    this.clear();
    this.specification1_list = basic.specification1_list;
    this.specification2_list = basic.specification2_list;
    this.pickup_moment = basic.pickup_moment;
    this.pickup_shear_force = basic.pickup_shear_force;
    this.pickup_torsional_moment = basic.pickup_torsional_moment;
  }

  set_pickup_moment(id: number, no: number): void {
    const category = this.category;
    const dic = this._pickup_moment_dic[category] ?? {};
    dic[id] = no;
    this._pickup_moment_dic[category] = dic;
  }
  set_pickup_shear_force(id: number, no: number): void {
    const category = this.category;
    const dic = this._pickup_shear_force_dic[category] ?? {};
    dic[id] = no;
    this._pickup_shear_force_dic[category] = dic;
  }
  // set_pickup_torsional_moment(id: number, no: number): void {
  //   const category = this.category;
  //   const dic = this._pickup_torsional_moment_dic[category] ?? {};
  //   dic[id] = no;
  //   this._pickup_torsional_moment_dic[category] = dic;
  // }
}
