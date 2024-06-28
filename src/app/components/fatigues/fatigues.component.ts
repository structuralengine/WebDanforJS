import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  ElementRef,
} from "@angular/core";
import { InputFatiguesService } from "./fatigues.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { SheetComponent } from "../sheet/sheet.component";
import pq from "pqgrid";
import { AppComponent } from "src/app/app.component";
import { SaveDataService } from "src/app/providers/save-data.service";
import { TranslateService } from "@ngx-translate/core";
import { InputMembersService } from "../members/members.service";

@Component({
  selector: "app-fatigues",
  templateUrl: "./fatigues.component.html",
  styleUrls: ["./fatigues.component.scss", "../subNavArea.scss"],
})
export class FatiguesComponent implements OnInit, OnDestroy, AfterViewInit {
  public train_A_count: number;
  public train_B_count: number;
  public service_life: number;
  public defaultFatigue : any = {};
  @ViewChild("grid") grid: SheetComponent;
  @ViewChild('subNavArea', { static: false  }) subNavArea: ElementRef;
  hasScrollbar: boolean = false;
  public options: pq.gridT.options;
  public activeTab: string = "for_b";

  // �タグリッ�の設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[] = new Array();
  public idTab: number;
  public lstItemEdited: string[];
  public colAutoInputs = ["M_SA", "M_NA06", "M_NA12", "M_NB06", "M_NB12", "M_SB"
  , "V_A", "V_B", "V_NA06", "V_NA12", "V_NB06"
  , "V_NB12", "V_SA", "V_SB", "V_r1_2", "V_r1_3", "M_A", "M_B", "M_r1_1"
  ];

  public table_datas: any[];
  // タブ�ヘッダ�
  public groupe_name: string[];
  public textStyle = { color: "gray" };
  public textStyle2 = { color: "white" };
  public rowStyle = {
    M_A: { ...this.textStyle },
    M_B: { ...this.textStyle },
    M_Class: { ...this.textStyle },
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
    V_SB: { ...this.textStyle },
    V_r1_2: { ...this.textStyle },
    V_r1_3: { ...this.textStyle },
  };
  public rowStyle2 = {
    M_A: { ...this.textStyle2 },
    M_B: { ...this.textStyle2 },
    M_Class: { ...this.textStyle2 },
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
    V_SB: { ...this.textStyle2 },
    V_r1_2: { ...this.textStyle2 },
    V_r1_3: { ...this.textStyle2 },
  };
  //
  constructor(
    private fatigues: InputFatiguesService,
    private save: SaveDataService,
    private translate: TranslateService,
    private members: InputMembersService
  ) {
    this.members.checkGroupNo();
  }

  ngOnInit() {
    this.lstItemEdited = [];
    this.defaultFatigue = {};
    this.defaultFatigue = this.fatigues.default_fatigue(0);
    
    const fatigues = this.fatigues.getSaveData();

    this.train_A_count = fatigues.train_A_count;
    this.train_B_count = fatigues.train_B_count;
    this.service_life = fatigues.service_life;

    this.setTitle(this.save.isManual());

    this.table_datas = this.fatigues.getTableColumns();
    // グリッ�の設�
    this.options = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      const rowData = this.table_datas[i];
      for (let j = 0; j < rowData.length - 1; j++) {
        const rowData = this.table_datas[i];
        //
        const nonNullValues = {};

        //
        for (let j = 0; j < rowData.length; j++) {
          const currentCell = rowData[j];
          Object.keys(currentCell).forEach((key) => {
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
          Object.keys(currentCell).forEach((key) => {
            if (
              currentCell[key] === null &&
              nonNullValues[key] &&
              nonNullValues[key].length > 0
            ) {
              currentCell[key] = nonNullValues[key][0];
            }
          });
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
        freezeCols: this.save.isManual() ? 4 : 5,
        contextMenu: {
          on: true,
          items: [
            {
              name: this.translate.instant("action_key.copy"),
              shortcut: "Ctrl + C",
              action: function (evt, ui, item) {
                this.copy();
              },
            },
            {
              name: this.translate.instant("action_key.paste"),
              shortcut: "Ctrl + V",
              action: function (evt, ui, item) {
                this.paste();
              },
            },
            {
              name: this.translate.instant("action_key.cut"),
              shortcut: "Ctrl + X",
              action: function (evt, ui, item) {
                this.cut();
              },
            },
            {
              name: this.translate.instant("action_key.undo"),
              shortcut: "Ctrl + Z",
              action: function (evt, ui, item) {
                this.History().undo();
              },
            },
          ],
        },
        change: (event, ui) => {
          if (ui.source === "edit" || ui.source === "paste") {
            var currentObj = ui.updateList[0].newRow;
            var col = Object.keys(ui.updateList[0].newRow)[0];
            if (ui.updateList[0].newRow[col] === null) {
              this.handleDelete(ui);
            } else {
              // Get the starting index from which to update the array
              let startIndex = ui.updateList[0].rowIndx + 2;
              let rowIndex = ui.updateList[0].rowIndx;
              let sKey =
                this.idTab + "-" + this.activeTab + "-" + ui.updateList[0].rowIndx + "-" + col;
              if (this.lstItemEdited.indexOf(sKey) === -1) {
                this.lstItemEdited.push(sKey);
              }
              // Loop through each item in the array starting from startIndex and assign properties from currentObj
              for (
                let i = startIndex;
                i < this.table_datas[this.idTab].length;
                i += 2
              ) {
                const item = this.table_datas[this.idTab][i];
                if (item[col] === null || item[col] === currentObj[col]) {
                  item.pq_cellstyle = { ...item.pq_cellstyle };
                  item.pq_cellstyle[`${col}`] = { color: "gray" };

                  this.removeItem(i, col);
                } else {
                  if (
                    this.lstItemEdited.filter(
                      (x) => x === this.idTab + "-" + this.activeTab + "-" + i + "-" + col
                    ).length > 0
                  ) {
                    break;
                  }
                }
                Object.assign(this.table_datas[this.idTab][i], currentObj);
              }

              if(rowIndex > 1){
                let prevItem = this.table_datas[this.idTab][rowIndex - 2];
                if(prevItem[col] === currentObj[col]){
                  ui.updateList[0].rowData.pq_cellstyle = {
                    ...ui.updateList[0].rowData.pq_cellstyle,
                  };
                  ui.updateList[0].rowData.pq_cellstyle[`${col}`] = {
                    color: "gray",
                  };

                  this.removeItem(rowIndex, col);
                }
                else{
                  ui.updateList[0].rowData.pq_cellstyle = {
                    ...ui.updateList[0].rowData.pq_cellstyle,
                  };
                  ui.updateList[0].rowData.pq_cellstyle[`${col}`] = {
                    color: "white",
                  };
                }
              }
              else 
              {
                if (ui.updateList[0].oldRow !== ui.updateList[0].newRow) {
                  ui.updateList[0].rowData.pq_cellstyle = {
                    ...ui.updateList[0].rowData.pq_cellstyle,
                  };
                  ui.updateList[0].rowData.pq_cellstyle[`${col}`] = {
                    color: "white",
                  };
                }
              }

              // if (ui.updateList[0].oldRow !== ui.updateList[0].newRow) {
              //   ui.updateList[0].rowData.pq_cellstyle = {
              //     ...ui.updateList[0].rowData.pq_cellstyle,
              //   };
              //   ui.updateList[0].rowData.pq_cellstyle[`${col}`] = {
              //     color: "white",
              //   };
              // }
            }
          }
          if (ui.source === "clear" || ui.source === "cut") {
            this.handleDelete(ui);
          }
        },
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];
    this.idTab = 0;

    // タブ�タイトルとな�
    this.groupe_name = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.groupe_name.push(this.fatigues.getGroupeName(i));
    }
  }

  private handleDelete(ui:any){
    ui.updateList.forEach((item: any) => {
      let i = item.rowIndx;
      for (let key in item.newRow) {
        this.removeItem(i, key);
      }
    });
    // let checkRowFirst = ui.updateList.filter(
    //   (x) => x.rowIndx === 0 || x.rowIndx === 1
    // ).length;
    // if (checkRowFirst > 0) {
    //   ui.updateList
    //     .filter((x) => x.rowIndx === 0 || x.rowIndx === 1)
    //     .forEach((item: any) => {
    //       let nIndx = item.rowIndx + 2;
    //       let whiteItem = this.table_datas[this.idTab][nIndx];
    //       for (let key in item.newRow) {
    //         whiteItem.pq_cellstyle = { ...whiteItem.pq_cellstyle };
    //         whiteItem.pq_cellstyle[`${key}`] = { color: "white" };

    //         let sKey = this.idTab + "-" + this.activeTab + "-" + item.rowIndx + "-" + key;
    //         if (this.lstItemEdited.indexOf(sKey) === -1) {
    //           this.lstItemEdited.push(sKey);
    //         }
    //       }
    //     });
    //   let listNotZero = ui.updateList.filter((x) => x.rowIndx !== 0 && x.rowIndx !== 1);
    //   this.handleDeleteSheet(listNotZero);
    // } else {
      this.handleDeleteSheet(ui.updateList);
    // }
  }

  private handleDeleteSheet(dataList: any) {
    dataList.forEach((item: any) => {
      let rowIndx = item.rowIndx;
      var prevItem = {};
      if(rowIndx === 0){
        prevItem = this.defaultFatigue;
        if(this.activeTab === "for_b"){
          for (const k of Object.keys(this.defaultFatigue.M1)) {
            prevItem["M_" + k] = this.defaultFatigue.M1[k];
          }
        }
        if(this.activeTab === "for_s"){
          for (const k of Object.keys(this.defaultFatigue.V1)) {
            prevItem["V_" + k] = this.defaultFatigue.V1[k];
          }
        }
      }
      else if(rowIndx === 1){
        prevItem = this.defaultFatigue;
        if(this.activeTab === "for_b"){
          for (const k of Object.keys(this.defaultFatigue.M2)) {
            prevItem["M_" + k] = this.defaultFatigue.M2[k];
          }
        }
        if(this.activeTab === "for_s"){
          for (const k of Object.keys(this.defaultFatigue.V2)) {
            prevItem["V_" + k] = this.defaultFatigue.V2[k];
          }
        }
      }
      else{
        prevItem = this.table_datas[this.idTab][rowIndx - 2];
      }

      for (let key in item.newRow) {
        for (let i = rowIndx; i < this.table_datas[this.idTab].length; i += 2 ) {
          const item = this.table_datas[this.idTab][i];
          if (i === rowIndx) {
            this.table_datas[this.idTab][i][key] = prevItem[key];
            item.pq_cellstyle = { ...item.pq_cellstyle };
            item.pq_cellstyle[`${key}`] = { color: "gray" };
          } else {
            if (
              this.lstItemEdited.filter(
                (x) => x === this.idTab + "-" + this.activeTab + "-" + i + "-" + key
              ).length > 0
            ) {
              if (this.table_datas[this.idTab][i][key] === prevItem[key]) {
                item.pq_cellstyle = { ...item.pq_cellstyle };
                item.pq_cellstyle[`${key}`] = { color: "gray" };
              }
              break;
            }
            this.table_datas[this.idTab][i][key] = prevItem[key];
            item.pq_cellstyle = { ...item.pq_cellstyle };
            item.pq_cellstyle[`${key}`] = { color: "gray" };
          }
        }
      }
    });
  }

  private removeItem(i: any, key: any) {
    const index = this.lstItemEdited.indexOf(
      this.idTab + "-" + this.activeTab + "-" + i + "-" + key,
      0
    );
    if (index > -1) {
      this.lstItemEdited.splice(index, 1);
    }
  }
  ngAfterViewInit() {
    this.activeButtons(0);
    this.checkForScrollbar();
    this.setActiveTab(this.activeTab);
    
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
      // 断面力手入力モード�場�
      this.columnHeaders = [
        {
          title: "",
          align: "center",
          dataType: "integer",
          dataIndx: "m_no",
          editable: false,
          frozen: true,
          sortable: false,
          width: 60,
          nodrag: true,
          style: { background: "#373e45" },
          styleHead: { background: "#373e45" },
        },
      ];
    } else {
      this.columnHeaders = [
        {
          title: this.translate.instant("fatigues.m_no"),
          align: "center",
          dataType: "integer",
          dataIndx: "m_no",
          editable: false,
          frozen: true,
          sortable: false,
          width: 60,
          nodrag: true,
          style: { background: "#373e45" },
          styleHead: { background: "#373e45" },
        },
        {
          title: this.translate.instant("fatigues.position"),
          dataType: "float",
          format: "#.000",
          dataIndx: "position",
          editable: false,
          frozen: true,
          sortable: false,
          width: 110,
          nodrag: true,
          style: { background: "#373e45" },
          styleHead: { background: "#373e45" },
        },
      ];
    }

    // 共通する雮
    this.columnHeaders.push(
      {
        title: this.translate.instant("fatigues.p_name"),
        dataType: "string",
        dataIndx: "p_name",
        editable: false,
        frozen: true,
        sortable: false,
        width: 250,
        nodrag: true,
        style: { background: "#373e45" },
        styleHead: { background: "#373e45" },
      },
      {
        title: this.translate.instant("fatigues.bh"),
        align: "center",
        dataType: "float",
        dataIndx: "bh",
        editable: false,
        frozen: true,
        sortable: false,
        width: 85,
        nodrag: true,
        style: { background: "#373e45" },
        styleHead: { background: "#373e45" },
      },
      {
        title: this.translate.instant("fatigues.position_"),
        align: "center",
        dataType: "string",
        dataIndx: "design_point_id",
        editable: false,
        frozen: true,
        sortable: false,
        width: 40,
        nodrag: true,
        style: { background: "#373e45" },
        styleHead: { background: "#373e45" },
      },
      {
        title: this.translate.instant("fatigues.for_b"),
        align: "center",
        colModel: [
          {
            title: this.translate.instant("fatigues.SA/SC"),
            dataType: "float",
            format: "#.0",
            dataIndx: "M_SA",
            sortable: false,
            width: 70,
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.SB/SC"),
            dataType: "float",
            format: "#.0",
            dataIndx: "M_SB",
            sortable: false,
            width: 70,
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.k1"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("fatigues.NA"),
                dataType: "float",
                format: "#.00",
                dataIndx: "M_NA06",
                sortable: false,
                width: 70,
                nodrag: true,
              },
              {
                title: this.translate.instant("fatigues.NB"),
                dataType: "float",
                format: "#.00",
                dataIndx: "M_NB06",
                sortable: false,
                width: 70,
                nodrag: true,
              },
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.k2"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("fatigues.NA"),
                dataType: "float",
                format: "#.00",
                dataIndx: "M_NA12",
                sortable: false,
                width: 70,
                nodrag: true,
              },
              {
                title: this.translate.instant("fatigues.NB"),
                dataType: "float",
                format: "#.00",
                dataIndx: "M_NB12",
                sortable: false,
                width: 70,
                nodrag: true,
              },
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.d_r2"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("fatigues.alpha"),
                dataType: "float",
                format: "#.0",
                dataIndx: "M_A",
                sortable: false,
                width: 70,
                nodrag: true,
              },
              {
                title: this.translate.instant("fatigues.beta"),
                dataType: "float",
                format: "#.0",
                dataIndx: "M_B",
                sortable: false,
                width: 70,
                nodrag: true,
              },
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.b_r1"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("fatigues.ax_rein"),
                dataType: "float",
                format: "#.0",
                dataIndx: "M_r1_1",
                sortable: false,
                width: 60,
                nodrag: true,
              },
            ],
            nodrag: true,
          },

          // Hidden when finish WebDan の SRC構�の対�#27
          // 戻す�合�303行目以降も対応��
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
        align: "center",
        colModel: [
          {
            title: this.translate.instant("fatigues.SA/SC"),
            dataType: "float",
            format: "#.0",
            dataIndx: "V_SA",
            sortable: false,
            width: 70,
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.SB/SC"),
            dataType: "float",
            format: "#.0",
            dataIndx: "V_SB",
            sortable: false,
            width: 70,
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.k1"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("fatigues.NA"),
                dataType: "float",
                format: "#.0",
                dataIndx: "V_NA06",
                sortable: false,
                width: 70,
                nodrag: true,
              },
              {
                title: this.translate.instant("fatigues.NB"),
                dataType: "float",
                format: "#.0",
                dataIndx: "V_NB06",
                sortable: false,
                width: 70,
                nodrag: true,
              },
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.k2"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("fatigues.NA"),
                dataType: "float",
                format: "#.0",
                dataIndx: "V_NA12",
                sortable: false,
                width: 70,
                nodrag: true,
              },
              {
                title: this.translate.instant("fatigues.NB"),
                dataType: "float",
                format: "#.0",
                dataIndx: "V_NB12",
                sortable: false,
                width: 70,
                nodrag: true,
              },
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.d_r2"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("fatigues.alpha"),
                dataType: "float",
                format: "#.0",
                dataIndx: "V_A",
                sortable: false,
                width: 70,
                nodrag: true,
              },
              {
                title: this.translate.instant("fatigues.beta"),
                dataType: "float",
                format: "#.0",
                dataIndx: "V_B",
                sortable: false,
                width: 70,
                nodrag: true,
              },
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("fatigues.b_r1"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("fatigues.hoop"),
                dataType: "float",
                format: "#.00",
                dataIndx: "V_r1_2",
                sortable: false,
                width: 60,
                nodrag: true,
              },
              {
                title: this.translate.instant("fatigues.fold"),
                dataType: "float",
                format: "#.0",
                dataIndx: "V_r1_3",
                sortable: false,
                width: 60,
                nodrag: true,
              },
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
      service_life: this.service_life,
    });
  }

  // 表の高さを計算す�
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 230;
    return containerHeight;
  }

  public activePageChenge(id: number): void {
    this.activeButtons(id);
    this.idTab = id;
    this.options = this.option_list[id];
    this.grid.options = this.options;
    this.grid.refreshDataAndView();

    for (let i = 0; i < this.table_datas.length; i++) {
      const rowData = this.table_datas[i];
      this.loadAutoInputData(rowData, i);
    }
  }

  // アクヂ�ブになってあ�ボタンを�て非アクヂ�ブにする
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
  // for (let i = 0; i < this.table_datas.length; i++) {
    const rowData = this.table_datas[this.idTab];
    this.loadAutoInputData(rowData, this.idTab);
  // }
    let FIXED_CELLS_COUNT = this.save.isManual() ? 3 : 4;

    // SRC対応用にfor_bのendから2列引い�
    // SRC再表示後�endに2列�足すこと�
    const cellIndexMap = {
      for_b: {
        default: { start: 5, end: 13 },
        manual: { start: 4, end: 12 },
      },
      default: {
        default: { start: 14, end: 25 },
        manual: { start: 13, end: 24 },
      },
    };
   
    const mode = this.save.isManual() ? "manual" : "default";
    const tabType = cellIndexMap[tab] || cellIndexMap["default"];
    const { start, end } = tabType[mode];

    let startCellIndex = start;
    let endCellIndex = end;

    this.grid.grid.getColModel().forEach((column, index) => {
      const isInTargetRange = index >= startCellIndex && index <= endCellIndex;
      const isFixedCell = index <= FIXED_CELLS_COUNT;

      column.hidden = !(isInTargetRange || isFixedCell);
    });

    this.grid.refreshDataAndView();
    this.grid.refreshCM();
  
  }

  private loadAutoInputData(rowData : any, indexTab1 : any){
    let defaultFatigue = this.fatigues.default_fatigue(this.idTab);
    for (let j = 0; j < rowData.length; j += 2) {
      let currentCell = rowData[j];
      if (j === 0) {
        let prevItem = this.defaultFatigue;
        if (this.activeTab === "for_b") {
          for (const k of Object.keys(this.defaultFatigue.M1)) {
            prevItem["M_" + k] = this.defaultFatigue.M1[k];
          }
        }
        if (this.activeTab === "for_s") {
          for (const k of Object.keys(this.defaultFatigue.V1)) {
            prevItem["V_" + k] = this.defaultFatigue.V1[k];
          }
        }

        currentCell.pq_cellstyle = this.rowStyle;
        const keys = Object.keys(currentCell).filter(
          (x) => this.colAutoInputs.filter((y) => y === x).length > 0
        );
        keys.forEach((key) => {
          if (
            JSON.stringify(currentCell[key]) !== JSON.stringify(prevItem[key])
          ) {
            currentCell.pq_cellstyle = { ...currentCell.pq_cellstyle };
            currentCell.pq_cellstyle[`${key}`] = { color: "white" };
            let sKey = indexTab1 + "-" + this.activeTab + "-" + j + "-" + key;
            if (this.lstItemEdited.indexOf(sKey) === -1) {
              this.lstItemEdited.push(sKey);
            }
          }
        });
      } else {
        currentCell.pq_cellstyle = this.rowStyle;
        var prevRow = { ...rowData[j - 2] };
        const keys = Object.keys(currentCell).filter(
          (x) => this.colAutoInputs.filter((y) => y === x).length > 0
        );
        keys.forEach((key) => {
          if (
            JSON.stringify(currentCell[key]) !==
            JSON.stringify(prevRow[key])
          ) {
            currentCell.pq_cellstyle = { ...currentCell.pq_cellstyle };
            currentCell.pq_cellstyle[`${key}`] = { color: "white" };
            let sKey = indexTab1 + "-" + this.activeTab + "-" + j + "-" + key;
            if (this.lstItemEdited.indexOf(sKey) === -1) {
              this.lstItemEdited.push(sKey);
            }
          }
        });
      }
    }
    for (let j = 1; j < rowData.length; j += 2) {
      let currentCell = rowData[j];
      if (j === 1) {
        let prevItem = this.defaultFatigue;
        if (this.activeTab === "for_b") {
          for (const k of Object.keys(this.defaultFatigue.M2)) {
            prevItem["M_" + k] = this.defaultFatigue.M2[k];
          }
        }
        if (this.activeTab === "for_s") {
          for (const k of Object.keys(this.defaultFatigue.V2)) {
            prevItem["V_" + k] = this.defaultFatigue.V2[k];
          }
        }
        currentCell.pq_cellstyle = this.rowStyle;
        const keys = Object.keys(currentCell).filter(
          (x) => this.colAutoInputs.filter((y) => y === x).length > 0
        );
        keys.forEach((key) => {
          if (
            JSON.stringify(currentCell[key]) !== JSON.stringify(prevItem[key])
          ) {
            currentCell.pq_cellstyle = { ...currentCell.pq_cellstyle };
            currentCell.pq_cellstyle[`${key}`] = { color: "white" };
            let sKey = indexTab1 + "-" + this.activeTab + "-" + j + "-" + key;
            if (this.lstItemEdited.indexOf(sKey) === -1) {
              this.lstItemEdited.push(sKey);
            }
          }
        });
      } else {
        currentCell.pq_cellstyle = this.rowStyle;
        var prevRow = {...rowData[j - 2]};
        const keys = Object.keys(currentCell).filter(x => this.colAutoInputs.filter(y => y === x).length > 0);
        keys.forEach((key) => {
          if (
            JSON.stringify(currentCell[key]) !== JSON.stringify(prevRow[key])
          ) {
            currentCell.pq_cellstyle = { ...currentCell.pq_cellstyle };
            currentCell.pq_cellstyle[`${key}`] = { color: "white" };
            let sKey = indexTab1 + "-" + this.activeTab + "-" + j + "-" + key;
            if (this.lstItemEdited.indexOf(sKey) === -1) {
              this.lstItemEdited.push(sKey);
            }
          }
        });
      }
    }
  }
  private lstTwo : any = ["M_NA06", "M_NB06", "M_NA12", "M_NB12", "V_r1_2", "V_r1_3"]
  private round(value: any, key:any) {
    let precision = 1
    if(this.lstTwo.indexOf(key) > -1)
      precision = 2;
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }
}
