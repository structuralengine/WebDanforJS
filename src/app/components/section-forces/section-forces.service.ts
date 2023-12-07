import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { InputDesignPointsService } from '../design-points/design-points.service';
import { TranslateService } from "@ngx-translate/core";
import { MenuService } from '../menu/menu.service';
import { log } from 'console';

@Injectable({
  providedIn: 'root'
})
export class InputSectionForcesService {

  private force: any[];

  constructor(
    private helper: DataHelperModule,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private translate: TranslateService,
    private menu: MenuService
  ) {
    this.clear();
  }
  public clear(): void {
    this.force = new Array();
  }

  public getColumnHeaders1(): any {
    let pushIds = new Array();
    let pickup_moment = this.basic.pickup_moment;

    if(this.menu.selectedRoad){
      pushIds = [0, 2];
      pickup_moment = pickup_moment.filter((value, index) => this.translate.instant(value.title) !== this.translate.instant("basic-information-road.bs_min_rebar_amount"));
    }
    else
      pushIds = [0, 2, 5, 6, 7, 8];
    return this.createColumnHeaders(
      pickup_moment,
      pushIds,
      "Md"
    );
  }

  public getColumnHeaders2(): any {
    let pushIds = new Array();
    if(this.menu.selectedRoad){
      pushIds = [0, 2];
    }
    else
      pushIds = [0, 3, 5, 6, 7];

    return this.createColumnHeaders(
      this.basic.pickup_shear_force,
      pushIds,
      "Vd"
    );
  }

  public getColumnHeaders3(): any {
    let pushIds = new Array();
    if(this.menu.selectedRoad){
      pushIds = [0, 2];
    }
    else
      pushIds = [0, 5, 6, 7];

    return this.createColumnHeaders(
      this.basic.pickup_torsional_moment,
      pushIds,
      "Mt"
    );
  }

  public cutString(input, index) {
    const mainTitle = input.substring(0, index).trim();
    const subTitle = input.substring(index).trim();
    return [mainTitle, subTitle];
  }

  private createColumnHeaders(
    dataArray: any[],
    pushIds: number[],
    keyPrefix: string
  ): any {
    const baseColumn: object = {
      title: this.translate.instant("section-forces.p_name"),
      align: "left",
      dataType: "string",
      dataIndx: "p_name",
      frozen: true,
      sortable: false,
      width: 250,
      nodrag: true,
    };

    let crrLang = this.translate.currentLang ?? "ja";
    const result: object[] = [baseColumn];
    let currentHead: any = null;

    if(this.menu.selectedRoad)
    {
      //console.log(dataArray);
      //Customer title table for Road
      for (const data of dataArray) {
        // const [mainTitle, subTitle] = this.translate.instant(data.title).split(" ");
        let titles = new Array();

        if(crrLang === "en"){
          if (data.id < 2)
            titles = this.cutString(this.translate.instant(data.title), 10);
          else
            titles = this.cutString(this.translate.instant(data.title), 22);

          if (pushIds.includes(data.id)) {
            if (currentHead) {
              result.push(currentHead);
            }
          currentHead = this.createNewHeader(titles[0]);
        }
        }
        else
        {
          // if (data.id < 2)
          //   titles = this.translate.instant(data.title).split(" ");
          // else
            titles = this.translate.instant(data.title).split(" ");
          if (pushIds.includes(data.id)) {
            if (currentHead) {
              result.push(currentHead);
            }
            currentHead = this.createNewHeader(titles[0]);
          }
        }
        const key = keyPrefix + data.id;
        currentHead.colModel.push(this.createSubColumn(titles[1], key, keyPrefix));
      }
    }
    else
    {
      for (const data of dataArray) {
        //If it cannot be translated, it will still return itself
        // const [mainTitle, subTitle] = data.title.split(" ");
        const [mainTitle, subTitle] = this.translate.instant(data.title).split(" ");
        if (pushIds.includes(data.id)) {
          if (currentHead) {
            result.push(currentHead);
          }
          currentHead = this.createNewHeader(mainTitle);
        }
  
        const key = keyPrefix + data.id;
        currentHead.colModel.push(this.createSubColumn(subTitle, key, keyPrefix));
      }
    }

    if (currentHead) {
      result.push(currentHead);
    }

    return result;
  }

  private createNewHeader(title: string): any {
    return {
      title: title,
      align: "center",
      colModel: [],
      nodrag: true,
    };
  }

  private createSubColumn(
    subTitle: string,
    key: string,
    keyPrefix: string
  ): object {
    const baseConfig = {
      title: subTitle,
      align: "center",
      colModel: [],
      nodrag: true,
    };

    switch (keyPrefix) {
      case "Md":
        baseConfig.colModel.push(
          {
            title: "Md<br/>(kN・m)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Md",
            sortable: false,
            width: 100,
            nodrag: true,
          },
          {
            title: "Nd<br/>(kN)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Nd",
            sortable: false,
            width: 100,
            nodrag: true,
          }
        );
        break;
      case "Vd":
        baseConfig.colModel.push(
          {
            title: "Vd<br/>(kN)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Vd",
            sortable: false,
            width: 100,
            nodrag: true,
          },
          {
            title: "Md<br/>(kN・m)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Md",
            sortable: false,
            width: 100,
            nodrag: true,
          },
          {
            title: "Nd<br/>(kN)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Nd",
            sortable: false,
            width: 100,
            nodrag: true,
          }
        );
        break;
      case "Mt":
        baseConfig.colModel.push(
          {
            title: "Mt<br/>(kN・m)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Mt",
            sortable: false,
            width: 100,
            nodrag: true,
          },
          {
            title: "Md<br/>(kN・m)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Md",
            sortable: false,
            width: 100,
            nodrag: true,
          },
          {
            title: "Vd<br/>(kN)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Vd",
            sortable: false,
            width: 100,
            nodrag: true,
          },
          {
            title: "Nd<br/>(kN)",
            dataType: "float",
            format: "#.00",
            dataIndx: key + "_Nd",
            sortable: false,
            width: 100,
            nodrag: true,
          }
        );
        break;
      default:
        break;
    }
    return baseConfig;
  }

  // １行 のデフォルト値
  public default_column(index: number): any {

    const rows: any = {
      index,
    };

    for (const m of this.basic.pickup_moment) {
      const key = 'Md' + m.id;
      rows[key + '_Md'] = null;
      rows[key + '_Nd'] = null;
    }

    for (const s of this.basic.pickup_shear_force) {
      const key = 'Vd' + s.id;
      rows[key + '_Vd'] = null;
      rows[key + '_Md'] = null;
      rows[key + '_Nd'] = null;
    }

    for (const s of this.basic.pickup_torsional_moment) {
      const key = 'Mt' + s.id;
      rows[key + '_Mt'] = null;
      rows[key + '_Md'] = null;
      rows[key + '_Vd'] = null;
      rows[key + '_Nd'] = null;
    }

    return rows;
  }


  // 曲げモーメント moment_force から 指定行 のデータを返す関数
  public getTable1Columns(index: number): any {

    let result = this.force.find((item) => item.index === index);

    // 対象データが無かった時に処理
    if (result == null) {
      result = this.default_column(index);
      this.force.push(result);
    }

    //
    const design_point = this.points.getTableColumn(index);
    const p_name: string = (design_point !== undefined) ? design_point.p_name : '';
    // const La: number = (design_point !== undefined) ? design_point.La: null;

    result['p_name'] = p_name;
    // result['La'] = La;
    return result;

  }

  // ファイル
  public setTableColumns(table_datas: any[]) {
    this.clear();
    for (const data of table_datas) {
      const new_colum = this.default_column(data.index);
      let flg = false;
      for (const key of Object.keys(new_colum)) {
        if (key in data) {
          const value = this.helper.toNumber(data[key]);
          if (value !== null) {
            new_colum[key] = value;
            flg = true;
          }
        }
      }
      if (flg === true) {
        this.force.push(new_colum);
      }
      // ????
      // const position = this.points.getCalcData(new_colum.index);
      // position.p_name =  data.p_name;
      // position.La = data.La;
    }
  }

  public getSaveData(): any {
    return this.force;
  }

  public setSaveData(force: any) {
    this.force = force;
  }


}
