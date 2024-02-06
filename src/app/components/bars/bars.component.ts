import { filter } from 'rxjs/operators';
import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { InputBarsService } from './bars.service';
import { SheetComponent } from '../sheet/sheet.component';
import { SaveDataService } from 'src/app/providers/save-data.service';
import pq from 'pqgrid';
import { TranslateService } from "@ngx-translate/core";
import { InputMembersService } from '../members/members.service';
import { MenuService } from '../menu/menu.service';
import { data } from 'jquery';
import { log } from 'console';
import { ThreeNodeService } from '../three/geometry/three-node.service';
import { SceneService } from '../three/scene.service';
import { ThreeNodeGuideService } from '../three/geometry/three-node-guide.service';

@Component({
  selector: 'app-bars',
  templateUrl: './bars.component.html',
  styleUrls: ['./bars.component.scss', '../subNavArea.scss']
})
export class BarsComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;
  public activeTab: string = 'rebar_ax';
  public click_review: boolean
  public calPoint: any
  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private beamHeaders: object[] = new Array();
  // private columnHeaders: object[] = new Array();
  // private pileHeaders: object[] = new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];
  public style ={"pointer-events":"none", "background": "linear-gradient(to left top, transparent 0%, transparent 50.5%, gray 52.5%, transparent 54.5%, transparent 100%)", "font-size":"0" }
  public styleShaded1:any =   { 
    haunch_height : { ...this.style},
  }
  public styleShaded2 ={
    stirrup_dia :{...this.style},
    stirrup_n:{...this.style},
    stirrup_ss:{...this.style},
    bending_dia:{...this.style},
    bending_n:{...this.style},
    bending_ss:{...this.style},
    bending_angle:{...this.style},
    
  }
  public prop={edit: false,show:false}
  public propShaded1:any =   { 
    haunch_height : { ...this.prop},
  }
  public propShaded2 ={
    stirrup_dia :{...this.prop},
    stirrup_n:{...this.prop},
    stirrup_ss:{...this.prop},
    bending_dia:{...this.prop},
    bending_n:{...this.prop},
    bending_ss:{...this.prop},
    bending_angle:{...this.prop},
    
  }

  constructor(
    private members: InputMembersService,
    public bars: InputBarsService,
    private save: SaveDataService,
    private translate: TranslateService,
    private menuService: MenuService,
    private threeNode: ThreeNodeService,
    private threeNodeGuide: ThreeNodeGuideService,
    private scene: SceneService,
    private member: InputMembersService
  ) {     
    this.members.checkGroupNo();
  }

  ngOnInit() {
    this.setTitle(this.save.isManual());
    this.table_datas = this.bars.getTableColumns();

    // グリッドの設定
    this.option_list = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.table_datas[i].forEach((data:any,index:any)=>{
       if(this.activeTab==="rebar_ax"){
        if(index % 2!==0){
          data.pq_cellstyle=this.styleShaded1;
          data.pq_cellprop=this.propShaded1
        }
       }
       })
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
          console.log("updateui", ui)
         
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
            let m_no= ui.updateList[0].rowData.m_no
            let index = ui.updateList[0].rowData.index;
            let rowIndex =ui.updateList[0].rowIndx
            if(rowIndex% 2 != 0){
              const data_index = this.table_datas[0][rowIndex - 1];
              m_no = data_index.m_no;
              index = data_index.index
            } 
            if(m_no != null && m_no != undefined){
              for(let i = 0; i < this.table_datas.length; i++){
                this.bars.setTableColumns(this.table_datas[i])
              }           
              let data = this.bars.getDataPreview(index);           
              this.threeNode.memNo = m_no;
              this.threeNode.dataNode = data;    
                   
            }
            this.removeScene()

            this.threeNode.createDrawingLine()
            console.log(this.scene)
          }
        },
        cellClick: (evt, ui) =>{               
          let m_no = ui.rowData.m_no;
          const rowData = ui.rowData
          let index = ui.rowData.index;
          if(ui.rowIndx % 2 != 0){
            const data_index = this.table_datas[0][ui.rowIndx - 1];
            m_no = data_index.m_no;
            index = data_index.index
          }           
          this.threeNodeGuide.dataNode= rowData
          if(ui.colIndx ===6 ||ui.colIndx ===7||ui.colIndx ===8||ui.colIndx===9||ui.colIndx===10||ui.colIndx ===11){
            if(ui.rowIndxPage % 2 ===0){
               this.threeNodeGuide.checkKey='up'
            }else{
              this.threeNodeGuide.checkKey='lower'
            }
          }
          if(ui.colIndx ===12 ||ui.colIndx ===13||ui.colIndx ===14||ui.colIndx===15){
          this.threeNodeGuide.checkKey='lateral'
          if(ui.rowIndx % 2 != 0){     
            this.threeNodeGuide.dataUpper=this.table_datas[0][ui.rowIndx - 1];
            this.threeNodeGuide.dataLower= this.table_datas[0][ui.rowIndx];
          }else{
            this.threeNodeGuide.dataUpper = this.table_datas[0][ui.rowIndx ];
            this.threeNodeGuide.dataLower = this.table_datas[0][ui.rowIndx +1]
          }
          }
          if(m_no != null && m_no != undefined){
            for(let i = 0; i < this.table_datas.length; i++){
              this.bars.setTableColumns(this.table_datas[i])
            }           
            let data = this.bars.getDataPreview(index);           
            this.threeNode.memNo = m_no;
            this.threeNode.dataNode = data;
            const member = this.member.getTableColumns(m_no);
            this.calPoint = {
              m_no: member.m_no,
              shape: member.shape,
              p_name: ui.rowData.p_name
            }              
          }
            
        }
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for (let i = 0; i < this.table_datas.length; i++) {
      this.groupe_name.push(this.bars.getGroupeName(i));
    }
  }

  ngAfterViewInit() {
    this.activeButtons(0);
    this.setActiveTab(this.activeTab);
  }

  private setTitle(isManual: boolean): void {
    this.beamHeaders = [];
    if (isManual) {
      // 断面力手入力モードの場合
      this.beamHeaders = [
        { title: '', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 70, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      ];
    } else {
      this.beamHeaders = [
        {
          title: this.translate.instant("bars.m_no"),
          align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 70, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
        },
        {
          title: this.translate.instant("bars.position"),
          dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, frozen: true, sortable: false, width: 110, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
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
    if(this.menuService.selectedRoad){
    this.beamHeaders.push(
      {
        title: this.translate.instant("bars.p_name"),
        dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("bars.bh"),
        align: 'center', dataType: 'float', dataIndx: 'bh', editable: false, frozen: true, sortable: false, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("bars.haunch"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("bars.bending"),
            align: 'center', colModel: [
              {
                title: this.translate.instant("bars.shear"),
                align: 'center', dataType: 'float', dataIndx: 'haunch_height', frozen: true, sortable: false, width: 85, nodrag: true,
              },
            ],
            nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("bars.position"),
        align: 'center', dataType: 'string', dataIndx: 'design_point_id', frozen: true, editable: true, sortable: false, width: 40, nodrag: true,
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
            dataType: 'float', dataIndx: 'rebar_cover', sortable: false, width: 55, nodrag: true,
          },
          {
            title: this.translate.instant("bars.lines"),
            dataType: 'float', dataIndx: 'rebar_lines', sortable: false, width: 55, nodrag: true,
          },
          {
            title: this.translate.instant("bars.space"),
            dataType: 'float', dataIndx: 'rebar_space', sortable: false, width: 55, nodrag: true,
          },
          {
            title: this.translate.instant("bars.ss"),
            dataType: 'float', dataIndx: 'rebar_ss', sortable: false, width: 55, nodrag: true,
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
        title: this.translate.instant("bars.rebar_ob"),
        dataType: 'float', dataIndx: 'cos', sortable: false, width: 85, nodrag: true,
      },
      {
        title: 'tanγ+tanβ', dataType: 'float', dataIndx: 'tan', sortable: false, width: 85, nodrag: true,
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
        title: this.translate.instant("bars.rebar_fo"), cls:"col-disabled", editable:false, 
        align: 'center', colModel: [
          {
            title: this.translate.instant("bars.dia"),
            dataType: 'integer', dataIndx: 'bending_dia', sortable: false, width: 70, nodrag: true, cls:"col-disabled" , editable:false
          },
          {
            title: this.translate.instant("bars.number"),
            dataType: 'float', dataIndx: 'bending_n', sortable: false, width: 70, nodrag: true, cls:"col-disabled" , editable:false
          },
          {
            title: this.translate.instant("bars.ss"),
            dataType: 'float', dataIndx: 'bending_ss', sortable: false, width: 70, nodrag: true, cls:"col-disabled" , editable:false
          },
          {
            title: this.translate.instant("bars.angle"),
            dataType: 'float', dataIndx: 'bending_angle', sortable: false, width: 70, nodrag: true, cls:"col-disabled", editable:false 
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
    else{
    this.beamHeaders.push(
      {
        title: this.translate.instant("bars.p_name"),
        dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("bars.bh"),
        align: 'center', dataType: 'float', dataIndx: 'bh', editable: false, frozen: true, sortable: false, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' }
      },
      {
        title: this.translate.instant("bars.haunch"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("bars.bending"),
            align: 'center', colModel: [
              {
                title: this.translate.instant("bars.shear"),
                align: 'center', dataType: 'float', dataIndx: 'haunch_height', frozen: true, sortable: false, width: 85, nodrag: true,
              },
            ],
            nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("bars.position"),
        align: 'center', dataType: 'string', dataIndx: 'design_point_id', frozen: true, editable: true, sortable: false, width: 40, nodrag: true,
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
            dataType: 'float', dataIndx: 'rebar_cover', sortable: false, width: 55, nodrag: true,
          },
          {
            title: this.translate.instant("bars.lines"),
            dataType: 'float', dataIndx: 'rebar_lines', sortable: false, width: 55, nodrag: true,
          },
          {
            title: this.translate.instant("bars.space"),
            dataType: 'float', dataIndx: 'rebar_space', sortable: false, width: 55, nodrag: true,
          },
          {
            title: this.translate.instant("bars.ss"),
            dataType: 'float', dataIndx: 'rebar_ss', sortable: false, width: 55, nodrag: true,
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
        title: this.translate.instant("bars.rebar_ob"),
        dataType: 'float', dataIndx: 'cos', sortable: false, width: 85, nodrag: true,
      },
      {
        title: 'tanγ+tanβ', dataType: 'float', dataIndx: 'tan', sortable: false, width: 85, nodrag: true,
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
  }

  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }

  ngOnDestroy() {
    this.saveData();
    this.bars.is_review = false;
    this.threeNode.memNo = 0;
    this.threeNode.dataNode = new Array();  
    this.closePreview()
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
      this.table_datas[i].forEach((data:any,index:any)=>{
        data.pq_cellstyle={};
        data.pq_cellprop={}
       if(this.activeTab==="rebar_ax"){
        if(index % 2!==0){
          data.pq_cellstyle=this.styleShaded1;
          data.pq_cellprop=this.propShaded1
        }
       }
      //  if(this.activeTab!=="rebar_ax"){
      //   if(index % 2!==0){
      //     data.pq_cellstyle=this.styleShaded2;
      //     data.pq_cellprop= this.propShaded2
      //   }
      //    if(index % 2===0){
      //     data.pq_cellstyle=this.styleShaded1;
      //     data.pq_cellprop=this.propShaded1
      //   }
      //  }
       })
      }
    let FIXED_CELLS_COUNT = this.save.isManual() ? 4 : 5;
    let CHECK_CELL_INDEX = this.save.isManual() ? 24 : 25;
    
    let cellIndexMap = {
      "rebar_ax": {
        default: { start: 6, end: 17 },
        manual: { start: 5, end: 16 }
      },
      "default": {
        default: { start: 18, end: 24 },
        manual: { start: 17, end: 23 }
      }
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
        column.hidden = !(isInTargetRange || isFixedCell || isCheckCell);
      });
    }
    this.grid.refreshDataAndView();
  }

  private loadHeaderRoad(tab: string)
  {
    let newHeader = [];
    const mode = this.save.isManual() ?  0 : 1;
    if(tab === "rebar_ax"){
      const cols = [9,10];
      newHeader = this.beamHeaders.filter((v, i) => !cols.includes(i - mode));
    }
    else
    {
      const cols = [5,6,7,8];
      newHeader = this.beamHeaders.filter((v, i) => !cols.includes(i - mode));
    }
    return newHeader
  }
  public closePreview(): void{
    this.bars.is_review = false
    while(this.scene.scene.children.length > 0){ 
      this.scene.remove(this.scene.scene.children[0]); 
  }
  while(this.scene.sceneRebar.children.length > 0){ 
    this.scene.removeRebar(this.scene.sceneRebar.children[0]); 
}
  }
  public removeScene(){
    let index =[]
    if(this.scene.scene.children.length > 0){ 
      for(let i =0;i< this.scene.scene.children.length;i++){
        let name = this.scene.scene.children[i].name;
        let type = this.scene.scene.children[i].type;
        if((name==="panel-0" && type==="Mesh")|| (name==="panel-1" && type==="Mesh")|| type==="Line"){
         index.push(i)
        }
      }
      index.sort((a,b)=>b-a)
     index.forEach(index=>{
      if(index >=0 && index < this.scene.scene.children.length){
        this.scene.scene.children.splice(index,1)
      }
     })
    
  }
  for (let i = this.threeNode.nodeList.children.length - 1; i >= 0; i--) {
   
  
      const target = this.threeNode.nodeList.children[i];
      while (target.children.length > 0) {
        const object = target.children[0];
        object.parent.remove(object);
      }
      this.threeNode.nodeList.children.splice(i, 1);
    
  }
  }
}
