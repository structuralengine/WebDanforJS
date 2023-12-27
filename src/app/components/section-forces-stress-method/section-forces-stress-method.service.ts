import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { TranslateService } from "@ngx-translate/core";
import { MenuService } from '../menu/menu.service';
import { log } from 'console';
import { InputBasicInformationStressMethodService } from '../basic-information-stress-method/basic-information-stress-method.service';

@Injectable({
  providedIn: 'root'
})
export class InputSectionForcesStressMethodService {

  // private force: any[];
  // public toggleStatus: { [key: string]: boolean } = {};
  // constructor(
  //   private helper: DataHelperModule,
  //   private basicStressMethod: InputBasicInformationStressMethodService,
  //   private translate: TranslateService,
  // ) {
  //   this.clear();
  // }
  // public clear(): void {
  //   this.force = new Array();
  //   this.toggleStatus= {};
  // }

  // public getColumnHeaders1(): any {
  //   let pushIds = new Array();
  //   let pickup_moment = this.basicStressMethod.pickup_moment;
  //   pushIds = [0, 1, 2,];
  //   return this.createColumnHeaders(
  //     pickup_moment,
  //     pushIds,
  //     "Md"
  //   );
  // }

  // public getColumnHeaders2(): any {
  //   let pushIds = new Array();
  //   pushIds = [0, 1, 2,];
  //   return this.createColumnHeaders(
  //     this.basicStressMethod.pickup_shear_force,
  //     pushIds,
  //     "Vd"
  //   );
  // }

  // public getColumnHeaders3(): any {
  //   let pushIds = new Array();
  //   pushIds = [0, 1, 2,];
  //   return this.createColumnHeaders(
  //     this.basicStressMethod.pickup_torsional_moment,
  //     pushIds,
  //     "Mt"
  //   );
  // }
  // public handleTitle(inputString: string, number?: number){
  //   //// split input string and return [a, b] => ex: "This words" => ["This", "words"]
  //   inputString = this.translate.instant(inputString);
  //   const words: string[] = inputString.split(' ');
  //   let mainTitle, subTitle;
    
  //   //Set specification case title Japanese
  //   if(words.length <=3)
  //   {
  //     //get number words from Array
  //     const firstTemp = words.slice(0, 1);
  //     mainTitle = firstTemp.join(' ')

  //     const remainTemp = words.slice(1);
  //     subTitle = remainTemp.join(' ')
  //     return [mainTitle, subTitle]
  //   }
  //   else
  //   {
  //     //get number words from Array
  //     if (number == null || number > words.length) {
  //       mainTitle = words[0];
  //       subTitle = " ";
  //     }
  //     else {
  //       const firstTemp = words.slice(0, number);
  //       mainTitle = firstTemp.join(' ')

  //       const remainTemp = words.slice(number);
  //       subTitle = remainTemp.join(' ')
  //     }
  //     return [mainTitle, subTitle]
  //   }
  // }

  // private createColumnHeaders(
  //   dataArray: any[],
  //   pushIds: number[],
  //   keyPrefix: string
  // ): any {
  //   const baseColumn: object = {
  //     title: this.translate.instant("section-forces.p_name"),
  //     align: "left",
  //     dataType: "string",
  //     dataIndx: "p_name",
  //     frozen: true,
  //     sortable: false,
  //     width: 250,
  //     nodrag: true,
  //   };

  //   let crrLang = this.translate.currentLang ?? "ja";
  //   const result: object[] = [baseColumn];
  //   let currentHead: any = null;
  //   for (const data of dataArray) {
  //       if (pushIds.includes(data.id)) {
  //         if (currentHead) {
  //           result.push(currentHead);
  //         }
  //         currentHead = this.createNewHeader(data.title);
  //       }
  //       const key = keyPrefix + data.id;
  //       currentHead.colModel=this.createSubColumnNew( key, keyPrefix);
  //     }
  //   if (currentHead) {
  //     result.push(currentHead);
  //   }

  //   return result;
  // }

  // private createNewHeader(title: string): any {
  //   return {
  //     title: title,
  //     align: "center",
  //     colModel: [],
  //     nodrag: true,
  //   };
  // }

  // private createSubColumn(
  //   subTitle: string,
  //   key: string,
  //   keyPrefix: string
  // ): object {
  //   const baseConfig = {
  //     title: subTitle,
  //     align: "center",
  //     colModel: [],
  //     nodrag: true,
  //   };

  //   switch (keyPrefix) {
  //     case "Md":
  //       baseConfig.colModel.push(
  //         {
  //           title: "Md<br/>(kN・m)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Md",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Nd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Nd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         }
  //       );
  //       break;
  //     case "Vd":
  //       baseConfig.colModel.push(
  //         {
  //           title: "Vd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Vd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Md<br/>(kN・m)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Md",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Nd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Nd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         }
  //       );
  //       break;
  //     case "Mt":
  //       baseConfig.colModel.push(
  //         {
  //           title: "Mt<br/>(kN・m)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Mt",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Md<br/>(kN・m)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Md",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Vd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Vd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Nd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Nd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         }
  //       );
  //       break;
  //     default:
  //       break;
  //   }
  //   return baseConfig;
  // }
  // private createSubColumnNew(
  //   key: string,
  //   keyPrefix: string
  // ): any {
  //   let baseConfig;

  //   switch (keyPrefix) {
  //     case "Md":
  //       baseConfig= [
  //         {
  //           title: "Md<br/>(kN・m)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Md",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Nd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Nd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         }
  //       ];
  //       break;
  //     case "Vd":
  //       baseConfig= [
  //         {
  //           title: "Vd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Vd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Md<br/>(kN・m)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Md",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Nd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Nd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         }
  //       ];
  //       break;
  //     case "Mt":
  //       baseConfig= [
  //         {
  //           title: "Mt<br/>(kN・m)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Mt",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Md<br/>(kN・m)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Md",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Vd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Vd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         },
  //         {
  //           title: "Nd<br/>(kN)",
  //           dataType: "float",
  //           format: "#.00",
  //           dataIndx: key + "_Nd",
  //           sortable: false,
  //           width: 100,
  //           nodrag: true,
  //         }
  //       ];
  //       break;
  //     default:
  //       break;
  //   }
  //   return baseConfig;
  // }
  // // １行 のデフォルト値
  // public default_column(index: number): any {

  //   const rows: any = {
  //     index,
  //   };

  //   for (const m of this.basicStressMethod.pickup_moment) {
  //     const key = 'Md' + m.id;
  //     rows[key + '_Md'] = null;
  //     rows[key + '_Nd'] = null;
  //   }

  //   for (const s of this.basicStressMethod.pickup_shear_force) {
  //     const key = 'Vd' + s.id;
  //     rows[key + '_Vd'] = null;
  //     rows[key + '_Md'] = null;
  //     rows[key + '_Nd'] = null;
  //   }

  //   for (const s of this.basicStressMethod.pickup_torsional_moment) {
  //     const key = 'Mt' + s.id;
  //     rows[key + '_Mt'] = null;
  //     rows[key + '_Md'] = null;
  //     rows[key + '_Vd'] = null;
  //     rows[key + '_Nd'] = null;
  //   }

  //   return rows;
  // }


  // // 曲げモーメント moment_force から 指定行 のデータを返す関数
  // public getTable1Columns(index: number): any {
  //   let result = this.force.find((item) => item.index === index);
  //   // 対象データが無かった時に処理
  //   if (result == null) {
  //     result = this.default_column(index);
  //     this.force.push(result);
  //   }
  //   // result['La'] = La;
  //   return result;

  // }

  // // ファイル
  // public setTableColumns(table_datas: any[]) {
  //   this.clear();
  //   for (const data of table_datas) {
  //     const new_colum = this.default_column(data.index);
  //     let flg = false;
  //     for (const key of Object.keys(new_colum)) {
  //       if (key in data) {
  //         const value = this.helper.toNumber(data[key]);
  //         if (value !== null) {
  //           new_colum[key] = value;
  //           flg = true;
  //         }
  //       }
  //     }
  //     if (flg === true) {
  //       this.force.push(new_colum);
  //     }
  //     // ????
  //     // const position = this.points.getCalcData(new_colum.index);
  //     // position.p_name =  data.p_name;
  //     // position.La = data.La;
  //   }
  // }

  // public getSaveData(): any {
  //   return this.force;
  // }

  // public setSaveData(force: any) {
  //   this.force = force;
  // }

  // public setCelCols(toggleStatus: any){
  //    this.toggleStatus = toggleStatus;
  // }
}