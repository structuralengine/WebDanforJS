import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { InputBarsService } from './bars.service';
import { SheetComponent } from '../sheet/sheet.component';
import { InputDesignPointsService } from '../design-points/design-points.service';
import { SaveDataService } from 'src/app/providers/save-data.service';
import pq from 'pqgrid';
import { TranslateService } from "@ngx-translate/core";
import { UIStateService } from "src/app/providers/ui-state.service";

@Component({
  selector: 'app-bars',
  templateUrl: './bars.component.html',
  styleUrls: ['./bars.component.scss', '../subNavArea.scss']
})

export class BarsComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private beamHeaders: object[] = new Array();

  // private columnHeaders: object[] = new Array();
  // private pileHeaders: object[] = new Array();

  public table_datas: any[];

  // タブのヘッダ名
  public groupe_name: string[];

  constructor(
    private bars: InputBarsService,
    private save: SaveDataService,
    private points: InputDesignPointsService,
    private ui_state: UIStateService,
    private translate: TranslateService
  ) { }

  ngOnInit() {

    this.setTitle(this.save.isManual());

    // UIデータからテーブルに表示する用のデータを作る
    this.table_datas = this.bars.getTableColumns(this.save.isManual());

    // グリッドの設定
    this.option_list = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {

      const op = {
        showTop: false,
        reactive: true,
        sortable: false,
        locale: "jp",
        height: this.tableHeight().toString(),
        numberCell: { show: false }, // 行番号
        colModel: this.beamHeaders,
        dataModel: { data: this.table_datas[i] },
        freezeCols: (this.save.isManual()) ? 3 : 4,
        change: (evt, ui) => {
          for (const property of ui.updateList) {
            for (const key of Object.keys(property.newRow)) {
              const old = property.oldRow[key];
              if (property.newRow[key] == null) {
                continue; // 削除した場合 何もしない
              }
              if (key === 'rebar_dia' || key === 'side_dia' || key === 'stirrup_dia') {
                // 鉄筋径の規格以外は入力させない
                const value0 = this.bars.matchBarSize(property.newRow[key]);
                const j = property.rowIndx;
                if (value0 === null) {
                  this.table_datas[i][j][key] = old;
                }
              }
            }
          }

          // テーブルのデータをUIデータにセット
          this.saveData();
          this.ui_state.save_ui_state(this.bars.getSaveData(), "/bar");

          // オートセーブ機能 > 行
          // ロジックが不完全なのでいったん無効とする
          // UI画面上の行と内部管理上の行の対応を取る必要あり.
          //for (const property of ui.updateList) {
          //  const { rowIndx } = property;
          //  const rowData = this.bars.getSaveData()[rowIndx];
          //  this.ui_state.save_ui_row_state(rowData, "/bar", rowIndx);
          //}
        }
      };
      this.option_list.push(op);
    }

    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = this.points.getGroupNameDispList(this.save.isManual());
  }

  ngAfterViewInit() {
    this.activeButtons(0);

    // 画面初期化時にオートセーブ
    this.saveData();
    this.ui_state.save_ui_state(this.bars.getSaveData(), "/bar");
  }

  private setTitle(isManual: boolean): void {
    if (isManual) {
      // 断面力手入力モードの場合
      this.beamHeaders = [
        { title: '', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' }, nodrag: true, },
      ];
    } else {
      this.beamHeaders = [
        {
          title: this.translate.instant("bars.m_no"),
          align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' }, nodrag: true,
        },
        {
          title: this.translate.instant("bars.position"),
          dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, sortable: false, width: 110, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' }, nodrag: true,
        },
      ];
    }
    // 3次元モードとマニュアルモードの時は ねじりモーメント照査に対応した表示をする
    let sideCoverTitle = this.translate.instant("bars.tp");
    if (this.save.isManual()) {
      sideCoverTitle = this.translate.instant("bars.tp_side");
    } else if (this.save.is3DPickUp()) {
      sideCoverTitle = this.translate.instant("bars.tp_side");;
    }

    // 共通する項目
    this.beamHeaders.push(
      {
        title: this.translate.instant("bars.p_name"),
        dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' }, nodrag: true,
      },
      {
        title: this.translate.instant("bars.bh"),
        align: 'center', dataType: 'float', dataIndx: 'bh', editable: false, frozen: true, sortable: false, width: 85, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' }, nodrag: true,
      },
      {
        title: this.translate.instant("bars.haunch"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("bars.bending"),
            align: 'center', colModel: [
              {
                title: this.translate.instant("bars.shear"),
                align: 'center', dataType: 'float', dataIndx: 'haunch_height', sortable: false, width: 85, nodrag: true,
              },
            ],
            nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("bars.position"),
        align: 'center', dataType: 'string', dataIndx: 'design_point_id', editable: true, sortable: false, width: 40, nodrag: true,
      },
      {
        title: this.translate.instant("bars.rebar_ax"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("bars.dia"),
            dataType: 'integer', dataIndx: 'rebar_dia', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.number"),
            dataType: 'float', dataIndx: 'rebar_n', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.cover"),
            dataType: 'float', dataIndx: 'rebar_cover', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.lines"),
            dataType: 'float', dataIndx: 'rebar_lines', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.space"),
            dataType: 'float', dataIndx: 'rebar_space', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.ss"),
            dataType: 'float', dataIndx: 'rebar_ss', sortable: false, width: 70, nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("bars.rebar_la"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("bars.dia"),
            dataType: 'integer', dataIndx: 'side_dia', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.pieces"),
            dataType: 'float', dataIndx: 'side_n', sortable: false, width: 70, nodrag: true,
          },
          {
            title: sideCoverTitle, dataType: 'float', dataIndx: 'side_cover', sortable: false, width: 85, nodrag: true,
          },
          {
            title: this.translate.instant("bars.ss"),
            dataType: 'float', dataIndx: 'side_ss', sortable: false, width: 70, nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("bars.rebar_sh"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("bars.dia"),
            dataType: 'integer', dataIndx: 'stirrup_dia', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.number"),
            dataType: 'float', dataIndx: 'stirrup_n', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.ss"),
            dataType: 'float', dataIndx: 'stirrup_ss', sortable: false, width: 70, nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("bars.rebar_ob"),
        dataType: 'float', dataIndx: 'cos', sortable: false, width: 85, nodrag: true,
      },
      {
        title: 'tanγ+tanβ', dataType: 'float', dataIndx: 'tan', sortable: false, width: 85, nodrag: true,
      },
      {
        title: this.translate.instant("bars.rebar_fo"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("bars.dia"),
            dataType: 'integer', dataIndx: 'bending_dia', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.number"),
            dataType: 'float', dataIndx: 'bending_n', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.ss"),
            dataType: 'float', dataIndx: 'bending_ss', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("bars.angle"),
            dataType: 'float', dataIndx: 'bending_angle', sortable: false, width: 70, nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("bars.process"),
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
    this.bars.setTableColumns(a);
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
      const data = document.getElementById("bar" + i);
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
