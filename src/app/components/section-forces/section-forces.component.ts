import { parse } from 'path';
import { forEach } from 'jszip';
import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { InputSectionForcesService } from './section-forces.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { MenuService } from '../menu/menu.service';
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { log } from 'console';
import { hide } from '@popperjs/core';


@Component({
  selector: 'app-section-forces',
  templateUrl: './section-forces.component.html',
  styleUrls: ['./section-forces.component.scss']
})
export class SectionForcesComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private force: InputSectionForcesService,
    private translate: TranslateService,
    private menu: MenuService,
    private basic: InputBasicInformationService,
     ) { }

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;
  public currentColGroups: { [key: string]: { start: number; end: number } };
  public currentColGroupKeys: string[];
  public bendingColGroupKeys: string[];
  public bendingColGroups = {
    stress: { start: 1, end: 4 }, //耐久性トグル
    "safe-ff": { start: 5, end: 10 }, //安全性(疲労破壊)トグル
    "safe-destruct": { start: 11, end: 12 }, //安全性(破壊)トグル
    "recover-ex-earth": { start: 13, end: 14 }, //復旧性(地震以外)トグル
    "recover-earth": { start: 15, end: 16 }, //復旧性(地震)トグル
    "rebar": { start: 17, end: 18 }, //最小鉄筋量トグル
  };
  public shearColGroups = {
    stress: { start: 1, end: 9 }, //耐久性トグル
    "safe-ff": { start: 10, end: 15 }, //安全性(疲労破壊)トグル
    "safe-destruct": { start: 16, end: 18 }, //安全性(破壊)トグル
    "recover-ex-earth": { start: 19, end: 21 }, //復旧性(地震以外)トグル
    "recover-earth": { start: 22, end: 24 }, //復旧性(地震)トグル
  };
  public torsionalColGroups = {
    stress: { start: 1, end: 8 }, //耐久性トグル
    "safe-destruct": { start: 9, end: 12 }, //安全性(破壊)トグル
    "recover-ex-earth": { start: 13, end: 16 }, //復旧性(地震以外)トグル
    "recover-earth": { start: 17, end: 20 }, //復旧性(地震)トグル
  };

  public bendingColGroupsRoad : any;
  public shearColGroupsRoad : any;
  public torsionalColGroupsRoad: any;;

  public toggleStatus: { [key: string]: boolean } = {};

  private ROWS_COUNT = 0;
  private table_datas: any[] = [];

  // 曲げモーメントのグリッド設定変数
  private columnHeaders1: object[];

  // せん断力のグリッド設定変数
  private columnHeaders2: object[];

  // ねじりモーメントのグリッド設定変数
  private columnHeaders3: object[];
  public imgLink ="";
  public selectedRoad = false;
  public currentSW: any[];
  public groupActive: any[];
  public toggleStatusPick: { [key: string]: boolean } = {};
  public toggleStatusShear: { [key: string]: boolean } = {};
  public idTagPage:number=0;

  ngOnInit() {
    this.selectedRoad = this.menu.selectedRoad;
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.saveData();
      if(this.menu.selectedRoad){
        this.setKeyGroupsRoad()
      }
      this.initTable ();
    });

    if(this.menu.selectedRoad){
      this.setKeyGroupsRoad()
    }
    this.initTable ();
    
    // let currentLang = this.translate.currentLang;
    // switch (currentLang) {
    //   case "en": {
    //     this.imgLink = "assets/img/basic-information/en.png";
    //     break;
    //   }
    //   case "ja": {
    //     this.imgLink = "assets/img/basic-information/jp.png";
    //     break;
    //   }
    //   default: {
    //   }
    // }
    // this.translate.onDefaultLangChange.subscribe((event: LangChangeEvent) => {
    //   switch (event.lang) {
    //     case "en": {
    //       this.imgLink = "assets/img/basic-information/en.png";
    //       break;
    //     }
    //     case "ja": {
    //       this.imgLink = "assets/img/basic-information/jp.png";
    //       break;
    //     }
    //     default: {
    //     }
    //   }
    // });
    // this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
    //   switch (event.lang) {
    //     case "en": {
    //       this.imgLink = "assets/img/basic-information/en.png";
    //       break;
    //     }
    //     case "ja": {
    //       this.imgLink = "assets/img/basic-information/jp.png";
    //       break;
    //     }
    //     default: {
    //     }
    //   }
    // });
    // //this.setColGroupsAndKeys(0);
    // if (JSON.stringify(this.force.toggleStatus) != '{}') {
    //   this.toggleStatus = this.force.toggleStatus;
    //   this.currentColGroupKeys = Object.keys(this.force.toggleStatus);      
    // } else {
    //   this.currentColGroups = this.bendingColGroups;
    //   this.currentColGroupKeys = Object.keys(this.currentColGroups);
    //   for (const group of this.currentColGroupKeys) {
    //     this.toggleStatus[group] = true;
    //   }
    // }

    // this.setColGroupsAndKeys(0);
    // this.bendingColGroupKeys = Object.keys(this.bendingColGroups);
    // for (const group of this.bendingColGroupKeys) {
    //   this.toggleStatus[group] = true;
    // }

    // // データを登録する
    // this.ROWS_COUNT = this.rowsCount();
    // this.loadData(this.ROWS_COUNT);

    // this.columnHeaders1 = this.force.getColumnHeaders1();
    // this.columnHeaders2 = this.force.getColumnHeaders2();
    // this.columnHeaders3 = this.force.getColumnHeaders3();

    // // グリッドの初期化 --------------------------------------
    // this.options = {
    //   showTop: false,
    //   reactive: true,
    //   sortable: false,
    //   locale: 'jp',
    //   height: this.tableHeight().toString(),
    //   numberCell: { show: true }, // 行番号
    //   colModel: this.columnHeaders1,
    //   dataModel: { data: this.table_datas },
    //   freezeCols: 1,
    //   contextMenu: {
    //     on: true,
    //     items: [
    //       {
    //         name: this.translate.instant("action_key.copy"),
    //         shortcut: 'Ctrl + C',
    //         action: function (evt, ui, item) {
    //           this.copy();
    //         }
    //       },
    //       {
    //         name: this.translate.instant("action_key.paste"),
    //         shortcut: 'Ctrl + V',
    //         action: function (evt, ui, item) {
    //           this.paste();
    //         }
    //       },
    //       {
    //         name: this.translate.instant("action_key.cut"),
    //         shortcut: 'Ctrl + X',
    //         action: function (evt, ui, item) {
    //           this.cut();
    //         }
    //       },
    //       {
    //         name: this.translate.instant("action_key.undo"),
    //         shortcut: 'Ctrl + Z',
    //         action: function (evt, ui, item) {
    //           this.History().undo();
    //         }
    //       }
    //     ]
    //   },
    //   beforeTableView: (evt, ui) => {
    //     const dataV = this.table_datas.length;
    //     if (ui.initV == null) {
    //       return;
    //     }
    //     if (ui.finalV >= dataV - 1) {
    //       this.loadData(dataV + this.ROWS_COUNT);
    //       this.grid.refreshDataAndView();
    //     }
    //   },
    // };
  }

  initTable () {
    this.setColGroupsAndKeys(0);

    //Set active start
    if(this.menu.selectedRoad){
      this.bendingColGroupKeys = Object.keys(this.bendingColGroupsRoad);
    }
    else
    {
      this.bendingColGroupKeys = Object.keys(this.bendingColGroups);
    }
    const toggleStatusService:any = this.force.getToggleStatus();
    if(Object.keys(toggleStatusService).length>0){
      this.toggleStatus = toggleStatusService
    }else{
      for (const group of this.bendingColGroupKeys) {
        this.toggleStatus[group] = true;
      }
    }
    

    // データを登録する
    this.ROWS_COUNT = this.rowsCount();
    this.loadData(this.ROWS_COUNT);

    this.columnHeaders1 = this.force.getColumnHeaders1();
    this.columnHeaders2 = this.force.getColumnHeaders2();
    this.columnHeaders3 = this.force.getColumnHeaders3();

    // グリッドの初期化 --------------------------------------
    this.options = {
      showTop: false,
      reactive: true,
      sortable: false,
      locale: 'jp',
      height: this.tableHeight().toString(),
      numberCell: { show: true }, // 行番号
      colModel: this.columnHeaders1,
      dataModel: { data: this.table_datas },
      freezeCols: 1,
      contextMenu: {
        on: true,
        items: [
          {
            name: this.translate.instant("action_key.copy"),
            shortcut: 'Ctrl + C',
            action: function (evt, ui, item) {
              this.copy();
            }
          },
          {
            name: this.translate.instant("action_key.paste"),
            shortcut: 'Ctrl + V',
            action: function (evt, ui, item) {
              this.paste();
            }
          },
          {
            name: this.translate.instant("action_key.cut"),
            shortcut: 'Ctrl + X',
            action: function (evt, ui, item) {
              this.cut();
            }
          },
          {
            name: this.translate.instant("action_key.undo"),
            shortcut: 'Ctrl + Z',
            action: function (evt, ui, item) {
              this.History().undo();
            }
          }
        ]
      },
      beforeTableView: (evt, ui) => {
        const dataV = this.table_datas.length;
        if (ui.initV == null) {
          return;
        }
        if (ui.finalV >= dataV - 1) {
          this.loadData(dataV + this.ROWS_COUNT);
          this.grid.refreshDataAndView();
        }
      },
    };
  }

  ngAfterViewInit() {
    this.activeButtons(0);

    this.grid.refreshCell({
      rowIndx: 0,
      colIndx: 0,
    });
    this.activePageChenge(0)
  }

  private setKeyGroupsRoad(){
    const basic = this.basic.getSaveData();
    this.bendingColGroupsRoad = {};
    this.shearColGroupsRoad = {};
    this.torsionalColGroupsRoad = {};
    const arrayIgnore = ["Minimum rebar amount[1-10]", "最小鉄筋量[1~10]"]
    let pickup_moment = basic.pickup_moment;

    pickup_moment = pickup_moment.filter((value, index) => !arrayIgnore.includes(this.translate.instant(value.title)));

    //bending
    let bendingRoad: any = new Object, iB = 1;
    pickup_moment.forEach((value, index) => {
      let key = "B" + value.id;
      bendingRoad[key] = { start: iB, end: iB + 1 };
      iB += 2;
    });
    this.bendingColGroupsRoad = bendingRoad;

    //Shear
    let shearRoad: any = new Object, iS = 1;
    basic.pickup_shear_force.forEach((value, index) => {
      let key = "S" + value.id;
      shearRoad[key] = { start: iS, end: iS + 2 };
      iS += 3;
    });
    this.shearColGroupsRoad = shearRoad;

    //Torsional
    let torsionalRoad: any = new Object, iT = 1;
    basic.pickup_torsional_moment.forEach((value, index) => {
      let key = "T" + value.id;
      torsionalRoad[key] = { start: iT, end: iT + 3 };
      iT += 4;
    });
    this.torsionalColGroupsRoad = torsionalRoad;
  }

  private setTitleGroupsRoad(id: number) {
    const basic = this.basic.getSaveData();
    //Set title switch
    let currentSW = new Array();
    if (id === 0) {
      const arrayIgnore = ["Minimum rebar amount[1-10]", "最小鉄筋量[1~10]"]
      let pickup_moment = basic.pickup_moment;
      pickup_moment = pickup_moment.filter((value, index) => !arrayIgnore.includes(this.translate.instant(value.title)));
      pickup_moment.forEach((value, index) => {
        let key = "B" + value.id;
        const [mainTitle, subTitle] = this.force.handleTitle(value.title, value.id < 2 ? 1 : 3);
        currentSW.push({
          id: key,
          title: subTitle,
        })
      });
    } else if (id === 1) {
      basic.pickup_shear_force.forEach((value, index) => {
        let key = "S" + value.id;
        const [mainTitle, subTitle] = this.force.handleTitle(value.title, value.id < 2 ? 1 : 3);
        currentSW.push({
          id: key,
          title: subTitle,
        })
      });
    } else if (id === 2) {
      basic.pickup_torsional_moment.forEach((value, index) => {
        let key = "T" + value.id;
        const [mainTitle, subTitle] = this.force.handleTitle(value.title, value.id < 2 ? 1 : 3);
        currentSW.push({
          id: key,
          title: subTitle,
        })
      });
    }
    this.currentSW = currentSW;
  }
  private setColGroupsAndKeys(id: number): void {
    this.groupActive = [];
    if(this.menu.selectedRoad)
    {
      //set for CurrentColGroupKeys
      this.setTitleGroupsRoad(id);
      this.toggleStatus = {};

      //set title again
      this.columnHeaders1 = this.force.getColumnHeaders1();
      this.columnHeaders2 = this.force.getColumnHeaders2();
      this.columnHeaders3 = this.force.getColumnHeaders3();

      if (id === 0) {
        this.currentColGroups = this.bendingColGroupsRoad;
        this.toggleStatus = this.toggleStatusPick
      } else if (id === 1) {
        this.currentColGroups = this.shearColGroupsRoad;
        this.toggleStatus = this.toggleStatusShear
      } else if (id === 2) {
        this.currentColGroups = this.torsionalColGroupsRoad;
      }
    }
    else
    {
      if (id === 0) {
        this.currentColGroups = this.bendingColGroups;
      } else if (id === 1) {
        this.currentColGroups = this.shearColGroups;
      } else if (id === 2) {
        this.currentColGroups = this.torsionalColGroups;
      }
    }
    this.currentColGroupKeys = Object.keys(this.currentColGroups);
    for (const group of this.currentColGroupKeys) {
      if (this.toggleStatus[group] === undefined) {
        this.toggleStatus[group] = true;
      }
      if (this.selectedRoad) {
        if(this.toggleStatus[group])
        {
          const id = parseInt(group.slice(1));
          this.groupActive.push(id);
        }
      }
    }
  }

  public toggleDataLoad(group: string): void {
    this.toggleStatus[group] = !this.toggleStatus[group];
    const { start, end } = this.currentColGroups[group];
    this.grid.grid.getColModel().forEach((column, index) => {
      if (index >= start && index <= end) {
        column.hidden = !this.toggleStatus[group];
        const speci1 = this.basic.get_specification1();
        if((index===5 || index===6)&& this.idTagPage===0 && (speci1===0 || speci1===1 || speci1===3)){
          column.hidden =true
        }
      }
    });
    if(this.selectedRoad)
    {
      if(group.includes('B'))
      {
        const returnHeader = this.reloadHeader(group, this.force.getColumnHeaders1());
        this.columnHeaders1 = returnHeader
        this.options.colModel = this.columnHeaders1;
      }
      else if(group.includes('S'))
      {
        const returnHeader = this.reloadHeader(group, this.force.getColumnHeaders2());
        this.columnHeaders1 = returnHeader
        this.options.colModel = this.columnHeaders1;
      }
    }
    this.saveDataCol();
    this.grid.refreshDataAndView();
    this.grid.setColsShow();
  }

  public reloadHeader(group: string, headers: any) {
    let returnHeader = headers;
    const hidden = !this.toggleStatus[group];
    const id = parseInt(group.slice(1));
    if (hidden)
      this.groupActive = this.groupActive.filter((value, index) => value !== id);
    else
      this.groupActive.splice(id, 0, id);

    returnHeader[1].colModel = returnHeader[1].colModel.filter((value, index) => this.groupActive.includes(index));
    returnHeader[2].colModel = returnHeader[2].colModel.filter((value, index) => this.groupActive.includes(index + 2));

    const hideParent1 = this.groupActive.find(value => value < 2);
    if(hideParent1 === undefined || hideParent1 === null) returnHeader.splice(1,1);

    const hideParent2 = this.groupActive.find(value => value >= 2);
    if(hideParent2 === undefined || hideParent2 === null) 
    {
      returnHeader.splice(returnHeader.length - 1,1);
    }
    return returnHeader;
  }

  // 指定行row まで、曲げモーメント入力データを読み取る
  private loadData(row: number): void {
    for (let i = this.table_datas.length + 1; i <= row; i++) {
      const column = this.force.getTable1Columns(i);
      this.table_datas.push(column);
    }
  }


  ngOnDestroy(): void {
    this.saveData();
    // this.saveDataCol();
  }
  public saveData(): void {
    this.force.setTableColumns(this.table_datas);
    
  }

  public saveDataCol() {
    this.force.setCelCols(this.toggleStatus)
  }
  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 250;
    // containerHeight -= 30;
    // containerHeight /= 2;

    return containerHeight;
  }

  // 表高さに合わせた行数を計算する
  private rowsCount(): number {
    const containerHeight = this.tableHeight();
    return Math.round(containerHeight / 30);
  }

  public activePageChenge(id: number): void {
    if(this.selectedRoad){
      this.groupActive = [];
    }
    this.setColGroupsAndKeys(id);
    this.idTagPage=id
    if (id === 0) {
      this.options.colModel = this.columnHeaders1;
    } else if (id === 1) {
      this.options.colModel = this.columnHeaders2;
    } else if (id === 2) {
      this.options.colModel = this.columnHeaders3;
    } else {
      return;
    }

    this.grid.grid.getColModel().forEach((column, index) => {
      for (const [group, { start, end }] of Object.entries(
        this.currentColGroups
      )) {
        if (index >= start && index <= end) {
          column.hidden = !this.toggleStatus[group];
        }
        const speci1 = this.basic.get_specification1();
        if((index===5 || index===6)&& id===0 && (speci1===0 || speci1===1 || speci1===3)){
          column.hidden =true
        }
      }
    });

    this.activeButtons(id);
    this.grid.options = this.options;
    this.grid.refreshDataAndView();
  }

  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.table_datas.length; i++) {
      const data = document.getElementById("foc" + i);
      if (data != null) {
        if (i === id) {
          data.classList.add("is-active");
        } else if (data.classList.contains("is-active")) {
          data.classList.remove("is-active");
        }
      }
    }
  }

}
