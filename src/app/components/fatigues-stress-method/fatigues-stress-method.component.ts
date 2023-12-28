import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { TranslateService } from "@ngx-translate/core";
import { InputMembersService } from '../members/members.service';
import { InputFatiguesStressMethodService } from './fatigues-stress-method.service';
import { InputFatiguesService } from '../fatigues/fatigues.service';

@Component({
  selector: 'app-fatigues-stress-method',
  templateUrl: './fatigues-stress-method.component.html',
  styleUrls: ['./fatigues-stress-method.component.scss', '../subNavArea.scss']
})
export class FatiguesStressMethodComponent implements OnInit, OnDestroy, AfterViewInit {
  public train_A_count: number;
  public train_B_count: number;
  public service_life: number;

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;
  public activeTab: string = 'for_b';

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[] = new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];


  constructor(
    private fatiguesStressMethod: InputFatiguesStressMethodService,
    private fatigues: InputFatiguesService,
    private save: SaveDataService,
    private translate: TranslateService,
    private members: InputMembersService,
    ) { this.members.checkGroupNo();}

  ngOnInit() {
    const fatigues = this.fatiguesStressMethod.getSaveData();

    this.train_A_count = fatigues.train_A_count;
    this.train_B_count = fatigues.train_B_count;
    this.service_life = fatigues.service_life;

    this.setTitle(this.save.isManual());

    this.table_datas = this.fatiguesStressMethod.getTableColumns();

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
      this.groupe_name.push(this.fatiguesStressMethod.getGroupeName(i));
    }

  }

  ngAfterViewInit() {
    this.activeButtons(0);
  }

  private setTitle(isManual: boolean): void {
    if (isManual) {
      // 断面力手入力モードの場合
      this.columnHeaders = [
        { title: '', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      ];
    } else {
      this.columnHeaders = [
        {
          title: this.translate.instant("fatigues.m_no"),
          align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("fatigues.position"),
          dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, frozen: true, sortable: false, width: 110, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
      ];
    }

    // 共通する項目
    this.columnHeaders.push(
      {
        title: this.translate.instant("fatigues.p_name"),
        dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("fatigues.bh"),
        align: 'center', dataType: 'float', dataIndx: 'bh', editable: false, frozen: true, sortable: false, width: 85, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("fatigues.position"),
        align: 'center', dataType: 'string', dataIndx: 'design_point_id', editable: false, frozen: true, sortable: false, width: 40, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("fatigues.components"),
        align: 'center', dataType: 'bool', dataIndx: 'M_components', type: 'checkbox', frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }, cls:"col-check"
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
    const table_datas = [];
    for (const g of this.table_datas) {
      for (const e of g) {
        table_datas.push(e);
      }
    }
    this.fatigues.setTableColumns({
      table_datas,
      train_A_count: this.train_A_count,
      train_B_count: this.train_B_count,
      service_life: this.service_life
    });
  }

  // // 表の高さを計算する
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
      const data = document.getElementById("fig" + i);
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
