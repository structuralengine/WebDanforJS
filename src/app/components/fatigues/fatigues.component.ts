import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { InputFatiguesService } from './fatigues.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { AppComponent } from 'src/app/app.component';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { TranslateService } from "@ngx-translate/core";
import { InputMembersService } from '../members/members.service';

@Component({
  selector: 'app-fatigues',
  templateUrl: './fatigues.component.html',
  styleUrls: ['./fatigues.component.scss', '../subNavArea.scss']
})
export class FatiguesComponent implements OnInit, OnDestroy, AfterViewInit {

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
  public textStyle = {"color": "gray"};
  public textStyle2 = {"color": "white"};
  public rowStyle = {
    M_A: { ...this.textStyle },
    M_B: { ...this.textStyle },
    M_Class:{...this.textStyle },
    M_NA06: { ...this.textStyle },
    M_NB06: { ...this.textStyle },
    M_NA12: { ...this.textStyle },
    M_NB12: { ...this.textStyle },
    M_SA: { ...this.textStyle },
    M_SB: { ...this.textStyle },
    M_r1_1: { ...this.textStyle },
    M_r1_3: { ...this.textStyle },
    M_weld: { ...this.textStyle },
    V_A: { ...this.textStyle },
    V_B: { ...this.textStyle },
    V_NA06: { ...this.textStyle },
    V_NA12: { ...this.textStyle },
    V_NB06: { ...this.textStyle },
    V_NB12: { ...this.textStyle },
    V_SA: { ...this.textStyle },
    V_SB:{...this.textStyle },
    V_r1_2:{...this.textStyle},
    V_r1_3:{...this.textStyle},
  };
  public rowStyle2 = {
    M_A: { ...this.textStyle2 },
    M_B: { ...this.textStyle2 },
    M_Class:{...this.textStyle2 },
    M_NA06: { ...this.textStyle2 },
    M_NB06: { ...this.textStyle2 },
    M_NA12: { ...this.textStyle2 },
    M_NB12: { ...this.textStyle2 },
    M_SA: { ...this.textStyle2 },
    M_SB: { ...this.textStyle2 },
    M_r1_1: { ...this.textStyle2 },
    M_r1_3: { ...this.textStyle2 },
    M_weld: { ...this.textStyle2 },
    V_A: { ...this.textStyle2 },
    V_B: { ...this.textStyle2 },
    V_NA06: { ...this.textStyle2 },
    V_NA12: { ...this.textStyle2 },
    V_NB06: { ...this.textStyle2 },
    V_NB12: { ...this.textStyle2 },
    V_SA: { ...this.textStyle2 },
    V_SB:{...this.textStyle2 },
    V_r1_2:{...this.textStyle2},
    V_r1_3:{...this.textStyle2},
  };
  constructor(
    private fatigues: InputFatiguesService,
    private save: SaveDataService,
    private translate: TranslateService,
    private members: InputMembersService,
    ) { this.members.checkGroupNo();}

  ngOnInit() {

    const fatigues = this.fatigues.getSaveData();

    this.train_A_count = fatigues.train_A_count;
    this.train_B_count = fatigues.train_B_count;
    this.service_life = fatigues.service_life;

    this.setTitle(this.save.isManual());

    this.table_datas = this.fatigues.getTableColumns();
    // グリッドの設定
    this.options = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      // this.table_datas[i].forEach((data:any,index:any) => {
        // console.log("fatigues",data)
      //   data.pq_cellstyle=this.rowStyle;
      //  })
      const rowData = this.table_datas[i];
      for (let j = 0; j < rowData.length - 1; j++) {
        const rowData = this.table_datas[i];
        for (let j = 0; j < rowData.length; j++) {
            const currentCell = rowData[j];
            if (j < rowData.length - 1) {
                const nextCell = rowData[j + 1];
                if (JSON.stringify(currentCell.M_SA) === JSON.stringify(nextCell.M_SA)) {
                    currentCell.pq_cellstyle = this.rowStyle;
                } else {
                    currentCell.pq_cellstyle = this.rowStyle2;
                }
            } else {
                currentCell.pq_cellstyle = this.rowStyle; // Xử lý trường hợp cuối cùng
            }
        }
      }
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
        change :(event,ui)=>{
              if (ui.updateList[i].oldRow !== ui.updateList[i].newRow) {
                  ui.updateList[i].rowData.pq_cellstyle = this.rowStyle2
                  ui.updateList[i].rowData.userChanged = true;
                  this.grid.refreshDataAndView();
                  this.saveData();
              }
        }
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.groupe_name.push(this.fatigues.getGroupeName(i));
    }

  }

  ngAfterViewInit() {
    this.activeButtons(0);
    this.setActiveTab(this.activeTab);
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
        title: this.translate.instant("fatigues.position_"),
        align: 'center', dataType: 'string', dataIndx: 'design_point_id', editable: false, frozen: true, sortable: false, width: 40, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("fatigues.for_b"),
        align: 'center', colModel: [
          { title: 'SA/SC', dataType: 'float', format: '#.000', dataIndx: 'M_SA', sortable: false, width: 70, nodrag: true, },
          { title: 'SB/SC', dataType: 'float', format: '#.000', dataIndx: 'M_SB', sortable: false, width: 70, nodrag: true, },
          {
            title: 'k=0.06', align: 'center', colModel: [
              { title: 'NA', dataType: 'float', format: '#.00', dataIndx: 'M_NA06', sortable: false, width: 70, nodrag: true, },
              { title: 'NB', dataType: 'float', format: '#.00', dataIndx: 'M_NB06', sortable: false, width: 70, nodrag: true, }
            ],
            nodrag: true,
          },
          {
            title: 'k=0.12', align: 'center', colModel: [
              { title: 'NA', dataType: 'float', format: '#.00', dataIndx: 'M_NA12', sortable: false, width: 70, nodrag: true, },
              { title: 'NB', dataType: 'float', format: '#.00', dataIndx: 'M_NB12', sortable: false, width: 70, nodrag: true, }
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.d_r2"),
            align: 'center', colModel: [
              { title: 'α', dataType: 'float', format: '#.000', dataIndx: 'M_A', sortable: false, width: 70, nodrag: true, },
              { title: 'β', dataType: 'float', format: '#.000', dataIndx: 'M_B', sortable: false, width: 70, nodrag: true, }
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.b_r1"),
            align: 'center', colModel: [
              {
                title: this.translate.instant("fatigues.ax_rein"),
                dataType: 'float', format: '#.00', dataIndx: 'M_r1_1', sortable: false, width: 60, nodrag: true,
              }
            ],
            nodrag: true,
          },

          // Hidden when finish WebDan の SRC構造の対応 #27
          // 戻す場合は303行目以降も対応の事
          // {
          //   title: this.translate.instant("fatigues.s_grade"),
          //   align: 'center', dataType: 'string', dataIndx: 'M_Class', sortable: false, width: 50, nodrag: true,
          // },
          // {
          //   title: this.translate.instant("fatigues.weld"),
          //   align: 'center', dataType: 'bool', dataIndx: 'M_weld', type: 'checkbox', sortable: false, width: 40, nodrag: true,
          // },
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("fatigues.for_s"),
        align: 'center', colModel: [
          { title: 'SA/SC', dataType: 'float', format: '#.000', dataIndx: 'V_SA', sortable: false, width: 70, nodrag: true, },
          { title: 'SB/SC', dataType: 'float', format: '#.000', dataIndx: 'V_SB', sortable: false, width: 70, nodrag: true, },
          {
            title: 'k=0.06', align: 'center', colModel: [
              { title: 'NA', dataType: 'float', format: '#.00', dataIndx: 'V_NA06', sortable: false, width: 70, nodrag: true, },
              { title: 'NB', dataType: 'float', format: '#.00', dataIndx: 'V_NB06', sortable: false, width: 70, nodrag: true, }
            ],
            nodrag: true,
          },
          {
            title: 'k=0.12', align: 'center', colModel: [
              { title: 'NA', dataType: 'float', format: '#.00', dataIndx: 'V_NA12', sortable: false, width: 70, nodrag: true, },
              { title: 'NB', dataType: 'float', format: '#.00', dataIndx: 'V_NB12', sortable: false, width: 70, nodrag: true, }
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.d_r2"),
            align: 'center', colModel: [
              { title: 'α', dataType: 'float', format: '#.000', dataIndx: 'V_A', sortable: false, width: 70, nodrag: true, },
              { title: 'β', dataType: 'float', format: '#.000', dataIndx: 'V_B', sortable: false, width: 70, nodrag: true, }
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.b_r1"),
            align: 'center', colModel: [
              {
                title: this.translate.instant("fatigues.hoop"),
                dataType: 'float', format: '#.00', dataIndx: 'V_r1_2', sortable: false, width: 60, nodrag: true,
              },
              {
                title: this.translate.instant("fatigues.fold"),
                dataType: 'float', format: '#.00', dataIndx: 'V_r1_3', sortable: false, width: 60, nodrag: true,
              }
            ],
            nodrag: true,
          },
        ],
        nodrag: true,
      }
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

  public setActiveTab(tab: string) {
    this.activeTab = tab;

    let FIXED_CELLS_COUNT = this.save.isManual() ? 3 : 4;

    // SRC対応用にfor_bのendから2列引いた
    // SRC再表示後はendに2列分足すこと。
    const cellIndexMap = {
      'for_b': {
        default: { start: 5, end: 13 },
        manual: { start: 4, end: 12 }
      },
      'default': {
        default: { start: 14, end: 25 },
        manual: { start: 13, end: 24 }
      }
    };
    
    const mode = this.save.isManual() ? 'manual' : 'default';
    const tabType = cellIndexMap[tab] || cellIndexMap['default'];
    const { start, end } = tabType[mode];
    
    let startCellIndex = start;
    let endCellIndex = end;

    this.grid.grid.getColModel().forEach((column, index) => {
      const isInTargetRange = index >= startCellIndex && index <= endCellIndex;
      const isFixedCell = index <= FIXED_CELLS_COUNT;

      column.hidden = !(isInTargetRange || isFixedCell);
    });

    this.grid.refreshDataAndView();
  }
}
