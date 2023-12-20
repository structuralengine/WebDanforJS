import { Menu } from "electron";
import { Component, OnInit, ViewChild } from "@angular/core";
import { SheetComponent } from "../sheet/sheet.component";
import pq from "pqgrid";
import { SaveDataService } from "src/app/providers/save-data.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";
import { ShearStrengthService } from "./shear-strength.service";
import { InputBasicInformationService } from "../basic-information/basic-information.service";
import { InputMembersService } from "../members/members.service";
import { InputSafetyFactorsMaterialStrengthsService } from "../safety-factors-material-strengths/safety-factors-material-strengths.service";
import { MenuService } from "../menu/menu.service";
import { InputMaterialStrengthVerificationConditionService } from "../material-strength-verification-conditions/material-strength-verification-conditions.service";

@Component({
  selector: "app-shear",
  templateUrl: "./shear.component.html",
  styleUrls: ["./shear.component.scss", "../subNavArea.scss"],
})
export class ShearComponent implements OnInit {
  @ViewChild("grid") grid: SheetComponent;
  public options: pq.gridT.options;
  public isSubstructure: boolean = false;
  public isRoad: boolean = false;
  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[] = new Array();

  public table_datas: any[];
  public style = {
    "pointer-events": "none",
    background:
      "linear-gradient(to left top, transparent 0%, transparent 50.5%, gray 52.5%, transparent 54.5%, transparent 100%)",
  };
  public prop={edit: false}
  public propTrue={edit: true}


  // タブのヘッダ名
  public styleShead = {
    L: { ...this.style },
  };
  public propShaded1:any =   { 
    L : { ...this.prop},
  }
  public propShaded2:any =   { 
    L : { ...this.propTrue},
  }
  public groupe_name: string[];

  // public isSubstructure: boolean = false;
  // public isRoad: boolean = false;

  constructor(
    private shear: ShearStrengthService,
    private members: InputMembersService,
    // private material: InputSafetyFactorsMaterialStrengthsService,
    // private menu: MenuService,

    private save: SaveDataService,
    public helper: DataHelperModule,
    private basic: InputBasicInformationService,
    private translate: TranslateService,
    private material: InputMaterialStrengthVerificationConditionService,
    private menu: MenuService
  ) {
    this.members.checkGroupNo();
  }

  ngOnInit() {
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.saveData();
      this.onInitData();
    });
    this.onInitData();
  }

  clear() {
    this.columnHeaders = new Array();
    this.table_datas = new Array();
    this.options = new Array();
    this.option_list = new Array();
  }

  onInitData() {
    this.clear();
    this.isRoad = this.menu.selectedRoad;
    if (this.isRoad) {
      this.setShow(0); //set default by first group
    }
    this.setTitle(this.save.isManual());

    this.table_datas = this.shear.getTableColumns();

    // グリッドの設定
    this.options = new Array();

    for (let i = 0; i < this.table_datas.length; i++) {
      this.table_datas[i].forEach((data: any, index: any) => {
        if (data.L === null) {
          data.pq_cellstyle = this.styleShead;
          data.pq_cellprop=this.propShaded1
        }
      });

      const op = {
        showTop: false,
        reactive: true,
        sortable: false,
        locale: "jp",
        height: this.tableHeight().toString(),
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders,
        dataModel: { data: this.table_datas[i] },
        freezeCols: this.save.isManual() ? 2 : 3,
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
        change(evt, ui) {
          const style = {
            "pointer-events": "none",
            background:
              "linear-gradient(to left top, transparent 0%, transparent 50.5%, gray 52.5%, transparent 54.5%, transparent 100%)",
              "text-indent": "200%",
              "white-space": "nowrap",
              "overflow": "hidden",
          };
          const prop={edit: false}
          const propTrue={edit: true}

          // タブのヘッダ名
          const styleShead = {
            L: { ...style },
            
          };
          const propShaded1:any =   { 
            L : { ...prop},
          }
          const propShaded2:any =   { 
            L : { ...propTrue},
          }

          if (ui.updateList[0].newRow.fixed_end === false 
            // && ui.updateList[0].rowData.L === null 
            ) {
            ui.updateList[0].rowData.pq_cellstyle = styleShead;
            ui.updateList[0].rowData.pq_cellprop= propShaded1;
            
          } else if(ui.updateList[0].newRow.fixed_end === true ){
            ui.updateList[0].rowData.pq_cellstyle = null;
            ui.updateList[0].rowData.pq_cellprop= propShaded2;

          }
          
        },
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.groupe_name.push(this.shear.getGroupeName(i));
    }
  }
  ngAfterViewInit() {
    this.activeButtons(0);
  }

  private setTitle(isManual: boolean): void {
    if (!this.isRoad) {
      if (isManual) {
        // 断面力手入力モードの場合
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
            title: this.translate.instant("shear-strength.m_no"),
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
            title: this.translate.instant("shear-strength.position"),
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

      // 共通する項目
      this.columnHeaders.push(
        {
          title: this.translate.instant("shear-strength.p_name"),
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
          title: this.translate.instant("shear-strength.s_len"),
          dataType: "float",
          dataIndx: "La",
          sortable: false,
          width: 200,
          nodrag: true,
        }
      );

      // 令和5年 RC標準
      const speci1 = this.basic.get_specification1();
      const speci2 = this.basic.get_specification2();
      if (speci1 === 0 && (speci2 === 3 || speci2 === 4)) {
        this.columnHeaders.push(
          {
            title: this.translate.instant("shear-strength.fixed_end"),
            align: "center",
            dataType: "bool",
            dataIndx: "fixed_end",
            type: "checkbox",
            sortable: false,
            width: 100,
            nodrag: true,
          },
          {
            title: this.translate.instant("shear-strength.m_len"),
            dataType: "float",
            dataIndx: "L",
            frozen: true,
            width: 150,
            nodrag: true,
          }
        );
      }
    } else {
      if (isManual) {
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
            title: this.translate.instant("shear-strength.m_no"),
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
            title: this.translate.instant("shear-strength.position"),
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
      this.columnHeaders.push({
        title: this.translate.instant("shear-strength.p_name"),
        dataType: "string",
        dataIndx: "p_name",
        editable: false,
        frozen: true,
        sortable: false,
        width: 250,
        nodrag: true,
        style: { background: "#373e45" },
        styleHead: { background: "#373e45" },
      });
      if (this.isSubstructure) {
        this.columnHeaders.push(
          {
            title: this.translate.instant("shear-strength.consider_shear"),
            align: "center",
            colModel: [
              {
                title: this.translate.instant("shear-strength.concrete"),
                align: "center",
                dataType: "bool",
                dataIndx: "concrete",
                type: "checkbox",
                frozen: true,
                sortable: false,
                width: 150,
                nodrag: true,
              },
              {
                title: this.translate.instant(
                  "shear-strength.reinforcement_bar"
                ),
                align: "center",
                dataType: "bool",
                dataIndx: "bar",
                type: "checkbox",
                frozen: true,
                sortable: false,
                width: 150,
                nodrag: true,
              },
            ],
            nodrag: true,
          },
          {
            title: this.translate.instant("shear-strength.s_len_a"),
            align: "float",
            dataType: "integer",
            dataIndx: "La",
            sortable: false,
            width: 150,
            nodrag: true,
          }
        );
      }
    }
  }

  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }

  ngOnDestroy() {
    this.saveData();
  }

  //Set show following component type is "Substructure"
  public setShow(id) {
    let components = this.material.getSaveData().component;
    const newComponents = Object.values(components);
    let component: any = newComponents[id];

    if (component !== null && component !== undefined) {
      var sub = component.find((value) => value.id === 2); //Substructure
      if (sub !== null && sub !== undefined) this.isSubstructure = sub.selected;
    }
  }

  public saveData(): void {
    const a = [];
    for (const g of this.table_datas) {
      for (const e of g) {
        a.push(e);
      }
    }
    this.shear.setTableColumns(a);
  }

  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 230;
    return containerHeight;
  }

  public activePageChenge(id: number): void {
    this.setShow(id);
    this.activeButtons(id);

    this.setTitle(this.save.isManual());
    this.options = this.option_list[id];
    this.options.colModel = this.columnHeaders;
    this.grid.options = this.options;
    this.grid.refreshDataAndView();
  }

  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.table_datas.length; i++) {
      const data = document.getElementById("shr" + i);
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
