import { parse } from 'path';
import { forEach } from 'jszip';
import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { MenuService } from '../menu/menu.service';
import { log } from 'console';
import { hide } from '@popperjs/core';
import { InputSectionForcesStressMethodService } from './section-forces-stress-method.service';
import { InputBasicInformationStressMethodService } from '../basic-information-stress-method/basic-information-stress-method.service';


@Component({
  selector: 'app-section-forces-stress-method',
  templateUrl: './section-forces-stress-method.component.html',
  styleUrls: ['./section-forces-stress-method.component.scss']
})
export class SectionForcesStressMethodComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private forceStressMethod: InputSectionForcesStressMethodService,
    private translate: TranslateService,
    private menu: MenuService,
    private basicStressMethod: InputBasicInformationStressMethodService,
     ) { }

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;
  public currentColGroups: { [key: string]: { start: number; end: number } };
  public currentColGroupKeys: string[];
  public bendingColGroupKeys: string[];

  public bendingColGroupsRoad : any;
  public shearColGroupsRoad : any;
  public torsionalColGroupsRoad: any;

  public bendingColGroupsStressMethod : any;
  public shearColGroupsStressMethod : any;
  public torsionalColGroupsStressMethod: any;

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
 
  public currentSW: any[];
  public groupActive: any[];
  public toggleStatusPick: { [key: string]: boolean } = {};
  public toggleStatusShear: { [key: string]: boolean } = {};

  ngOnInit() {
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.saveData();
      this.setKeyGroupsStressMethod()
      this.initTable ();
    });
    this.setKeyGroupsStressMethod()
    this.initTable ();

  }

  initTable () {
    this.setColGroupsAndKeys(0);
    //Set active start
    this.bendingColGroupKeys = Object.keys(this.bendingColGroupsStressMethod);
    for (const group of this.bendingColGroupKeys) {
      this.toggleStatus[group] = true;
    }

    // データを登録する
    this.ROWS_COUNT = this.rowsCount();
    this.loadData(this.ROWS_COUNT);

    this.columnHeaders1 = this.forceStressMethod.getColumnHeaders1();
    this.columnHeaders2 = this.forceStressMethod.getColumnHeaders2();
    this.columnHeaders3 = this.forceStressMethod.getColumnHeaders3();

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
  }

  private setKeyGroupsStressMethod(){
    const basic = this.basicStressMethod.getSaveData();
    this.bendingColGroupsStressMethod = {};
    this.shearColGroupsStressMethod = {};
    this.torsionalColGroupsStressMethod = {};
    let pickup_moment = basic.pickup_moment;

    //bending
    let bendingStressMethod: any = new Object, iB = 1;
    pickup_moment.forEach((value, index) => {
      let key = "B" + value.id;
      bendingStressMethod[key] = { start: iB, end: iB + 1 };
      iB += 2;
    });
    this.bendingColGroupsStressMethod = bendingStressMethod;
    //Shear
    let shearStressMethod: any = new Object, iS = 1;
    basic.pickup_shear_force.forEach((value, index) => {
      let key = "S" + value.id;
      shearStressMethod[key] = { start: iS, end: iS + 2 };
      iS += 3;
    });
    this.shearColGroupsStressMethod = shearStressMethod;
    //Torsional
    let torsionalStressMethod: any = new Object, iT = 1;
    basic.pickup_torsional_moment.forEach((value, index) => {
      let key = "T" + value.id;
      torsionalStressMethod[key] = { start: iT, end: iT + 3 };
      iT += 4;
    });
    this.torsionalColGroupsStressMethod = torsionalStressMethod;
  }
  private setTitleGroupsStressMethod(id: number) {
    const basic = this.basicStressMethod.getSaveData();
    let currentSW = new Array();
    if (id === 0) {
      let pickup_moment = basic.pickup_moment;
      pickup_moment.forEach((value, index) => {
        let key = "B" + value.id;
        currentSW.push({
          id: key,
          title: value.title,
        })
      });
    } else if (id === 1) {
      basic.pickup_shear_force.forEach((value, index) => {
        let key = "S" + value.id;
        currentSW.push({
          id: key,
          title: value.title,
        })
      });
    } else if (id === 2) {
      basic.pickup_torsional_moment.forEach((value, index) => {
        let key = "T" + value.id;
        currentSW.push({
          id: key,
          title: value.title,
        })
      });
    }
    this.currentSW = currentSW;
  }
  private setColGroupsAndKeys(id: number): void {
    this.groupActive = [];
    this.setTitleGroupsStressMethod(id);
    this.toggleStatus = {};
    //set title again
    this.columnHeaders1 = this.forceStressMethod.getColumnHeaders1();
    this.columnHeaders2 = this.forceStressMethod.getColumnHeaders2();
    this.columnHeaders3 = this.forceStressMethod.getColumnHeaders3();

    if (id === 0) {
      this.currentColGroups = this.bendingColGroupsStressMethod;
      this.toggleStatus = this.toggleStatusPick
    } else if (id === 1) {
      this.currentColGroups = this.shearColGroupsStressMethod;
      this.toggleStatus = this.toggleStatusShear
    } else if (id === 2) {
      this.currentColGroups = this.torsionalColGroupsStressMethod;
    }
    this.currentColGroupKeys = Object.keys(this.currentColGroups);
    for (const group of this.currentColGroupKeys) {
      if (this.toggleStatus[group] === undefined) {
        this.toggleStatus[group] = true;
      }
      if(this.toggleStatus[group])
      {
        const id = parseInt(group.slice(1));
        this.groupActive.push(id);
      }
    }
  }

  public toggleDataLoad(group: string): void {
    this.toggleStatus[group] = !this.toggleStatus[group];
    const { start, end } = this.currentColGroups[group];
    this.grid.grid.getColModel().forEach((column, index) => {
      if (index >= start && index <= end) {
        column.hidden = !this.toggleStatus[group];
      }
    });
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
      const column = this.forceStressMethod.getTable1Columns(i);
      this.table_datas.push(column);
    }
  }


  ngOnDestroy(): void {
    this.saveData();
    // this.saveDataCol();
  }
  public saveData(): void {
    this.forceStressMethod.setTableColumns(this.table_datas);
  }

  public saveDataCol() {
    this.forceStressMethod.setCelCols(this.toggleStatus)
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
    this.groupActive = [];
    this.setColGroupsAndKeys(id);

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
 

