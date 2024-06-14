import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit,ElementRef } from '@angular/core';
import { InputSteelsService } from './steels.service';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-steels',
  templateUrl: './steels.component.html',
  styleUrls: ['./steels.component.scss', '../subNavArea.scss']
})
export class SteelsComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('grid') grid: SheetComponent;
  @ViewChild('subNavArea', { static: false  }) subNavArea: ElementRef;
  hasScrollbar: boolean = false;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[] = new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];

  constructor(
    private steel: InputSteelsService,
    private save: SaveDataService,
    private translate: TranslateService
  ) { }

  ngOnInit() {

    this.setTitle(this.save.isManual());

    this.table_datas = this.steel.getTableColumns();

    // グリッドの設定
    this.options = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      const op = {
        showTop: false,
        reactive: true,
        sortable: false,
        locale: "jp",
        height: this.tableHeight().toString(),
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders,
        dataModel: { data: this.table_datas[i] },
        freezeCols: (this.save.isManual()) ? 4 : 5,
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
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.groupe_name.push(this.steel.getGroupeName(i));
    }


  }

  ngAfterViewInit() {
    this.checkForScrollbar();
    this.activeButtons(0);
  }
  private checkForScrollbar() {
    // this.subNavArea.nativeElement.element.style.overflow ? this.hasScrollbar = false : this.hasScrollbar = true;
    if (this.subNavArea) {
      const element = this.subNavArea.nativeElement;
      this.hasScrollbar = element.scrollWidth > element.clientWidth;
    }
  }
  private setTitle(isManual: boolean): void {
    if (isManual) {
      // 断面力手入力モードの場合
      this.columnHeaders = [
        { title: '', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }},
      ];
    } else {
      this.columnHeaders = [
        {
          title: this.translate.instant("steels.m_no"),
          align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("steels.position"),
          dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, frozen: true, sortable: false, width: 110, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
      ];
    }

    // 共通する項目
    this.columnHeaders.push(
      {
        title: this.translate.instant("steels.p_name"),
        dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("steels.bh"),
        align: 'center', dataType: 'float', dataIndx: 'bh', frozen: true, editable: false, sortable: false, width: 85, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("steels.position"),
        align: 'center', dataType: 'string', dataIndx: 'design_point_id', frozen: true, editable: true, sortable: false, width: 40, nodrag: true,
      },
      {
        title: this.translate.instant("steels.dis_above"),
        dataType: 'float', dataIndx: 'upper_left_cover', sortable: false, width: 70, nodrag: true,
      },
      {
        title: this.translate.instant("steels.top_left"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("steels.F_width"),
            dataType: 'float', dataIndx: 'upper_left_width', sortable: false, width: 80, nodrag: true,
          },
          {
            title: this.translate.instant("steels.F_thickness"),
            dataType: 'float', dataIndx: 'upper_left_thickness', sortable: false, width: 80, nodrag: true,
          },
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("steels.web"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("steels.w_thickness"),
            dataType: 'float', dataIndx: 'web_thickness', sortable: false, width: 80, nodrag: true,
          },
          {
            title: this.translate.instant("steels.w_height"),
            dataType: 'float', dataIndx: 'web_height', sortable: false, width: 80, nodrag: true,
          },
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("steels.low_right"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("steels.F_width"),
            dataType: 'float', dataIndx: 'lower_right_width', sortable: false, width: 80, nodrag: true,
          },
          {
            title: this.translate.instant("steels.F_thickness"),
            dataType: 'float', dataIndx: 'lower_right_thickness', sortable: false, width: 80, nodrag: true,
          },
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("steels.process"),
        align: 'center', dataType: 'bool', dataIndx: 'enable', type: 'checkbox', sortable: false, width: 40, nodrag: true,
      },
    );
  }

  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }

  ngOnDestroy() {
    this.saveData();
  }
  public saveData(): void {
    const a = [];
    for (const g of this.table_datas) {
      for (const e of g) {
        a.push(e);
      }
    }
    this.steel.setTableColumns(a);
  }

  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 230;
    return containerHeight;
  }


  public activePageChenge(id: number): void {
    this.activeButtons(id);

    this.options = this.option_list[id];
    this.grid.options = this.options;
    this.grid.refreshDataAndView();
  }

  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.table_datas.length; i++) {
      const data = document.getElementById("stl" + i);
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
