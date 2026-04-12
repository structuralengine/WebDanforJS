import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { InputBasicInformationService, PickupMomentList, PickupShearForceList, PickupTorsionalMomentList } from './basic-information.service';
import { SaveDataService } from '../../providers/save-data.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";

import { distinctUntilChanged, Subscription } from 'rxjs';


@Component({
  selector: 'app-basic-information',
  templateUrl: './basic-information.component.html',
  styleUrls: ['./basic-information.component.scss']
})
export class BasicInformationComponent implements OnInit, OnDestroy {

  @ViewChild('grid1') grid1: SheetComponent;
  private table1_datas: any[] = [];
  public options1: pq.gridT.options;

  @ViewChild('grid2') grid2: SheetComponent;
  private table2_datas: any[] = [];
  public options2: pq.gridT.options;

  @ViewChild('grid3') grid3: SheetComponent;
  private table3_datas: any[] = [];
  public options3: pq.gridT.options;

  public isManual: boolean;
  public imgLink ="";

  private subscriptions: Subscription[] = [];

  constructor(
    public basic: InputBasicInformationService,
    private save: SaveDataService,
    private translate: TranslateService,
  ) { }

  ngOnInit() {
    this.subscriptions = [
      this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
        // 言語切替
        this.applyLang(event.lang);
        this.saveData();
        this.onInitData();
      }),
      this.basic.setSpecification1Subject$.pipe(
        distinctUntilChanged()
      ).subscribe((_) => {
        // 適用が変更されたとき
        this.onInitData();
      }),
      this.basic.setSpecification2Subject$.pipe(
        distinctUntilChanged()
      ).subscribe((_) => {
        // 仕様が変更されたとき
        this.onInitData();
      }),
    ];

    const currentLang = this.translate.currentLang;
    this.applyLang(currentLang);
    this.onInitData();
  }

  private applyLang(lang: string): void {
    switch (lang) {
      case "en":
        this.imgLink = "assets/img/basic-information/en.png";
        break;
      case "ja":
        this.imgLink = "assets/img/basic-information/jp.png";
        break;
      default:
        throw new Error(`Invalid lang: ${lang}`);
    }
  }

  private onInitData() {
    this.isManual = this.save.isManual();

    this.table1_datas = this.basic.pickup_moment;
    this.table2_datas = this.basic.pickup_shear_force;
    this.table3_datas = this.basic.pickup_torsional_moment;

    if (this.isManual) {
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

    const { columnHeaders, columnHeaderDisableds } = this.generateColModels();

    this.options1 = {
      height: 340,
      showTop: false,
      reactive: true,
      sortable: false,
      locale: 'jp',
      numberCell: { show: true }, // 行番号
      colModel: columnHeaders,
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
      colModel: columnHeaders,
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
      colModel: this.basic.category === 'Road' ? columnHeaderDisableds : columnHeaders,
      dataModel: { data: this.table3_datas },
      editable: this.basic.category === 'Rail',
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

  private generateColModels(): { columnHeaders: pq.gridT.colModel, columnHeaderDisableds: pq.gridT.colModel } {
    const columnHeaders: pq.gridT.colModel = [
      {
        title: this.translate.instant("basic-information.sre_cross"),
        dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 270, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      { title: 'Pickup No', align: 'center', dataType: 'integer', dataIndx: 'no', sortable: false, width: 100, nodrag: true},
    ];
    const columnHeaderDisableds: pq.gridT.colModel = [
      {
        title: this.translate.instant("basic-information.sre_cross"),
        dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 270, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' },
        cls:"col-disabled"
      },
      { title: 'Pickup No', align: 'center', dataType: 'integer', dataIndx: 'no', sortable: false, width: 100, nodrag: true, cls:"col-disabled" },
    ];
    return { columnHeaders, columnHeaderDisableds };
  }

  ngOnDestroy() {
    while (this.subscriptions.length > 0) {
      const subsc = this.subscriptions.pop();
      subsc?.unsubscribe();
    }

    this.saveData();
  }

  private saveData(): void {
    this.basic.pickup_moment = this.table1_datas as PickupMomentList;
    this.basic.pickup_shear_force = this.table2_datas as PickupShearForceList;
    this.basic.pickup_torsional_moment = this.table3_datas as PickupTorsionalMomentList;
  }
}
