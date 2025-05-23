import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  HostListener,
  ElementRef,
} from "@angular/core";
import { InputBarsService } from "./bars.service";
import { SheetComponent } from "../sheet/sheet.component";
import { SaveDataService } from "src/app/providers/save-data.service";
import pq from "pqgrid";
import { TranslateService } from "@ngx-translate/core";
import { InputMembersService } from "../members/members.service";
import { MenuService } from "../menu/menu.service";
import { data } from "jquery";
import { log } from "console";
import { InputBasicInformationService } from "../basic-information/basic-information.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-bars",
  templateUrl: "./bars.component.html",
  styleUrls: ["./bars.component.scss", "../subNavArea.scss"],
})
export class BarsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("grid") grid: SheetComponent;
  @ViewChild("subNavArea", { static: false }) subNavArea: ElementRef;
  public options: pq.gridT.options;
  public activeTab: string = "rebar_ax";
  hasScrollbar: boolean = false;
  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private beamHeaders: object[] = new Array();
  // private columnHeaders: object[] = new Array();
  // private pileHeaders: object[] = new Array();
  public lstItemEdited: string[];

  public colAutoInputs = [
    "rebar_dia",
    "rebar_cover",
    "rebar_lines",
    "rebar_n",
    "rebar_space",
    "rebar_ss",
    "side_dia",
    "stirrup_dia",
    // "bending_dia",
    "side_cover",
    "side_n",
    "side_ss",
    "stirrup_dia",
    "stirrup_ss",
    "stirrup_n",
    // "bending_dia",
    // "bending_n",
    // "bending_ss",
    // "bending_angle",
  ];
  public table_datas: any[];
  public idTab: number;
  // タブのヘッダ名
  public groupe_name: string[];
  public style = {
    "pointer-events": "none",
    background:
      "linear-gradient(to left top, transparent 0%, transparent 50.5%, gray 52.5%, transparent 54.5%, transparent 100%)",
    "font-size": "0",
  };
  public textStyle = { color: "gray" };
  public textStyle2 = { color: "white" };
  public rowStyle = {
    rebar_dia: { ...this.textStyle },
    rebar_cover: { ...this.textStyle },
    rebar_lines: { ...this.textStyle },
    rebar_n: { ...this.textStyle },
    rebar_space: { ...this.textStyle },
    rebar_ss: { ...this.textStyle },
    side_cover: { ...this.textStyle },
    side_dia: { ...this.textStyle },
    side_n: { ...this.textStyle },
    side_ss: { ...this.textStyle },
    stirrup_dia: { ...this.textStyle },
    stirrup_n: { ...this.textStyle },
    stirrup_ss: { ...this.textStyle },
  };
  public rowStyle2 = {
    rebar_dia: { ...this.textStyle2 },
    rebar_cover: { ...this.textStyle2 },
    rebar_lines: { ...this.textStyle2 },
    rebar_n: { ...this.textStyle2 },
    rebar_space: { ...this.textStyle2 },
    rebar_ss: { ...this.textStyle2 },
    side_cover: { ...this.textStyle2 },
    side_dia: { ...this.textStyle2 },
    side_n: { ...this.textStyle2 },
    side_ss: { ...this.textStyle2 },
    stirrup_dia: { ...this.textStyle2 },
    stirrup_n: { ...this.textStyle2 },
    stirrup_ss: { ...this.textStyle2 },
  };

  public styleShaded1: any = {
    haunch_height: { ...this.style },
    side_dia: { ...this.style },
    side_n: { ...this.style },
    side_ss: { ...this.style },
  };
  public styleShaded2 = {
    stirrup_dia: { ...this.style },
    stirrup_n: { ...this.style },
    stirrup_ss: { ...this.style },
    bending_dia: { ...this.style },
    bending_n: { ...this.style },
    bending_ss: { ...this.style },
    bending_angle: { ...this.style },
  };
  public prop = { edit: false, show: false };
  public propShaded1: any = {
    haunch_height: { ...this.prop },
    tan: { ...this.prop },
  };
  public propShaded2 = {
    stirrup_dia: { ...this.prop },
    stirrup_n: { ...this.prop },
    stirrup_ss: { ...this.prop },
    bending_dia: { ...this.prop },
    bending_n: { ...this.prop },
    bending_ss: { ...this.prop },
    bending_angle: { ...this.prop },
  };
  public show: boolean = false;
  public elements: any;
  public element: any;

  public refreshSubscription: Subscription;

  constructor(
    private members: InputMembersService,
    private bars: InputBarsService,
    private save: SaveDataService,
    private translate: TranslateService,
    private menuService: MenuService,
    private basic: InputBasicInformationService
  ) {
    this.members.checkGroupNo();
  }
  @HostListener("document:click", ["$event"])
  public mouseClick(event: any) {
    this.elements = [
      { iconId: "#member-dev-question-ax" },
      { iconId: "#member-dev-question-la" },
    ];
    for (let element of this.elements) {
      this.handleClick(element, event);
    }
  }
  handleClick(element: any, event: any) {
    const member_dev = window.document.querySelector(element.iconId);
    const grandEl = member_dev?.parentElement?.parentElement;

    if (
      grandEl?.contains(event.target as Node) &&
      (this.elements.findIndex(
        (data: any) => data.iconId === `#${event?.target?.id}`
      ) !== -1 ||
        event?.target?.id === "cls-2")
    ) {
      this.element = element;
      this.show = true;
      member_dev.classList.add("activeQ");
    } else {
      if (
        this.show &&
        (this.elements.findIndex(
          (data: any) => data.iconId === `#${event?.target?.id}`
        ) !== -1 ||
          event?.target?.id === "cls-2")
      ) {
        member_dev?.classList?.remove("activeQ");
      }
    }
  }
  ngOnInit() {
    this.lstItemEdited = [];
    this.setTitle(this.save.isManual());
    this.table_datas = this.bars.getTableColumns();
    // グリッドの設定
    this.option_list = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      // this.table_datas[i].forEach((data:any,index:any)=>{
      //  if(this.activeTab==="rebar_ax"){
      //   if(index % 2!==0){
      //     data.pq_cellstyle={...data.pq_cellstyle,...this.styleShaded1};
      //     data.pq_cellprop={...data.pq_cellprop,...this.propShaded1}
      //   }
      //  }
      // });
      const op = {
        showTop: false,
        reactive: true,
        sortable: false,
        locale: "jp",
        height: this.tableHeight().toString(),
        numberCell: { show: false }, // 行番号
        colModel: this.beamHeaders,
        dataModel: { data: this.table_datas[i] },
        freezeCols: this.save.isManual() ? 3 : 4,
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
        change: (evt, ui) => {
          let checkDiameter: any = false;
          for (const property of ui.updateList) {
            for (const key of Object.keys(property.newRow)) {
              const old = property.oldRow[key];
              if (property.newRow[key] == null) {
                continue; // 削除した場合 何もしない
              }
              if (
                key === "rebar_dia" ||
                key === "side_dia" ||
                key === "stirrup_dia" ||
                key === "bending_dia"
              ) {
                // 鉄筋径の規格以外は入力させない
                const value0 = this.bars.matchBarSize(property.newRow[key]);
                const j = property.rowIndx;
                checkDiameter = false;
                if (value0 === null) {
                  checkDiameter = true;
                  this.table_datas[i][j][key] = old;
                }
              }
            }
          }

          if (
            (ui.source === "edit" || ui.source === "paste") &&
            checkDiameter === false
          ) {
            var currentObj = ui.updateList[0].newRow;
            var col = Object.keys(ui.updateList[0].newRow)[0];
            let rowIndex = ui.updateList[0].rowIndx;
            if (ui.updateList[0].newRow[col] === null) {
              this.handleDelete(ui);
            } else {
              // Get the starting index from which to update the array
              let startIndex = ui.updateList[0].rowIndx + 2;
              let sKey =
                this.idTab + "-" + ui.updateList[0].rowIndx + "-" + col;
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
                if (
                  currentObj["haunch_height"] ||
                  currentObj["cos"] ||
                  currentObj["tan"] ||
                  currentObj["bending_dia"] ||
                  currentObj["bending_angle"] ||
                  currentObj["bending_ss"] ||
                  currentObj["bending_n"] ||
                  currentObj["design_point_id"]
                ) {
                  break;
                }

                if (item[col] === null || item[col] === currentObj[col]) {
                  item.pq_cellstyle = { ...item.pq_cellstyle };
                  item.pq_cellstyle[`${col}`] = { color: "gray" };

                  this.removeItem(i, col);
                } else {
                  if (
                    this.lstItemEdited.filter(
                      (x) => x === this.idTab + "-" + i + "-" + col
                    ).length > 0
                  ) {
                    break;
                  }
                }
                Object.assign(this.table_datas[this.idTab][i], currentObj);
              }
              if (rowIndex > 1) {
                let prevItem = this.table_datas[this.idTab][rowIndex - 2];
                if (prevItem[col] === currentObj[col]) {
                  ui.updateList[0].rowData.pq_cellstyle = {
                    ...ui.updateList[0].rowData.pq_cellstyle,
                  };
                  ui.updateList[0].rowData.pq_cellstyle[`${col}`] = {
                    color: "gray",
                  };

                  this.removeItem(rowIndex, col);
                } else {
                  ui.updateList[0].rowData.pq_cellstyle = {
                    ...ui.updateList[0].rowData.pq_cellstyle,
                  };
                  ui.updateList[0].rowData.pq_cellstyle[`${col}`] = {
                    color: "white",
                  };
                }
              } else {
                if (ui.updateList[0].oldRow !== ui.updateList[0].newRow) {
                  ui.updateList[0].rowData.pq_cellstyle = {
                    ...ui.updateList[0].rowData.pq_cellstyle,
                  };
                  ui.updateList[0].rowData.pq_cellstyle[`${col}`] = {
                    color: "white",
                  };
                }
              }
              if (
                currentObj["haunch_height"] ||
                currentObj["cos"] ||
                currentObj["tan"] ||
                currentObj["bending_dia"] ||
                currentObj["bending_angle"] ||
                currentObj["bending_ss"] ||
                currentObj["bending_n"] ||
                currentObj["design_point_id"]
              ) {
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
    // タブのタイトルとなる
    this.groupe_name = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.groupe_name.push(this.bars.getGroupeName(i));
    }
  }

  private handleDelete(ui: any) {
    ui.updateList.forEach((item: any) => {
      let i = item.rowIndx;
      for (let key in item.newRow) {
        if (
          key === "bending_dia" ||
          key === "bending_angle" ||
          key === "bending_ss" ||
          key === "bending_n" ||
          key === "haunch_height" ||
          key === "cos" ||
          key === "tan" ||
          key === "design_point_id"
        ) {
          break;
        } else {
          this.removeItem(i, key);
        }
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

    //         let sKey = this.idTab + "-" + item.rowIndx + "-" + key;
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
      var prevItem: any = {};
      if (rowIndx === 0 || rowIndx === 1) {
        prevItem = this.bars.default_bars(0);
      } else {
        prevItem = this.table_datas[this.idTab][rowIndx - 2];
      }

      for (let key in item.newRow) {
        if (
          key === "bending_dia" ||
          key === "bending_angle" ||
          key === "bending_ss" ||
          key === "bending_n" ||
          key === "haunch_height" ||
          key === "cos" ||
          key === "tan" ||
          key === "design_point_id"
        ) {
          break;
        }
        for (let i = rowIndx; i < this.table_datas[this.idTab].length; i += 2) {
          const item = this.table_datas[this.idTab][i];
          if (i === rowIndx) {
            this.table_datas[this.idTab][i][key] = prevItem[key];
            item.pq_cellstyle = { ...item.pq_cellstyle };
            item.pq_cellstyle[`${key}`] = { color: "gray" };
          } else {
            if (
              this.lstItemEdited.filter(
                (x) => x === this.idTab + "-" + i + "-" + key
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
      this.idTab + "-" + i + "-" + key,
      0
    );
    if (index > -1) {
      this.lstItemEdited.splice(index, 1);
    }
  }

  ngAfterViewInit() {
    this.checkForScrollbar();
    this.activeButtons(0);
    this.setActiveTab(this.activeTab);
    this.refreshSubscription = this.bars.refreshShowHidden$.subscribe(() => {
      this.handleShowHiddenCol();
    });
  }
  private checkForScrollbar() {
    // this.subNavArea.nativeElement.element.style.overflow ? this.hasScrollbar = false : this.hasScrollbar = true;
    if (this.subNavArea) {
      const element = this.subNavArea.nativeElement;
      this.hasScrollbar = element.scrollWidth > element.clientWidth;
    }
  }
  private setTitle(isManual: boolean): void {
    this.beamHeaders = [];
    if (isManual) {
      // 断面力手入力モードの場合
      this.beamHeaders = [
        {
          title: "",
          align: "center",
          dataType: "integer",
          dataIndx: "m_no",
          editable: false,
          frozen: true,
          sortable: false,
          width: 70,
          nodrag: true,
          style: { background: "#373e45" },
          styleHead: { background: "#373e45" },
        },
      ];
    } else {
      this.beamHeaders = [
        {
          title: this.translate.instant("bars.m_no"),
          align: "center",
          dataType: "integer",
          dataIndx: "m_no",
          editable: false,
          frozen: true,
          sortable: false,
          width: 70,
          nodrag: true,
          style: { background: "#373e45" },
          styleHead: { background: "#373e45" },
        },
        {
          title: this.translate.instant("bars.position"),
          dataType: "float",
          format: "0.000",
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
    // 3次元モードとマニュアルモードの時は ねじりモーメント照査に対応した表示をする
    let sideCoverTitle = this.translate.instant("bars.tp");
    if (this.save.isManual()) {
      sideCoverTitle = this.translate.instant("bars.tp_side");
    } else if (this.save.is3DPickUp()) {
      sideCoverTitle = this.translate.instant("bars.tp_side");
    }

    // 共通する項目
    if (this.menuService.selectedRoad) {
      this.beamHeaders.push(
        {
          title: this.translate.instant("bars.p_name"),
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
          title: this.translate.instant("bars.bh"),
          align: "center",
          dataType: "float",
          dataIndx: "bh",
          editable: false,
          frozen: true,
          sortable: false,
          nodrag: true,
          style: { background: "#373e45" },
          styleHead: { background: "#373e45" },
        },
        {
          title: this.translate.instant("bars.haunch"),
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.bending"),
              align: "center",
              colModel: [
                {
                  title: this.translate.instant("bars.shear"),
                  align: "center",
                  dataType: "float",
                  dataIndx: "haunch_height",
                  frozen: true,
                  sortable: false,
                  width: 85,
                  nodrag: true,
                },
              ],
              nodrag: true,
            },
          ],
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.position_"),
          align: "center",
          dataType: "string",
          dataIndx: "design_point_id",
          frozen: true,
          editable: true,
          sortable: false,
          width: 40,
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.rebar_ax"),
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.dia"),
              dataType: "integer",
              dataIndx: "rebar_dia",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.number"),
              dataType: "float",
              dataIndx: "rebar_n",
              sortable: false,
              width: 60,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.cover"),
              dataType: "float",
              dataIndx: "rebar_cover",
              sortable: false,
              width: 65,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.lines"),
              dataType: "float",
              dataIndx: "rebar_lines",
              sortable: false,
              width: 55,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.space"),
              dataType: "float",
              dataIndx: "rebar_space",
              sortable: false,
              width: 55,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.ss"),
              dataType: "float",
              dataIndx: "rebar_ss",
              sortable: false,
              width: 55,
              nodrag: true,
            },
          ],
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.rebar_la"),
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.dia"),
              dataType: "integer",
              dataIndx: "side_dia",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.pieces"),
              dataType: "float",
              dataIndx: "side_n",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: sideCoverTitle,
              dataType: "float",
              dataIndx: "side_cover",
              sortable: false,
              width: 85,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.ss"),
              dataType: "float",
              dataIndx: "side_ss",
              sortable: false,
              width: 70,
              nodrag: true,
            },
          ],
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.rebar_ob"),
          dataType: "float",
          dataIndx: "cos",
          sortable: false,
          width: 85,
          nodrag: true,
        },
        {
          title: "tanγ+tanβ",
          dataType: "float",
          dataIndx: "tan",
          sortable: false,
          width: 85,
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.rebar_sh"),
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.dia"),
              dataType: "integer",
              dataIndx: "stirrup_dia",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.number"),
              dataType: "float",
              dataIndx: "stirrup_n",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.ss"),
              dataType: "float",
              dataIndx: "stirrup_ss",
              sortable: false,
              width: 70,
              nodrag: true,
            },
          ],
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.rebar_fo"),
          cls: "col-disabled",
          editable: false,
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.dia"),
              dataType: "integer",
              dataIndx: "bending_dia",
              sortable: false,
              width: 70,
              nodrag: true,
              cls: "col-disabled",
              editable: false,
            },
            {
              title: this.translate.instant("bars.number"),
              dataType: "float",
              dataIndx: "bending_n",
              sortable: false,
              width: 70,
              nodrag: true,
              cls: "col-disabled",
              editable: false,
            },
            {
              title: this.translate.instant("bars.ss"),
              dataType: "float",
              dataIndx: "bending_ss",
              sortable: false,
              width: 70,
              nodrag: true,
              cls: "col-disabled",
              editable: false,
            },
            {
              title: this.translate.instant("bars.angle"),
              dataType: "float",
              dataIndx: "bending_angle",
              sortable: false,
              width: 70,
              nodrag: true,
              cls: "col-disabled",
              editable: false,
            },
          ],
          nodrag: true,
        }
        // {
        //   title: this.translate.instant("bars.process"),
        //   align: "center",
        //   dataType: "bool",
        //   dataIndx: "enable",
        //   type: "checkbox",
        //   sortable: false,
        //   width: 40,
        //   nodrag: true,
        // }
      );
    } else {
      this.beamHeaders.push(
        {
          title: this.translate.instant("bars.p_name"),
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
          title: this.translate.instant("bars.bh"),
          align: "center",
          dataType: "float",
          dataIndx: "bh",
          editable: false,
          frozen: true,
          sortable: false,
          nodrag: true,
          style: { background: "#373e45" },
          styleHead: { background: "#373e45" },
        },
        {
          title: this.translate.instant("bars.haunch"),
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.bending"),
              align: "center",
              colModel: [
                {
                  title: this.translate.instant("bars.shear"),
                  align: "center",
                  dataType: "float",
                  dataIndx: "haunch_height",
                  frozen: true,
                  sortable: false,
                  width: 85,
                  nodrag: true,
                },
              ],
              nodrag: true,
            },
          ],
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.position_"),
          align: "center",
          dataType: "string",
          dataIndx: "design_point_id",
          frozen: true,
          editable: true,
          sortable: false,
          width: 40,
          nodrag: true,
        },
        {
          title:
            this.translate.instant("bars.rebar_ax") +
            `<div id="member-dev-question-ax" style="cursor:pointer; margin-left: 6px" (click) = "preview()">        
        <svg id="member-dev-question-ax" width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path id="cls-2" d="M2.49023 14.5098C4.1504 16.1699 6.15363 17 8.5 17C10.8464 17 12.8496 16.1699 14.5098 14.5098C16.1699 12.8496 17 10.8464 17 8.5C17 6.15363 16.1699 4.1504 14.5098 2.49023C12.8496 0.83007 10.8464 0 8.5 0C6.15363 0 4.1504 0.83007 2.49023 2.49023C0.83007 4.1504 0 6.15363 0 8.5C0 10.8464 0.83007 12.8496 2.49023 14.5098ZM8.5 2.125C9.67318 2.125 10.6748 2.46256 11.5049 3.1377C12.335 3.81283 12.75 4.78124 12.75 6.04297C12.75 7.63673 11.9753 8.85416 10.4258 9.69531C10.2044 9.80599 10.0052 9.96094 9.82812 10.1602C9.65104 10.3594 9.5625 10.5143 9.5625 10.625C9.5625 10.9128 9.45736 11.1618 9.24707 11.3721C9.03678 11.5824 8.78776 11.6875 8.5 11.6875C8.21224 11.6875 7.96322 11.5824 7.75293 11.3721C7.54264 11.1618 7.4375 10.9128 7.4375 10.625C7.4375 10.0273 7.64778 9.4795 8.06836 8.98145C8.48893 8.4834 8.93164 8.10156 9.39648 7.83594C10.2155 7.39323 10.625 6.79558 10.625 6.04297C10.625 4.84765 9.91667 4.25 8.5 4.25C7.92448 4.25 7.42643 4.43815 7.00586 4.81445C6.58528 5.19076 6.375 5.722 6.375 6.4082C6.375 6.69597 6.26986 6.94499 6.05957 7.15527C5.84928 7.36556 5.60026 7.4707 5.3125 7.4707C5.02474 7.4707 4.77572 7.36556 4.56543 7.15527C4.35514 6.94499 4.25 6.69597 4.25 6.4082C4.25 5.08007 4.68164 4.03418 5.54492 3.27051C6.40821 2.50683 7.39322 2.125 8.5 2.125ZM9.26367 14.6094C9.06445 14.8086 8.8099 14.9082 8.5 14.9082C8.1901 14.9082 7.93001 14.8031 7.71973 14.5928C7.50944 14.3825 7.4043 14.1279 7.4043 13.8291C7.4043 13.5303 7.50944 13.2702 7.71973 13.0488C7.93001 12.8275 8.1901 12.7168 8.5 12.7168C8.8099 12.7168 9.06999 12.8275 9.28027 13.0488C9.49056 13.2702 9.5957 13.5303 9.5957 13.8291C9.5957 14.1279 9.48503 14.388 9.26367 14.6094Z" fill="#9FB6C1"/>
        </svg></div>`,
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.dia"),
              dataType: "integer",
              dataIndx: "rebar_dia",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.number"),
              dataType: "float",
              dataIndx: "rebar_n",
              sortable: false,
              width: 60,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.cover"),
              dataType: "float",
              dataIndx: "rebar_cover",
              sortable: false,
              width: 65,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.lines"),
              dataType: "float",
              dataIndx: "rebar_lines",
              sortable: false,
              width: 55,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.space"),
              dataType: "float",
              dataIndx: "rebar_space",
              sortable: false,
              width: 55,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.ss"),
              dataType: "float",
              dataIndx: "rebar_ss",
              sortable: false,
              width: 55,
              nodrag: true,
            },
          ],
          nodrag: true,
        },
        {
          title:
            this.translate.instant("bars.rebar_la") +
            `<div id="member-dev-question-la" style="cursor:pointer; margin-left: 6px" (click) = "preview()">        
        <svg id="member-dev-question-la" width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path id="cls-2" d="M2.49023 14.5098C4.1504 16.1699 6.15363 17 8.5 17C10.8464 17 12.8496 16.1699 14.5098 14.5098C16.1699 12.8496 17 10.8464 17 8.5C17 6.15363 16.1699 4.1504 14.5098 2.49023C12.8496 0.83007 10.8464 0 8.5 0C6.15363 0 4.1504 0.83007 2.49023 2.49023C0.83007 4.1504 0 6.15363 0 8.5C0 10.8464 0.83007 12.8496 2.49023 14.5098ZM8.5 2.125C9.67318 2.125 10.6748 2.46256 11.5049 3.1377C12.335 3.81283 12.75 4.78124 12.75 6.04297C12.75 7.63673 11.9753 8.85416 10.4258 9.69531C10.2044 9.80599 10.0052 9.96094 9.82812 10.1602C9.65104 10.3594 9.5625 10.5143 9.5625 10.625C9.5625 10.9128 9.45736 11.1618 9.24707 11.3721C9.03678 11.5824 8.78776 11.6875 8.5 11.6875C8.21224 11.6875 7.96322 11.5824 7.75293 11.3721C7.54264 11.1618 7.4375 10.9128 7.4375 10.625C7.4375 10.0273 7.64778 9.4795 8.06836 8.98145C8.48893 8.4834 8.93164 8.10156 9.39648 7.83594C10.2155 7.39323 10.625 6.79558 10.625 6.04297C10.625 4.84765 9.91667 4.25 8.5 4.25C7.92448 4.25 7.42643 4.43815 7.00586 4.81445C6.58528 5.19076 6.375 5.722 6.375 6.4082C6.375 6.69597 6.26986 6.94499 6.05957 7.15527C5.84928 7.36556 5.60026 7.4707 5.3125 7.4707C5.02474 7.4707 4.77572 7.36556 4.56543 7.15527C4.35514 6.94499 4.25 6.69597 4.25 6.4082C4.25 5.08007 4.68164 4.03418 5.54492 3.27051C6.40821 2.50683 7.39322 2.125 8.5 2.125ZM9.26367 14.6094C9.06445 14.8086 8.8099 14.9082 8.5 14.9082C8.1901 14.9082 7.93001 14.8031 7.71973 14.5928C7.50944 14.3825 7.4043 14.1279 7.4043 13.8291C7.4043 13.5303 7.50944 13.2702 7.71973 13.0488C7.93001 12.8275 8.1901 12.7168 8.5 12.7168C8.8099 12.7168 9.06999 12.8275 9.28027 13.0488C9.49056 13.2702 9.5957 13.5303 9.5957 13.8291C9.5957 14.1279 9.48503 14.388 9.26367 14.6094Z" fill="#9FB6C1"/>
        </svg></div>`,
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.dia"),
              dataType: "integer",
              dataIndx: "side_dia",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.pieces"),
              dataType: "float",
              dataIndx: "side_n",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: sideCoverTitle,
              dataType: "float",
              dataIndx: "side_cover",
              sortable: false,
              width: 85,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.ss"),
              dataType: "float",
              dataIndx: "side_ss",
              sortable: false,
              width: 70,
              nodrag: true,
            },
          ],
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.rebar_ob"),
          dataType: "float",
          dataIndx: "cos",
          sortable: false,
          width: 85,
          nodrag: true,
        },
        {
          title: "tanγ+tanβ",
          dataType: "float",
          dataIndx: "tan",
          sortable: false,
          width: 85,
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.stirrup"),
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.dia"),
              dataType: "integer",
              dataIndx: "stirrup_dia",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.number"),
              dataType: "float",
              dataIndx: "stirrup_n",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.ss"),
              dataType: "float",
              dataIndx: "stirrup_ss",
              sortable: false,
              width: 70,
              nodrag: true,
            },
          ],
          nodrag: true,
        },
        {
          title: this.translate.instant("bars.rebar_fo"),
          align: "center",
          colModel: [
            {
              title: this.translate.instant("bars.dia"),
              dataType: "integer",
              dataIndx: "bending_dia",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.number"),
              dataType: "float",
              dataIndx: "bending_n",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.ss"),
              dataType: "float",
              dataIndx: "bending_ss",
              sortable: false,
              width: 70,
              nodrag: true,
            },
            {
              title: this.translate.instant("bars.angle"),
              dataType: "float",
              dataIndx: "bending_angle",
              sortable: false,
              width: 70,
              nodrag: true,
            },
          ],
          nodrag: true,
        }
        // {
        //   title: this.translate.instant("bars.process"),
        //   align: "center",
        //   dataType: "bool",
        //   dataIndx: "enable",
        //   type: "checkbox",
        //   sortable: false,
        //   width: 40,
        //   nodrag: true,
        // }
      );
    }
  }

  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }

  ngOnDestroy() {
    this.saveData();
    this.refreshSubscription?.unsubscribe();
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
    // this.setTitle(this.save.isManual());
    // this.option_list[id].colModel = this.beamHeaders
    this.activeButtons(id);
    this.idTab = id;
    this.options = this.option_list[id];
    this.grid.options = this.options;
    this.setActiveTab(this.activeTab);
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

  public setActiveTab(tab: string) {
    this.activeTab = tab;
    for (let i = 0; i < this.table_datas.length; i++) {
      const rowData = this.table_datas[i];
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

      this.loadAutoInputData(rowData, i);

      this.table_datas[i].forEach((data: any, index: any) => {
        // data.pq_cellstyle={...this.rowStyle};
        // data.pq_cellprop={};
        if (this.activeTab === "rebar_ax") {
          if (index % 2 !== 0) {
            data.pq_cellstyle = { ...data.pq_cellstyle, ...this.styleShaded1 };
            data.pq_cellprop = this.propShaded1;
          }
        }
        if (this.activeTab !== "rebar_ax") {
          if (index % 2 !== 0) {
            data.pq_cellstyle = { ...data.pq_cellstyle, ...this.styleShaded2 };
            data.pq_cellprop = this.propShaded2;
          }
          if (index % 2 === 0) {
            data.pq_cellstyle = { ...data.pq_cellstyle, ...this.styleShaded1 };
            data.pq_cellprop = this.propShaded1;
          }
        }
      });
    }
    let FIXED_CELLS_COUNT = this.save.isManual() ? 4 : 5;
    let CHECK_CELL_INDEX = this.save.isManual() ? 24 : 25;

    let cellIndexMap = {
      rebar_ax: {
        default: { start: 6, end: 17 },
        manual: { start: 5, end: 16 },
      },
      default: {
        default: { start: 18, end: 24 },
        manual: { start: 17, end: 23 },
      },
    };
    const mode = this.save.isManual() ? "manual" : "default";
    const tabType = cellIndexMap[tab] || cellIndexMap["default"];
    const { start, end } = tabType[mode];

    let startCellIndex = start;
    let endCellIndex = end;
    if (this.menuService.selectedRoad) {
      const newHeader = this.loadHeaderRoad(tab);
      this.options.colModel = newHeader;
      this.grid.options = this.options;

      // this.grid.grid.getColModel().forEach((column, index) => {
      //   if (tab === "rebar_ax" && column.dataIndx === "tan")
      //   {
      //     column.hidden = false;
      //   }
      //   else if (tab === "rebar_ax" && column.dataIndx === "stirrup_dia")
      //   {
      //     column.hidden = true;
      //   }
      //   else if (tab === "rebar_sh" && column.dataIndx === "tan")
      //   {
      //     column.hidden = true;
      //   }
      //   else if (tab === "rebar_sh" && column.dataIndx === "stirrup_dia")
      //   {
      //     column.hidden = false;
      //   }
      //   else{
      //     const isInTargetRange = index >= startCellIndex && index <= endCellIndex;
      //     const isFixedCell = index <= FIXED_CELLS_COUNT;
      //     const isCheckCell = index === CHECK_CELL_INDEX;
      //     column.hidden = !(isInTargetRange || isFixedCell || isCheckCell);
      //   }
    } else {
      this.grid.grid.getColModel().forEach((column, index) => {
        const isInTargetRange =
          index >= startCellIndex && index <= endCellIndex;
        const isFixedCell = index <= FIXED_CELLS_COUNT;
        const isCheckCell = index === CHECK_CELL_INDEX;
        // Midasピックアップデータの場合は"位置"を非表示にする
        const isPositionColumn = column.dataIndx === "position" && this.save.isMidasPickUp();
        column.hidden = isPositionColumn || !(isInTargetRange || isFixedCell || isCheckCell);
        if (column.dataIndx === "tan" && this.activeTab === "rebar_ax") {
          column.hidden =
            this.basic.get_specification2() !== 3 &&
            this.basic.get_specification2() !== 4
              ? false
              : true;
        }
      });
    }
    this.grid.refreshCM();
    this.grid.refreshDataAndView();
  }

  private loadAutoInputData(rowData: any, indexTab: any) {
    for (let j = 0; j < rowData.length; j += 2) {
      let currentCell = rowData[j];
      if (j === 0) {
        currentCell.pq_cellstyle = this.rowStyle2;
        continue;
      } else {
        currentCell.pq_cellstyle = this.rowStyle;
        var prevRow = rowData[j - 2];
        const keys = Object.keys(currentCell).filter(
          (x) => this.colAutoInputs.filter((y) => y === x).length > 0
        );
        keys.forEach((key) => {
          if (JSON.stringify(currentCell[key]) === "null") {
            currentCell[key] = prevRow[key];
          } else if (
            JSON.stringify(currentCell[key]) !== JSON.stringify(prevRow[key])
          ) {
            currentCell.pq_cellstyle = { ...currentCell.pq_cellstyle };
            currentCell.pq_cellstyle[`${key}`] = { color: "white" };
            this.lstItemEdited.push(indexTab + "-" + j + "-" + key);
          }
        });
      }
    }
    for (let j = 1; j < rowData.length; j += 2) {
      let currentCell = rowData[j];
      if (j === 1) {
        currentCell.pq_cellstyle = this.rowStyle2;
        continue;
      } else {
        currentCell.pq_cellstyle = this.rowStyle;
        var prevRow = rowData[j - 2];
        const keys = Object.keys(currentCell).filter(
          (x) => this.colAutoInputs.filter((y) => y === x).length > 0
        );
        keys.forEach((key) => {
          if (JSON.stringify(currentCell[key]) === "null") {
            currentCell[key] = prevRow[key];
          } else if (
            JSON.stringify(currentCell[key]) !== JSON.stringify(prevRow[key])
          ) {
            currentCell.pq_cellstyle = { ...currentCell.pq_cellstyle };
            currentCell.pq_cellstyle[`${key}`] = { color: "white" };
            this.lstItemEdited.push(indexTab + "-" + j + "-" + key);
          }
        });
      }
    }
  }

  private loadHeaderRoad(tab: string) {
    let newHeader = [];
    const mode = this.save.isManual() ? 0 : 1;
    if (tab === "rebar_ax") {
      const cols = [9, 10];
      newHeader = this.beamHeaders.filter((v, i) => !cols.includes(i - mode));
    } else {
      const cols = [5, 6, 7, 8];
      newHeader = this.beamHeaders.filter((v, i) => !cols.includes(i - mode));
    }
    return newHeader;
  }
  handleClose(event: any) {
    if (event) {
      this.element = {};
      this.show = false;
    }
  }
  handleShowHiddenCol() {
    this.grid.grid.getColModel().forEach((column, index) => {
      if (column.dataIndx === "tan" && this.activeTab === "rebar_ax") {
        column.hidden =
          this.basic.get_specification2() !== 3 &&
          this.basic.get_specification2() !== 4
            ? false
            : true;
      }
    });
    this.grid.refreshCM();
    this.grid.refreshDataAndView();
  }
}
