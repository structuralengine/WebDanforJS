import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import pq from 'pqgrid';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { SheetComponent } from '../sheet/sheet.component';
import { InputCrackSettingsService } from './crack-settings.service';
import { TranslateService } from "@ngx-translate/core";
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { InputMembersService } from '../members/members.service';
import { Subscription } from 'rxjs';
import { MenuService } from '../menu/menu.service';


@Component({
  selector: 'app-crack-settings',
  templateUrl: './crack-settings.component.html',
  styleUrls: ['./crack-settings.component.scss', '../subNavArea.scss']
})
export class CrackSettingsComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[] = new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];
  public refreshSubscription:Subscription;
  public textStyle = {"color": "gray"};
  public textStyle2 = {"color": "white"};

  public rowStyle = {
    con_s: { ...this.textStyle },
    con_l: { ...this.textStyle },
    con_u: { ...this.textStyle },
    ecsd_l: { ...this.textStyle },
    ecsd_u: { ...this.textStyle },
    kr:{...this.textStyle },
    k4: { ...this.textStyle },
    extend: { ...this.textStyle },
  };
  public rowStyle2 = {
    con_s: { ...this.textStyle2 },
    con_l: { ...this.textStyle2 },
    con_u: { ...this.textStyle2 },
    ecsd_l: { ...this.textStyle2 },
    ecsd_u: { ...this.textStyle2 },
    kr:{...this.textStyle },
    k4: { ...this.textStyle },
    extend: { ...this.textStyle },
  };
  checkedRadioValue: number;
  private checkedRadioSubscription: Subscription;
  constructor(
    private crack: InputCrackSettingsService,
    private save: SaveDataService,
    public helper: DataHelperModule,
    private translate: TranslateService,
    private basic: InputBasicInformationService,
    private members: InputMembersService,
    private menuService: MenuService
  ) { 
    this.members.checkGroupNo();
    this.checkedRadioSubscription = this.menuService.checkedRadio$.subscribe(value => {
      this.checkedRadioValue = value;
      // Thực hiện các hành động cần thiết sau khi nhận giá trị mới
    });
  }

  ngOnInit() {
    this.setTitle(this.save.isManual());
    this.table_datas = this.crack.getTableColumns();
    this.checkedRadioValue =  this.menuService.getCheckedRadio()
    // グリッドの設定
    this.options = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
   
      const rowData = this.table_datas[i];
      // 
      const nonNullValues = {};

      // 
      for (let j = 0; j < rowData.length; j++) {
        const currentCell = rowData[j];
        Object.keys(currentCell).forEach(key => {
          if (currentCell[key] !== null) {
            if (!nonNullValues[key]) {
              nonNullValues[key] = [];
            }
            nonNullValues[key].push(currentCell[key]);
          }
        });
      }

      //
      for (let j = 0; j < rowData.length; j++) {
        const currentCell = rowData[j];
        Object.keys(currentCell).forEach(key => {
          if (currentCell[key] === null && nonNullValues[key] && nonNullValues[key].length > 0) {
            currentCell[key] = nonNullValues[key][0];
          }
        });
      }
      for (let j = 0; j < rowData.length - 1; j++) {
        const rowData = this.table_datas[i];
        for (let j = 0; j < rowData.length; j++) {
            const currentCell = rowData[j];
            if (j < rowData.length - 1) {
                const nextCell = rowData[j + 1];
                if (JSON.stringify(currentCell.con_u) === JSON.stringify(nextCell.con_u)&& 
                JSON.stringify(currentCell.ecsd_u) === JSON.stringify(nextCell.ecsd_u)&& 
                JSON.stringify(currentCell.con_l) === JSON.stringify(nextCell.con_l)&& 
                JSON.stringify(currentCell.ecsd_l) === JSON.stringify(nextCell.ecsd_l)&& 
                JSON.stringify(currentCell.con_s) === JSON.stringify(nextCell.con_s)) {
                    currentCell.pq_cellstyle = this.rowStyle;
                } else {
                    currentCell.pq_cellstyle = this.rowStyle2;
                }
            } else {
                currentCell.pq_cellstyle = this.rowStyle; 
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
        freezeCols: (this.save.isManual()) ? 2 : 3,
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
      this.groupe_name.push(this.crack.getGroupeName(i));
    }
    
  }

  ngAfterViewInit() {
    this.activeButtons(0);
    this.refreshSubscription= this.crack.refreshTitle$.subscribe(()=>{
      this.changeTitle()
    })
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
          title: this.translate.instant("crack-settings.m_no"),
          align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("crack-settings.position"),
          dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, frozen: true, sortable: false, width: 110, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
      ];
    }
    
    // 共通する項目
    this.columnHeaders.push(
      {
        title: this.translate.instant("crack-settings.p_name"),
        dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: ((this.basic.get_specification2() !== 3 && this.basic.get_specification2() !== 4) ? this.translate.instant("crack-settings.env") : this.translate.instant("crack-settings.water")) + 
        ` <div id="crack-question" style="cursor:pointer"><svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-left: 6px;">
        <path d="M2.49023 14.5098C4.1504 16.1699 6.15363 17 8.5 17C10.8464 17 12.8496 16.1699 14.5098 14.5098C16.1699 12.8496 17 10.8464 17 8.5C17 6.15363 16.1699 4.1504 14.5098 2.49023C12.8496 0.83007 10.8464 0 8.5 0C6.15363 0 4.1504 0.83007 2.49023 2.49023C0.83007 4.1504 0 6.15363 0 8.5C0 10.8464 0.83007 12.8496 2.49023 14.5098ZM8.5 2.125C9.67318 2.125 10.6748 2.46256 11.5049 3.1377C12.335 3.81283 12.75 4.78124 12.75 6.04297C12.75 7.63673 11.9753 8.85416 10.4258 9.69531C10.2044 9.80599 10.0052 9.96094 9.82812 10.1602C9.65104 10.3594 9.5625 10.5143 9.5625 10.625C9.5625 10.9128 9.45736 11.1618 9.24707 11.3721C9.03678 11.5824 8.78776 11.6875 8.5 11.6875C8.21224 11.6875 7.96322 11.5824 7.75293 11.3721C7.54264 11.1618 7.4375 10.9128 7.4375 10.625C7.4375 10.0273 7.64778 9.4795 8.06836 8.98145C8.48893 8.4834 8.93164 8.10156 9.39648 7.83594C10.2155 7.39323 10.625 6.79558 10.625 6.04297C10.625 4.84765 9.91667 4.25 8.5 4.25C7.92448 4.25 7.42643 4.43815 7.00586 4.81445C6.58528 5.19076 6.375 5.722 6.375 6.4082C6.375 6.69597 6.26986 6.94499 6.05957 7.15527C5.84928 7.36556 5.60026 7.4707 5.3125 7.4707C5.02474 7.4707 4.77572 7.36556 4.56543 7.15527C4.35514 6.94499 4.25 6.69597 4.25 6.4082C4.25 5.08007 4.68164 4.03418 5.54492 3.27051C6.40821 2.50683 7.39322 2.125 8.5 2.125ZM9.26367 14.6094C9.06445 14.8086 8.8099 14.9082 8.5 14.9082C8.1901 14.9082 7.93001 14.8031 7.71973 14.5928C7.50944 14.3825 7.4043 14.1279 7.4043 13.8291C7.4043 13.5303 7.50944 13.2702 7.71973 13.0488C7.93001 12.8275 8.1901 12.7168 8.5 12.7168C8.8099 12.7168 9.06999 12.8275 9.28027 13.0488C9.49056 13.2702 9.5957 13.5303 9.5957 13.8291C9.5957 14.1279 9.48503 14.388 9.26367 14.6094Z" fill="#00C95F"/>
        </svg></div>`,
        align: 'center', colModel: [
          {
            title: this.translate.instant("crack-settings.top"),
            dataType: 'integer', dataIndx: 'con_u', sortable: false, width: 60, nodrag: true,
          },
          {
            title: this.translate.instant("crack-settings.under"),
            dataType: 'integer', dataIndx: 'con_l', sortable: false, width: 60, nodrag: true,
          },
          {
            title: this.translate.instant("crack-settings.shear"),
            dataType: 'integer', dataIndx: 'con_s', sortable: false, width: 60, nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("crack-settings.crack"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("crack-settings.top"),
            align: 'center', dataType: 'integer', dataIndx: 'ecsd_u', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("crack-settings.under"),
            align: 'center', dataType: 'integer', dataIndx: 'ecsd_l', sortable: false, width: 70, nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("crack-settings.shear_kr"),
        dataType: 'float', format: '#.0', dataIndx: 'kr', sortable: false, width: 70, nodrag: true,
      },
      {
        title: this.translate.instant("crack-settings.k4"), align: 'center', dataType: 'float', format: '#.00', dataIndx: 'k4', sortable: false, width: 70, nodrag: true,
      },
      {
        title: this.translate.instant("crack-settings.exterior"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("crack-settings.top"),
            align: 'center', dataType: 'bool', dataIndx: 'vis_u', type: 'checkbox', sortable: false, width: 50, nodrag: true,
          },
          {
            title: this.translate.instant("crack-settings.under"),
            align: 'center', dataType: 'bool', dataIndx: 'vis_l', type: 'checkbox', sortable: false, width: 50, nodrag: true,
          }
        ],
        nodrag: true,
      },
      
    );

    // 鉄道運輸機構の場合
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();
      //( 鉄道    &&  運輸機構 ) or フィリピン の場合
    if ((speci1 == 0 && speci2 === 1) || speci1 == 1 ) {
      // 縁応力度が制限値以内の場合でもひび割れ幅を計算するフラグ
      this.columnHeaders.push({
        title: this.translate.instant("crack-settings.JRTT05"),
        align: 'center', dataType: 'bool', dataIndx: 'JRTT05', type: 'checkbox', sortable: false, width: 100, nodrag: true,hidden:true,
      });
    }
    if (this.checkedRadioValue === 0 || 
      this.checkedRadioValue === 3 || 
      this.checkedRadioValue === undefined) {
      this.columnHeaders.push({
          title: this.translate.instant("crack-settings.extend"),
          align: 'center',
          dataType: 'float',
          dataIndx: 'extend',
          format: '#.0',
          sortable: false,
          width: 70,
          nodrag: true,
      });
  }
  }

  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }


  ngOnDestroy() {
    this.saveData();
    this.refreshSubscription?.unsubscribe()
    this.checkedRadioSubscription.unsubscribe();
  }

  public saveData(): void {
    const a = [];
    for (const g of this.table_datas) {
      for (const e of g) {
        a.push(e);
      }
    }
    this.crack.setTableColumns(a);
  }

  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 230;
    return containerHeight;
  }


  public activePageChenge(id: number): void {
    this.activeButtons(id);
    this.setTitle(this.save.isManual());
    this.options = this.option_list[id];
    this.options.colModel = this.columnHeaders
    this.grid.options = this.options;
    this.grid.refreshDataAndView();
  }
  public changeTitle(){
    this.setTitle(this.save.isManual());
    this.options.colModel=this.columnHeaders
    this.grid.options = this.options;
    this.grid.refreshCM();
  }
  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.table_datas.length; i++) {
      const data = document.getElementById("crk" + i);
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
