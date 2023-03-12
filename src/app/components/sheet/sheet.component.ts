import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, Renderer2 } from '@angular/core';
import pq from 'pqgrid';

//import few localization files for this demo.
import 'pqgrid/localize/pq-localize-en.js';
import 'pqgrid/localize/pq-localize-ja.js';

@Component({
  selector: 'app-sheet',
  templateUrl: './sheet.component.html',
  styleUrls: ['./sheet.component.scss']
})
export class SheetComponent implements AfterViewInit, OnChanges {

  @ViewChild('pqgrid') div: ElementRef;
  @Input() options: any;
  grid: pq.gridT.instance = null;

  private createGrid() {

    if(undefined !== this.options && null != this.options)
    {
      this.options.beforeCellKeyDown = (evt, ui) => {
        const mov = 1;

        if (evt.key === 'Enter') {
          const $cell = this.grid.getCell({
            rowIndx: ui.rowIndx,
            colIndx: ui.colIndx + mov,
          });

          if (evt.shiftKey) {
            // 「Shift」 と「Enter」を同時に押した際に左へセルを進める
            if (ui.colIndx > 0) {
              // 左に移動
              const countCols = this.grid.getColModel().length - 1;

              const colIndx = ui.colIndx > countCols ? countCols : ui.colIndx;

              this.grid.setSelection({
                rowIndx: ui.rowIndx,
                colIndx: colIndx - mov,
                focus: true,
              });
            } else {
              // 前の行の右端に移動
              if (ui.rowIndx - mov >= 0) {
                this.grid.setSelection({
                  rowIndx: ui.rowIndx - mov,
                  colIndx: this.grid.getColModel().length,
                  focus: true,
                });
              }
            }
          } else {
            if ($cell.length > 0) {
              // 右に移動
              this.grid.setSelection({
                rowIndx: ui.rowIndx,
                colIndx: ui.colIndx + mov,
                focus: true,
              });
            } else {
              // 次の行の左端に移動
              this.grid.setSelection({
                rowIndx: ui.rowIndx + mov,
                colIndx: 0,
                focus: true,
              });
            }
          }

          return false;
        }

        if (evt.key === 'F2') {
          const isEditableCell = this.grid.isEditableCell({ rowIndx: ui.rowIndx, dataIndx: ui.dataIndx });
          if (isEditableCell !== false) {
            // 「F2」ボタンを押すとセルにフォーカスし、編集状態にする
            this.grid.setSelection({
              rowIndx: ui.rowIndx,
              colIndx: ui.colIndx,
              focus: true,
            });

            this.grid.editCell({
              rowIndx: ui.rowIndx,
              colIndx: ui.colIndx,
            });
          }
        }

        return true;
      };
    }

    this.grid = pq.grid(this.div.nativeElement, this.options);
  }

  ngOnChanges(obj: SimpleChanges) {
    if (!obj.options.firstChange) {
      //grid is destroyed and recreated only when whole options object is changed to new reference.
      this.grid.destroy();
      this.createGrid();
    }
  }

  ngAfterViewInit() {
    this.createGrid();
  }

  refreshDataAndView() {
    if (this.grid === null) {
      return;
    }
    this.grid.refreshDataAndView();
  }

  refresh() {
    if (this.grid === null) {
      return;
    }
    this.grid.refresh();
  }

}
