import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, Renderer2 } from '@angular/core';
import { HostListener } from '@angular/core';
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

  isMemberQuestionActive = false;
  isCrackQuestionActive = false;
  isSafetyQuestionActive = false;
  public colsShow: any[] = new Array();
  isCtrlShiftPressed = false; // Flag to track Ctrl + Shift key combination

  @HostListener('document:mouseover', ['$event'])
  toggleActive(event: Event) {
    const elements = [
      { iconId: '#member-question', tableId: '#member-table', activeProp: 'isMemberQuestionActive' },
      { iconId: '#crack-question', tableId: '#crack-table', activeProp: 'isCrackQuestionActive' },
      { iconId: '#safety-question', tableId: '#safety-table', activeProp: 'isSafetyQuestionActive' }
    ];

    for (let element of elements) {
      this.handleElementActivation(element, event);
    }
  }

  handleElementActivation(element: any, event: Event) {
    const elQAIcon = window.document.querySelector(element.iconId);
    const elTable = window.document.querySelector(element.tableId);
    const grandEl = elQAIcon?.parentElement?.parentElement;

    this[element.activeProp] = grandEl?.classList.contains('active') || false;
    if (grandEl?.contains(event.target as Node)) {
      grandEl.classList.add('active');
    } else if (elTable.contains(event.target as Node) && this[element.activeProp]) {
    } else {
      grandEl?.classList.remove('active');
    }
  }

  private createGrid() {   
    this.options.beforeCellKeyDown = (evt, ui) => {
      const mov = 1;
      // Enterで下に移動
      if (evt.key === 'Enter') {
        const $cell = this.grid.getCell({
          rowIndx: ui.rowIndx + mov,
          colIndx: ui.colIndx,
        });
        this.grid.setSelection({
          rowIndx: ui.rowIndx + mov,
          colIndx: ui.colIndx,
          focus: true,
        });
        return false;
      }

      if (evt.key === 'Tab') {
        const $cell = this.grid.getCell({
          rowIndx: ui.rowIndx,
          colIndx: ui.colIndx + mov,
        });

        if (evt.shiftKey) {
          // 「Shift」 と「Tab」を同時に押した際に左へセルを進める
          if (!(ui.rowIndx === 0 && ui.colIndx === 0)) {
            const indexCrr = this.colsShow.indexOf(ui.colIndx);
            let colPre = this.colsShow[indexCrr - 1];
            if (indexCrr === 0) {
              colPre = this.colsShow[this.colsShow.length - 1]
              this.grid.setSelection({
                rowIndx: ui.rowIndx - mov,
                colIndx: colPre,
                focus: true,
              });
            }
            else {
              this.grid.setSelection({
                rowIndx: ui.rowIndx,
                colIndx: colPre,
                focus: true,
              });
            }
          }
          // if (ui.colIndx > 0) {
          //   // 左に移動
          //   const countCols = this.grid.getColModel().length - 1;
          //   const colIndx = ui.colIndx > countCols ? countCols : ui.colIndx;
          //   this.grid.setSelection({
          //     rowIndx: ui.rowIndx,
          //     colIndx: colIndx - mov,
          //     focus: true,
          //   });
          // } else {
          //   // 前の行の右端に移動
          //   if (ui.rowIndx - mov >= 0) {
          //     this.grid.setSelection({
          //       rowIndx: ui.rowIndx - mov,
          //       colIndx: this.grid.getColModel().length,
          //       focus: true,
          //     });
          //   }
          // }
        } else {
          const indexCrr = this.colsShow.indexOf(ui.colIndx);
          let colNext = this.colsShow[indexCrr + 1];
          if (indexCrr === this.colsShow.length - 1) {
            this.grid.setSelection({
              rowIndx: ui.rowIndx + mov,
              colIndx: 0,
              focus: true,
            });
          }
          else {
            this.grid.setSelection({
              rowIndx: ui.rowIndx,
              colIndx: colNext,
              focus: true,
            });
          }
          // if ($cell.length > 0) {
          //   // 右に移動
          //   this.grid.setSelection({
          //     rowIndx: ui.rowIndx,
          //     colIndx: ui.colIndx + mov,
          //     focus: true,
          //   });
          // } else {
          //   // 次の行の左端に移動
          //   this.grid.setSelection({
          //     rowIndx: ui.rowIndx + mov,
          //     colIndx: 0,
          //     focus: true,
          //   });
          // }
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
    //when pressed, entering end into cell will advance to the next row, locking events behind to not advance to the next cell
    this.options.editorKeyDown = (evt, ui) => {
      let mov = 1;
      if (evt.keyCode === 13) {
        this.grid.setSelection({
          rowIndx: ui.rowIndx + mov,
          colIndx: ui.colIndx,
          focus: true,
        });
        return false;
      }
      //key tab
      if (evt.keyCode === 9) {
        if (evt.shiftKey) {
          if (!(ui.rowIndx === 0 && ui.colIndx === 0)) {
            const indexCrr = this.colsShow.indexOf(ui.colIndx);
            let colPre = this.colsShow[indexCrr - 1];
            if (indexCrr === 0) {
              colPre = this.colsShow[this.colsShow.length - 1]
              this.grid.setSelection({
                rowIndx: ui.rowIndx - mov,
                colIndx: colPre,
                focus: true,
              });
            }
            else {
              this.grid.setSelection({
                rowIndx: ui.rowIndx,
                colIndx: colPre,
                focus: true,
              });
            }
          }
        }
        else {
          const indexCrr = this.colsShow.indexOf(ui.colIndx);
          let colNext = this.colsShow[indexCrr + 1];
          if (indexCrr === this.colsShow.length - 1) {
            this.grid.setSelection({
              rowIndx: ui.rowIndx + mov,
              colIndx: 0,
              focus: true,
            });
          }
          else {
            this.grid.setSelection({
              rowIndx: ui.rowIndx,
              colIndx: colNext,
              focus: true,
            });
          }
        }
        return false;
      }
      return true;
    }
    this.grid = pq.grid(this.div.nativeElement, this.options);
    this.grid.Columns().alter(() => {
      this.grid.option('rowSpanHead', true)
    })
    this.grid.option('fillHandle', 'all');
    this.grid.option("autofill", true);
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
    this.setColsShow();
    this.div.nativeElement.addEventListener('wheel', this.onMouseWheel.bind(this));
    this.div.nativeElement.addEventListener('keydown', this.onKeyDown.bind(this));
    this.div.nativeElement.addEventListener('keyup', this.onKeyUp.bind(this));
  }
  // ctrl+Shift,and mouse wheel
  onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey) {
      this.isCtrlShiftPressed = true;
      event.preventDefault(); // Prevent the default behavior of the mouse wheel
    }
  }

  onKeyUp(event: KeyboardEvent) {
    if (!event.ctrlKey || !event.shiftKey) {
      this.isCtrlShiftPressed = false;
    }
  }

  onMouseWheel(event: WheelEvent) {
    if (event.ctrlKey ) {
      event.preventDefault(); // Prevent the default behavior of the mouse wheel
      if(event.shiftKey){
        // debugger
        event.preventDefault();
        const scrollAmount = 20; // Adjust the scroll amount as per your requirement
        let elementChildren = this.div.nativeElement;
        let element = document.getElementsByClassName("pq-cont-right")
  
        if (event.deltaY > 0) {
             for (let i = 0; i < element.length; i++) {
            let elemento = element[i];
            elemento.scrollLeft += scrollAmount;
        }
          
            elementChildren.scrollLeft += scrollAmount;

        } else if (event.deltaY < 0) {
         // Scroll up
         for (let i = 0; i < element.length; i++) {
          let elemento = element[i];
          elemento.scrollLeft -= scrollAmount;
        }
        }
      }

    }
  }

  scrollLeft() {
    // Implement logic to scroll left within your table
  }

  scrollRight() {
    // Implement logic to scroll right within your table
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

  refreshCell(obj: pq.gridT.cellObject) {
    if (this.grid === null) {
      return;
    }
    this.grid.refreshCell(obj);
  }

  public setColsShow() {
    let cols = this.grid.getColModel();
    this.colsShow = new Array();
    cols.forEach((val, i) => {
      if (val.hidden !== true) {
        this.colsShow.push(i)
      }
    })
  }
}
