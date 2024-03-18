import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { InputMembersService } from './members.service';
import { SheetComponent } from '../sheet/sheet.component';
import { AppComponent } from 'src/app/app.component';
import { SaveDataService } from 'src/app/providers/save-data.service';
import pq from 'pqgrid';
import { InputDesignPointsService } from '../design-points/design-points.service';
import { TranslateService } from "@ngx-translate/core";
import { log } from 'console';

@Component({
  selector: 'app-members',
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.scss']
})

export class MembersComponent implements OnInit, AfterViewInit, OnDestroy {

  // データグリッドの設定変数
  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;
  public isManual: boolean;
  private columnHeaders: object[] = new Array();
  // このページで表示するデータ
  private ROWS_COUNT = 0;
  private table_datas: any[] = new Array();
  public style ={"pointer-events":"none", "background": "linear-gradient(to left top, transparent 0%, transparent 50.5%, gray 52.5%, transparent 54.5%, transparent 100%)", "font-size":"0" }
  public prop={edit: false, show:false}


  constructor(
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private save: SaveDataService,
    private app: AppComponent,
    private translate: TranslateService
  ) { }


  ngOnInit() {


    this.isManual = this.save.isManual();
    this.setTitle(this.isManual);

    // グリッドの基本的な オプションを登録する
    this.options = {
      showTop: false,
      reactive: true,
      sortable: false,
      locale: 'jp',
      height: this.tableHeight().toString(),
      width: 'auto',
      numberCell: { show: this.save.isManual() }, // 行番号
      colModel: this.columnHeaders,
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
      change: (evt, ui) => {
        for (const property of ui.updateList) {
          for (const key of Object.keys(property.newRow)) {
            const old = property.oldRow[key];
            let value = property.newRow[key];
            const i = property.rowIndx;

            if (key === 'g_no') {
              // 他の共通断面
              if (value == null || value === null) {
                this.table_datas[i].g_id = '';
                continue;
              }
              // 初期値は対象にしない
              for (let j = 0; j < this.table_datas.length; j++) {
                if (property.rowIndx === j) { continue; }                      // 同じ行は比較しない
                const targetColumn = this.table_datas[j];
                const target = targetColumn.g_no;
                if (target === null) { continue; } // 初期値は対象にしない
                if (target === value) {
                  if (targetColumn.g_name !== '' || targetColumn.g_name !== undefined) {
                    this.table_datas[i].g_name = targetColumn.g_name;
                    break;
                  }
                }
              }
              this.table_datas[i].g_id = value.toString();

            } else if (this.table_datas[i].g_no === null) {
              this.table_datas[i].g_id = 'blank';//'row' + this.table_datas[i].m_no; //仮のグループid
            }

            if (key === 'g_name') {
              // 他の共通断面

              if (value == null || value === null) { continue; }         // 初期値は対象にしない
              value = value.trim();
              if (value === '') { continue; }
              for (let j = 0; j < this.table_datas.length; j++) {
                const targetColumn = this.table_datas[j];
                if (property.rowIndx === j) {
                  targetColumn.g_name = value;
                  continue;
                }                      // 同じ行は比較しない
                if (targetColumn.g_no === null) { continue; } // 初期値は対象にしない
                const row = property.rowIndx;
                const changesColumn = this.table_datas[row];
                if (targetColumn.g_no === changesColumn.g_no) {
                  targetColumn.g_name = value;
                }
              }

            }

            if (key === 'shape') {
              let value = property.newRow[key];
              const row = property.rowIndx;
              if (value === null) { continue; }         // 初期値は対象にしない

              //this.table_datas[row].shape
              //   = this.members.getShapeDispFromShapeID(this.members.getShapeIDFromUserInput(value));

              let rowData = this.table_datas[row];

              //Set old value shape to member
              rowData.shape = this.members.getShapeIDFromUserInput(value)

              //get id new shape
              const keyShapeIdNew = this.members.shapeIdFromKey(value);

              //display new shape
              this.table_datas[row].shape = this.members.getShapeDispFromMember(rowData, keyShapeIdNew);

              //check shade when change
              const shade = this.getShade(keyShapeIdNew);
              if (shade != null) {
                tbData[i].pq_cellstyle = shade.style;
                tbData[i].pq_cellprop = shade.prop;
              }
              else{
                tbData[i].pq_cellstyle = null;
                tbData[i].pq_cellprop = null;
              }
            }
          }
        }

        // 何か変更があったら判定する
        const flg: boolean = this.members.checkMemberEnables(this.table_datas)
        this.app.memberChange(flg);

        // save data when change
        this.saveData();
      }
    };

    // データを読み込む
    if (this.save.isManual() === true) {
      // 断面手入力モードの場合は、無限行
      this.ROWS_COUNT = this.rowsCount();
      this.options['beforeTableView'] = (evt, ui) => {
        const dataV = this.table_datas.length;
        if (ui.initV == null) {
          return;
        }
        if (ui.finalV >= dataV - 1) {
          this.loadData(dataV + this.ROWS_COUNT);
          this.grid.refreshDataAndView();
        }
      }
      this.loadData(this.ROWS_COUNT);

    } else {
      // ピックアップファイルを使う場合
      this.table_datas = this.members.getSaveData();
      for (let row of this.table_datas)
      {
        // if(typeof(row.shape) === 'number')
        //   row.shape = this.members.getShapeDispFromShapeID(Number(row.shape)); 
        // else
        //   row.shape = this.members.getShapeDispFromShapeID(this.members.getShapeIDFromUserInput(row.shape));

        row.shape = this.members.getShapeDispFromMember(row); 
      }
    }

    let tbData = this.table_datas;
    for(let i = 0; i < tbData.length; i++)
    {
      let temp = tbData[i];

      //get id new shape
      const keyShapeIdNew = this.members.shapeIdFromKey(temp.shape);
      const shade =  this.getShade(keyShapeIdNew);
      if(shade != null){
        tbData[i].pq_cellstyle= shade.style;
        tbData[i].pq_cellprop= shade.prop;
      }
    }

    // データを登録する
    this.options['dataModel'] = { data: this.table_datas };
  }


  // get pro and style for cell ignore
  private getShade(keyShapeIdNew : number) {
    const shade = {
      style: {
        Bt: { ...this.style },
        t: { ...this.style }
      },
      prop : {
        Bt : { ...this.prop},
        t : { ...this.prop},
      }
    };

    switch(keyShapeIdNew) {
      case 1:
      case 3:
      case 4:
      case 5:
      case 6:
        if(keyShapeIdNew == 3){
          return  {
            style: {
              Bt: { ...this.style },
              t: { ...this.style },
              H: { ...this.style },
            },
            prop : {
              Bt : { ...this.prop},
              t : { ...this.prop},
              H: { ...this.style },
            }
          };
        }
        return shade
    }
    return null;
  }

  private setTitle(isManual: boolean): void {

    if (isManual) {
      // 断面力手入力モードの場合の項目
      this.columnHeaders = [];
    } else {
      // ピックアップファイルを使う場合の項目
      this.columnHeaders = [
        {
          title: this.translate.instant("members.m_no"),
          align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, sortable: false, width: 70, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("members.m_len"),
          dataType: 'float', format: '#.000', dataIndx: 'm_len', editable: false, sortable: false, width: 90, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
      ];
    }

    this.columnHeaders.push(
      {
        title: this.translate.instant("members.g_no"),
        align: 'center', dataType: 'float', dataIndx: 'g_no', sortable: false, width: 85, nodrag: true,
      },
      {
        title: this.translate.instant("members.g_name"),
        align: 'center', dataType: 'string', dataIndx: 'g_name', sortable: false, width: 110, nodrag: true,
      },
      {
        title: this.translate.instant("members.section_sh"),
        align: 'center', colModel: [
          {
            align: 'center',
            title: `<div id="member-question" style="cursor:pointer"><svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.49023 14.5098C4.1504 16.1699 6.15363 17 8.5 17C10.8464 17 12.8496 16.1699 14.5098 14.5098C16.1699 12.8496 17 10.8464 17 8.5C17 6.15363 16.1699 4.1504 14.5098 2.49023C12.8496 0.83007 10.8464 0 8.5 0C6.15363 0 4.1504 0.83007 2.49023 2.49023C0.83007 4.1504 0 6.15363 0 8.5C0 10.8464 0.83007 12.8496 2.49023 14.5098ZM8.5 2.125C9.67318 2.125 10.6748 2.46256 11.5049 3.1377C12.335 3.81283 12.75 4.78124 12.75 6.04297C12.75 7.63673 11.9753 8.85416 10.4258 9.69531C10.2044 9.80599 10.0052 9.96094 9.82812 10.1602C9.65104 10.3594 9.5625 10.5143 9.5625 10.625C9.5625 10.9128 9.45736 11.1618 9.24707 11.3721C9.03678 11.5824 8.78776 11.6875 8.5 11.6875C8.21224 11.6875 7.96322 11.5824 7.75293 11.3721C7.54264 11.1618 7.4375 10.9128 7.4375 10.625C7.4375 10.0273 7.64778 9.4795 8.06836 8.98145C8.48893 8.4834 8.93164 8.10156 9.39648 7.83594C10.2155 7.39323 10.625 6.79558 10.625 6.04297C10.625 4.84765 9.91667 4.25 8.5 4.25C7.92448 4.25 7.42643 4.43815 7.00586 4.81445C6.58528 5.19076 6.375 5.722 6.375 6.4082C6.375 6.69597 6.26986 6.94499 6.05957 7.15527C5.84928 7.36556 5.60026 7.4707 5.3125 7.4707C5.02474 7.4707 4.77572 7.36556 4.56543 7.15527C4.35514 6.94499 4.25 6.69597 4.25 6.4082C4.25 5.08007 4.68164 4.03418 5.54492 3.27051C6.40821 2.50683 7.39322 2.125 8.5 2.125ZM9.26367 14.6094C9.06445 14.8086 8.8099 14.9082 8.5 14.9082C8.1901 14.9082 7.93001 14.8031 7.71973 14.5928C7.50944 14.3825 7.4043 14.1279 7.4043 13.8291C7.4043 13.5303 7.50944 13.2702 7.71973 13.0488C7.93001 12.8275 8.1901 12.7168 8.5 12.7168C8.8099 12.7168 9.06999 12.8275 9.28027 13.0488C9.49056 13.2702 9.5957 13.5303 9.5957 13.8291C9.5957 14.1279 9.48503 14.388 9.26367 14.6094Z" fill="#00C95F"/>
            </svg></div>`,
            dataType: '', dataIndx: 'shape', sortable: false, width: 80,nodrag: true,
          },
        ],
        dataType: 'string', dataIndx: 'shape', sortable: false, width: 80, nodrag: true,
        // format: this.members.getLangShapeFormatter();
      },
      {
        title: this.translate.instant("members.section"),
        align: 'center', colModel: [
          {
            title: 'B',
            dataType: 'float', dataIndx: 'B', width: 70, nodrag: true,
          },
          {
            title: 'H',
            dataType: 'float', dataIndx: 'H', width: 70, nodrag: true,
          },
          {
            title: 'Bt',
            dataType: 'float', dataIndx: 'Bt', width: 70, nodrag: true,
          },
          {
            title: 't',
            dataType: 'float', dataIndx: 't', width: 70, nodrag: true,
          }
        ], nodrag: true,
      },
      {
        title: this.translate.instant("members.part_n"),
        align: 'center', dataType: 'float', dataIndx: 'n', sortable: false, width: 80, nodrag: true,
      },
    );
  }


  // 指定行row 以降のデータを読み取る
  private loadData(row: number): void {
    for (let i = this.table_datas.length + 1; i <= row; i++) {
      const column = this.members.getTableColumns(i);
      this.table_datas.push(column);
    }
  }

  ngAfterViewInit() {
    this.grid.refreshDataAndView();
  }

  ngOnDestroy() {
    this.saveData();
  }

  public saveData(): void {
    this.members.setTableColumns(this.table_datas, this.save.isManual());

    //set g-type again
    this.members.setGTypeForMembers();

    if (this.save.isManual()) {
      // 断面力手入力モードの時 部材・断面の入力があったら
      // 算出点データも同時に生成されなければならない
      this.points.setManualData();
    }
  }

  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 100;
    return containerHeight;
  }

  // 表高さに合わせた行数を計算する
  private rowsCount(): number {
    const containerHeight = this.tableHeight();
    return Math.round(containerHeight / 30);
  }

}
