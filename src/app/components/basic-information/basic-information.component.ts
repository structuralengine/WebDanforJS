import { MenuService } from './../menu/menu.service';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { InputBasicInformationService } from './basic-information.service';
import { SaveDataService } from '../../providers/save-data.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";

import { forEach } from 'jszip';

import { MenuBehaviorSubject } from '../menu/menu-behavior-subject.service';


@Component({
  selector: 'app-basic-information',
  templateUrl: './basic-information.component.html',
  styleUrls: ['./basic-information.component.scss']
})
export class BasicInformationComponent implements OnInit, OnDestroy {

  private columnHeaders: object[] = [];
  private columnHeaderDisableds: object[] = [];
  public specification1_select_id: number;
  public specification2_select_id: number;

  @ViewChild('grid1') grid1: SheetComponent;
  private table1_datas: any[] = [];
  public options1: pq.gridT.options;

  @ViewChild('grid2') grid2: SheetComponent;
  private table2_datas: any[] = [];
  public options2: pq.gridT.options;

  @ViewChild('grid3') grid3: SheetComponent;
  private table3_datas: any[] = [];
  public options3: pq.gridT.options;

  // 適用 に関する変数
  public specification1_list: any[];

  // 仕様 に関する変数
  public specification2_list: any[];

  // 設計条件
  public conditions_list: any[];

  public removeData:any
  constructor(
    private basic: InputBasicInformationService,
    private save: SaveDataService,
    private translate: TranslateService,
    private menuBehaviorSubject: MenuBehaviorSubject,
    private menuService: MenuService
  ) { }
  public imgLink ="";
  ngOnInit() {
    let currentLang = this.translate.currentLang;
    switch (currentLang) {
      case "en": {
        this.imgLink = "assets/img/basic-information/en.png";
        break;
      }
      case "ja": {
        this.imgLink = "assets/img/basic-information/jp.png";
        break;
      }
      default: {
      }
    }
    
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      switch (event.lang) {
        case "en": {
          this.imgLink = "assets/img/basic-information/en.png";
          break;
        }
        case "ja": {
          this.imgLink = "assets/img/basic-information/jp.png";
          break;
        }
        default: {
        }
      }
      this.saveData();
      this.onInitData();
    });
    this.onInitData();

    this.menuBehaviorSubject.menuBehaviorSubject$.subscribe((i) =>{
      this.onInitData();
    } );
  }
  onInitData(){
    let basic : any = {};
    basic = this.basic.getSaveData();
    // 適用
    this.specification1_list = basic.specification1_list;
    this.specification1_select_id = this.basic.get_specification1();
    // 仕様
    this.specification2_list = basic.specification2_list;
    this.specification2_select_id = this.basic.get_specification2();
    //  設計条件
    this.conditions_list = basic.conditions_list;

    // pickUp テーブル の初期化
    this.setTitle(this.save.isManual());

    this.table1_datas = basic.pickup_moment;
    this.table2_datas = basic.pickup_shear_force;
    this.table3_datas = basic.pickup_torsional_moment;

    if(this.isManual()){
      this.table1_datas.forEach(el => {
        el.no = null
      });
      this.table2_datas.forEach(el => {
        el.no = null
      });
      this.table3_datas.forEach(el => {
        el.no = null
      });
    }
    if(this.basic.get_specification1()===0 || this.basic.get_specification1()===1){
      let index = this.table1_datas.findIndex((data) => data.id === 2)
      if (index > -1) {
        this.removeData = this.table1_datas[index]
        this.table1_datas.splice(index, 1)
      }
    }

    this.options1 = {
      height: 340,
      showTop: false,
      reactive: true,
      sortable: false,
      locale: 'jp',
      numberCell: { show: true }, // 行番号
      colModel: this.columnHeaders,
      dataModel: { data: this.table1_datas },
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
    };

    this.options2 = {
      height: 340,
      showTop: false,
      reactive: true,
      sortable: false,
      locale: 'jp',
      numberCell: { show: true }, // 行番号
      colModel: this.columnHeaders,
      dataModel: { data: this.table2_datas },
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
    };
    
    this.options3 = {
      height: 340,
      showTop: false,
      reactive: true,
      sortable: false,
      locale: 'jp',
      numberCell: { show: true }, // 行番号
      colModel: this.menuService.selectedRoad ? this.columnHeaderDisableds : this.columnHeaders,
      dataModel: { data: this.table3_datas },
      editable:this.menuService.selectedRoad ? false : true,
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
    };
  }

  private setTitle(isManual: boolean): void {

    // if (isManual) {
    //   // 断面力手入力モードの場合の項目
    //   this.columnHeaders = [];
    //   this.columnHeaderDisableds = [];
    // } else {
      // ピックアップファイルを使う場合の項目
      this.columnHeaders = [
        {
          title: this.translate.instant("basic-information.sre_cross"),
          dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 270, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
        { title: 'Pickup No', align: 'center', dataType: 'integer', dataIndx: 'no', sortable: false, width: 100, nodrag: true},
      ];
      this.columnHeaderDisableds = [
        {
          title: this.translate.instant("basic-information.sre_cross"),
          dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 270, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' },
          cls:"col-disabled"
        },
        { title: 'Pickup No', align: 'center', dataType: 'integer', dataIndx: 'no', sortable: false, width: 100, nodrag: true, cls:"col-disabled" },
      ];
    // }
  }


  public isManual(): boolean {
    return this.save.isManual();
  }

  ngOnDestroy() {
    this.saveData();
  }

  public  saveData(): void {
    let tableTemp = JSON.parse(JSON.stringify(this.table1_datas)); 
    if (this.basic.get_specification1() === 0 || this.basic.get_specification1() === 1) {
      let index = tableTemp.findIndex((data) => data.id === 2)
      if (this.removeData && index===-1){
        tableTemp.splice(2, 0, this.removeData);
    }
  }
    this.basic.setSaveData({
      pickup_moment: tableTemp,
      pickup_shear_force: this.table2_datas,
      pickup_torsional_moment: this.table3_datas,

      specification1_list: this.specification1_list, // 適用
      specification2_list: this.specification2_list, // 仕様
      conditions_list: this.conditions_list         // 設計条件
    });
  }

  /// <summary>
  /// 適用 変更時の処理
  /// </summary>
  /// <param name='i'>選択された番号</param>
  public setSpecification1(i: number): void {

    const basic = this.basic.set_specification1(i);

    this.specification1_list = basic.specification1_list; // 適用
    this.specification2_list = basic.specification2_list; // 仕様
    this.conditions_list = basic.conditions_list;         //  設計条件

    this.table1_datas = basic.pickup_moment;
    this.table2_datas = basic.pickup_shear_force;
    this.table3_datas = basic.pickup_torsional_moment;

    //set data to option.data
    this.options1.dataModel.data = this.table1_datas;
    this.options2.dataModel.data = this.table2_datas;
    this.options3.dataModel.data = this.table3_datas;

    if (!(this.grid1 == null))
      this.grid1.refreshDataAndView();
    if (!(this.grid2 == null))
      this.grid2.refreshDataAndView();
    if (!(this.grid3 == null))
      this.grid3.refreshDataAndView();
    this.specification1_select_id = i;
  }

  /// 仕様 変更時の処理
  public setSpecification2(id: number): void {
    // this.specification2_list.map(
    //   obj => obj.selected = (obj.id === id) ? true : false);
    this.basic.set_specification2(id);
    const basic = this.basic.getSaveData();

    this.table1_datas = basic.pickup_moment;
    this.table2_datas = basic.pickup_shear_force;
    this.table3_datas = basic.pickup_torsional_moment;
    
    //set data to option.data
    this.options1.dataModel.data = this.table1_datas;
    this.options2.dataModel.data = this.table2_datas;
    this.options3.dataModel.data = this.table3_datas;

    if (!(this.grid1 == null))
      this.grid1.refreshDataAndView();
    if (!(this.grid2 == null))
      this.grid2.refreshDataAndView();
    if (!(this.grid3 == null))
      this.grid3.refreshDataAndView();

    this.specification2_select_id = id;
  }
}
