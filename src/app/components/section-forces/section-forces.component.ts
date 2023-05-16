import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { InputSectionForcesService } from './section-forces.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { UIStateService } from "src/app/providers/ui-state.service";
import { InputDesignPointsService } from '../design-points/design-points.service';

@Component({
  selector: 'app-section-forces',
  templateUrl: './section-forces.component.html',
  styleUrls: ['./section-forces.component.scss']
})
export class SectionForcesComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private force: InputSectionForcesService,
    private points: InputDesignPointsService,
    private ui_state: UIStateService,
  ) { }

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  private ROWS_COUNT = 0;
  private table_datas: any[] = [];

  // 曲げモーメントのグリッド設定変数
  private columnHeaders1: object[];

  // せん断力のグリッド設定変数
  private columnHeaders2: object[];

  // ねじりモーメントのグリッド設定変数
  private columnHeaders3: object[];


  ngOnInit() {
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
      change: (evt, ui) => {

//        console.log("change event", ui);

        // オートセーブ機能
        this.saveData();
        this.ui_state.save_ui_state(this.force.getSaveData(), "/force");

        // 算出点名を変えていたら、もしくは行が増えたり減ったりしていたら
        // pointsもアップデートしなくてはいけない
        var need_to_update_points:boolean = false;
        for(var i=0; !need_to_update_points && ui.updateList.length>i; i++)
        {
          if('p_name' in ui.updateList[i].newRow)
          {
            need_to_update_points=true;
            break;
          }
        }

        //if(need_to_update_points || ui.addList.length != 0 || ui.deleteList.length)
          this.ui_state.save_ui_state(this.points.getSaveData(), "/points");

        // オートセーブ機能 > 行
        // ロジックがまだ不十分と思えたので行ごとのオートセーブはいま無効にしている
        //for (const property of ui.updateList) {
        //  const { rowIndx } = property;
        //  const rowData = this.force.getSaveData()[rowIndx];
        //  this.ui_state.save_ui_row_state(rowData, "/force", rowIndx);
        //}
      }
    };
  }

  ngAfterViewInit() {
    this.activeButtons(0);

    this.grid.refreshCell({
      rowIndx: 0,
      colIndx: 0,
    });

    // 画面初期化時にオートセーブ
    this.saveData();
    this.ui_state.save_ui_state(this.force.getSaveData(), "/force");
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
  }
  public saveData(): void {
    this.force.setTableColumns(this.table_datas);
  }


  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 160;
    return containerHeight;
  }

  // 表高さに合わせた行数を計算する
  private rowsCount(): number {
    const containerHeight = this.tableHeight();
    return Math.round(containerHeight / 30);
  }

  public activePageChenge(id: number): void {

    if (id === 0) {
      this.options.colModel = this.columnHeaders1;
    } else if (id === 1) {
      this.options.colModel = this.columnHeaders2;
    } else if (id === 2) {
      this.options.colModel = this.columnHeaders3;
    } else {
      return;
    }
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
