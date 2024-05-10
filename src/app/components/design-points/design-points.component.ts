import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
} from "@angular/core";
import { InputDesignPointsService } from "./design-points.service";
import { SaveDataService } from "../../providers/save-data.service";
import { AppComponent } from "src/app/app.component";
import { SheetComponent } from "../sheet/sheet.component";
import pq from "pqgrid";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-design-points",
  templateUrl: "./design-points.component.html",
  styleUrls: ["./design-points.component.scss", "../subNavArea.scss"],
})
export class DesignPointsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("grid") grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[] = [];
  // このページで表示するデータ
  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];
  public optionsCheck = {
    1: { text: "My - Vz" },
    2: { text: "Mz - Vy" },
  }
  public optionsArray = [
    { id: "1", text: "My - Vz" },
    { id: "2", text: "Mz - Vy" },
  ];
  public styleNoEdit = { "pointer-events": "none", "color": "#999C9F" }
  public propNoEdit = { edit: false, }
  constructor(
    private points: InputDesignPointsService,
    private save: SaveDataService,
    private app: AppComponent,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.setTitle(this.save.isManual());

    this.table_datas = this.points.getTableColumns();
    
    // グリッドの設定
    this.option_list = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      if(this.save.is3DPickUp()){
        this.table_datas[i].forEach((data:any)=>{
          if (data["axis_type"]===1){
            data["isMCalc"] = data["isMyCalc"]
            data["isVCalc"] = data["isVzCalc"]
          }else{
            data["isMCalc"] = data["isMzCalc"]
            data["isVCalc"] = data["isVyCalc"]
          }
        })
      } else {
        this.table_datas[i].forEach((data: any) => {
          data["isMCalc"] = data["isMzCalc"]
          data["isVCalc"] = data["isVyCalc"]
          data.pq_cellstyl={
            ...data.pq_cellstyle,
            axis_type:{...this.styleNoEdit}
          }
          data.pq_cellprop = {
            ...data.pq_cellprop,
            axis_type: { ...this.propNoEdit }
          }
        })
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
        freezeCols: this.save.isManual() ? 2 : 4,
        editModel: {
          clicksToEdit: 1
        },
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
          // 何か変更があったら判定する
          for (const property of ui.updateList) {
            for (const key of Object.keys(property.newRow)) {
              if (key ==="axis_type") {
                if (+property.newRow[key] === 1) {
                  property.rowData["isMyCalc"] = property.rowData["isMCalc"]
                  property.rowData["isVzCalc"] = property.rowData["isVCalc"]
                  if (property.rowData["isMCalc"] || property.rowData["isVCalc"] ){
                    property.rowData["isMzCalc"] = false;
                    property.rowData["isVyCalc"] = false;
                  }
                }else{
                  property.rowData["isMzCalc"] = property.rowData["isMCalc"]
                  property.rowData["isVyCalc"] = property.rowData["isVCalc"]
                  if (property.rowData["isMCalc"] || property.rowData["isVCalc"]) {
                    property.rowData["isMyCalc"] = false;
                    property.rowData["isVzCalc"] = false
                  }
                }
              }else{
                const check = property.newRow[key]
                if (key === "isMCalc") {
                  if (+property.rowData["axis_type"] === 1) {
                    property.rowData["isMyCalc"] = check;
                  } else {
                    property.rowData["isMzCalc"] = check;
                  }
                }
                if (key === "isVCalc") {
                  if (+property.rowData["axis_type"] === 1) {
                    property.rowData["isVzCalc"] = check;
                  } else {
                    property.rowData["isVyCalc"] = check;
                  }
                }
              }
            }
          }
          let flg = false;
          for (const datas of this.table_datas) {
            if (this.points.designPointChange(datas) === true) {
              flg = true;
              break;
            }
          }
          this.app.designPointChange(flg);
        },
        scrollStop: (evt, ui) => {
          const collection = document.getElementsByClassName('pq-cont-inner pq-cont-left') as HTMLCollectionOf<HTMLElement>;

          if (collection.length > 0) {
            for (let i = 0; i < collection.length; i++) {
              collection[i].style.pointerEvents = null;
            }
          }
        },
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.groupe_name.push(this.points.getGroupeName(i));
    }
  }

  ngAfterViewInit() {
    this.activeButtons(0);

    this.grid.refreshCell({
      rowIndx: 0,
      colIndx: 0,
    });
  }

  private setTitle(isManual: boolean): void {
    if (isManual) {
      // 断面力手入力モードの場合
      this.columnHeaders = [
        {
          title: "",
          align: "left",
          dataType: "string",
          dataIndx: "m_no",
          frozen: true,
          sortable: false,
          width: 70,
          editable: false,
          nodrag: true,
          style: { 'background': '#373e45' },
          styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("design-points.p_name"),
          dataType: "string",
          dataIndx: "p_name",
          frozen: true,
          sortable: false,
          width: 250,
          nodrag: true,
        },
        // {
        //   title: this.translate.instant("design-points.s_len"),
        //   dataType: "float",
        //   dataIndx: "La",
        //   sortable: false,
        //   width: 140,
        // },
      ];
    } else {
      this.columnHeaders=[
        {
          title: this.translate.instant("design-points.m_no"),
          align: "left",
          dataType: "string",
          dataIndx: "m_no",
          frozen: true,
          sortable: false,
          width: 70,
          editable: false,
          nodrag: true,
          style: { 'background': '#373e45' },
          styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("design-points.p_id"),
          dataType: "string",
          dataIndx: "p_id",
          frozen: true,
          sortable: false,
          width: 85,
          editable: false,
          nodrag: true,
          style: { 'background': '#373e45' },
          styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("design-points.position"),
          dataType: "float",
          format: "#.000",
          dataIndx: "position",
          frozen: true,
          sortable: false,
          width: 110,
          editable: false,
          nodrag: true,
          style: { 'background': '#373e45' },
          styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("design-points.p_name"),
          dataType: "string",
          dataIndx: "p_name",
          frozen: true,
          sortable: false,
          width: 250,
          nodrag: true,
        },
        {
          title: this.translate.instant("design-points.check_target"),
          align: "center",
          dataIndx: "axis_type",
          sortable: false,
          width: 120,
          nodrag: true,
          cls: 'pq-drop-icon pq-side-icon',
          editor: {
            type: 'select',
            options: this.optionsArray,
            labelIndx: 'text',
            valueIndx: 'id',
          },          
          render: (ui) => {
            return (this.optionsCheck[ui.cellData] || {}).text;
          }, 
        },
        {
          title: this.translate.instant("design-points.b_check"),
          align: "center",
          dataType: "bool",
          dataIndx: "isMCalc",
          type: "checkbox",
          sortable: false,
          width: 120,
          nodrag: true,
          editor: false,
        },
        {
          title: this.translate.instant("design-points.s_check"),
          align: "center",
          dataType: "bool",
          dataIndx: "isVCalc",
          type: "checkbox",
          sortable: false,
          width: 120,
          nodrag: true,
          editor: false,
        }
      ];
      if (this.save.is3DPickUp()) {
        this.columnHeaders.push(
          {
            title: this.translate.instant("design-points.t_check"),
            align: "center",
            dataType: "bool",
            dataIndx: "isMtCalc",
            type: "checkbox",
            sortable: false,
            width: 120,
            nodrag: true,
            editor: false,
          }
        )
      }
    }
  }

  ngOnDestroy() {
    this.saveData();
  }

  public saveData(): void {
    const a = [];
    for (const g of this.table_datas) {
      for (const p of g) {
        a.push(p);
      }
    }
    if (this.save.isManual()) {
      this.points.setSaveData(a,false);
    } else {
      this.points.setTableColumns(a,this.save.is3DPickUp());
    }
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
      const data = document.getElementById("pos" + i);
      if (data != null) {
        if (i === id) {
          data.classList.add("is-active");
        } else if (data.classList.contains("is-active")) {
          data.classList.remove("is-active");
        }
      }
    }
  }

  // タブのヘッダ名
  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }
}
