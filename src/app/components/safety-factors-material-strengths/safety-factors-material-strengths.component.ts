import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { InputSafetyFactorsMaterialStrengthsService } from './safety-factors-material-strengths.service'
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { InputMembersService } from '../members/members.service';
import { visitAll } from '@angular/compiler';
import { SaveDataService } from "../../providers/save-data.service";
import { TranslateService } from "@ngx-translate/core";
import { MenuService } from '../menu/menu.service';
import { Subscription } from 'rxjs';
import { InputBasicInformationService } from '../basic-information/basic-information.service';

@Component({
  selector: 'app-safety-factors-material-strengths',
  templateUrl: './safety-factors-material-strengths.component.html',
  styleUrls: ['./safety-factors-material-strengths.component.scss', '../subNavArea.scss']
})
export class SafetyFactorsMaterialStrengthsComponent
  implements OnInit, OnDestroy, AfterViewInit {
  public arrayAxis: any[]
  public arrayAxisForce: any = {}
  public consider_moment_checked: boolean = true;  
  public not_consider_moment_checked: boolean = false;
  public used : boolean = true;
  public opt_max_min: boolean = false;
  public opt_tens_only:boolean = false;
  public opt_no_for_v: boolean = false;
  public groupMem: any;
  public groupId: any;
  // 安全係数
  @ViewChild('grid1') grid1: SheetComponent;
  public options1: pq.gridT.options;
  public activeTab: string = 'rsb_con';
  private option1_list: pq.gridT.options[] = new Array();
  private columnHeaders1: object[] = [];
  private table1_datas: any[];

  // 鉄筋材料強度
  @ViewChild('grid2') grid2: SheetComponent;
  public options2: pq.gridT.options;
  private option2_list: pq.gridT.options[] = new Array();
  private columnHeaders2: object[] = [];
  private table2_datas: any[];

  // コンクリート材料強度
  @ViewChild('grid3') grid3: SheetComponent;
  public options3: pq.gridT.options;
  private option3_list: pq.gridT.options[] = new Array();
  private columnHeaders3: object[] = [];
  private table3_datas: any[];

  // 鉄骨 - 安全係数
  @ViewChild('grid4') grid4: SheetComponent;
  public options4: pq.gridT.options;
  private option4_list: pq.gridT.options[] = new Array();
  private columnHeaders4: object[] = [];
  private table4_datas: any[];

  // 鉄骨材料強度
  @ViewChild('grid5') grid5: SheetComponent;
  public options5: pq.gridT.options;
  private option5_list: pq.gridT.options[] = new Array();
  private columnHeaders5: object[] = [];
  private table5_datas: any[];    // 鉄骨材料強度

  // 杭の施工条件
  public options6: any[]; // 杭の施工条件
  public pile_factor_list: any[] = new Array();
  public pile_factor_select_id: string;

  // タブのヘッダ名
  private current_index: number;
  private groupe_list: any[];
  public groupe_name: any[];
  public options ={
    0: { text: this.translate.instant("safety-factors-material-strengths.av") },
    1: { text: "SD295" },
    2: { text: "SD345" },
    3: { text: "SD390" },
    4: { text: "SD490" }
  }
  public optionsArray = [
    { id: "0", text: this.translate.instant("safety-factors-material-strengths.av") },
    { id: "1", text: "SD295" },
    { id: "2", text: "SD345" },
    { id: "3", text: "SD390" },
    { id: "4", text: "SD490" }
  ];
  public range ={
    0: {text: this.translate.instant("safety-factors-material-strengths.av")},
    1: {text: "引張鉄筋"},
    2: {text: "引張＋圧縮"},
    3: {text: "全周鉄筋"}
  }
  public rangeArray =[
    { value: "0", text: this.translate.instant("safety-factors-material-strengths.av") },
    { id: "1", text: "引張鉄筋" },
    { id: "2", text: "引張＋圧縮" },
    {id: "3", text: "全周鉄筋" },
  ]
  public style = { "pointer-events": "none", "background": "linear-gradient(to left top, transparent 0%, transparent 50.5%, gray 52.5%, transparent 54.5%, transparent 100%)", "font-size": "0" }
  // public styleShaded1: any = {
  //   V_rbv: { ...this.style },
  //   T_rbt: { ...this.style }
  // }
  public styleEdit = { "color": "#FFFFFF" }
  public styleColor = { "color": "gray" }
  // public colorGray ={
  //   M_rc: { ...this.styleColor },
  //   M_rs: { ...this.styleColor }, 
  //   M_rbs: { ...this.styleColor },
  //   V_rc: { ...this.styleColor },
  //   V_rs: { ...this.styleColor },
  //   V_rbc: { ...this.styleColor },
  //   V_rbs: { ...this.styleColor },
  //   V_rbv: { ...this.style },
  //   T_rbt: { ...this.style },
  // }
  public styleNoEdit = { "pointer-events": "none", "color": "#999C9F" }
  public propEdit = { edit: true, }
  public propNoEdit = { edit: false, }
  public considerMomentChecked: boolean ;
  public showOption: boolean = true;
  checkedRadioValue: number;
  private checkedRadioSubscription: Subscription;
  constructor(
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private members: InputMembersService,
    private translate: TranslateService,
    private cdref: ChangeDetectorRef,
    private save: SaveDataService,
    private menuService: MenuService,
    private basic: InputBasicInformationService
  ) { 
    this.members.checkGroupNo();
    this.checkedRadioSubscription = this.menuService.checkedRadio$.subscribe(value => {
      this.checkedRadioValue = value;
      if(this.checkedRadioValue > 3 ){
        this.opt_no_for_v = true
      }
    });
  }
  public isManual(): boolean {
    return this.save.isManual();
  }
  ngOnInit() {
    this.checkedRadioValue = this.basic.get_specification2();
    this.setTitle();
    const safety = this.safety.getTableColumns();
  
    this.arrayAxis = this.safety.arrayAxis !== undefined ? this.safety.arrayAxis : new Array();
    this.applyStylesToItems(safety.safety_factor);
    if(safety.axisforce_condition !== undefined){
      this.arrayAxisForce = {...safety.axisforce_condition}
      let arrayKey = Object.keys(this.arrayAxisForce)
      this.groupId= arrayKey[0]
    }else{
      this.arrayAxisForce = {}
    }
    // this.arrayAxisForce = safety.axisforce_condition !== undefined ? safety.axisforce_condition : new Array();
    this.groupe_list = safety.groupe_list;
    this.groupe_name = new Array();
    // 配列を作成
    this.table1_datas = new Array();      // 安全係数
    this.table2_datas = new Array();      // 鉄筋材料
    this.table3_datas = new Array();      // コンクリート材料
    this.table4_datas = new Array();      // 鉄骨材料
    this.table5_datas = new Array();      // 鉄骨材料
    this.pile_factor_list = new Array();  // 杭の施工条件


    if(safety.groupe_list.length > 0){
      this.groupId = safety.groupe_list[0][0].g_id
    }
    // 入力項目を作成
    for (let i = 0; i < safety.groupe_list.length; i++) {
      const groupe = safety.groupe_list[i];
      const first = groupe[0];
      const id = first.g_id;
      this.groupe_name.push({ name: this.members.getGroupeName(i) ,id});
      
      // 安全係数
      const bar = [], steel = [];
      for (const col of safety.safety_factor[id]) {

        if (col.id === 8) continue; // 最小鉄筋量の安全係数は、編集しない

        bar.push({
          id: col.id, title: col.title,
          M_rc: col.M_rc, M_rs: col.M_rs, M_rbs: col.M_rbs,
          V_rc: col.V_rc, V_rs: col.V_rs, V_rbc: col.V_rbc, V_rbs: col.V_rbs, V_rbv: col.V_rbv,
          T_rbt: col.T_rbt,
          ri: col.ri, range: col.range,
          pq_cellstyle: col.pq_cellstyle,
          isDefault: col.isDefault,
          NoCalc:col.NoCalc,
        });
        steel.push({
          id: col.id, title: col.title,
          S_rs: col.S_rs, S_rb: col.S_rb
        });
      }
      this.table1_datas.push(bar);
      this.table4_datas.push(steel);

      // 鉄筋材料1
      const fx = safety.material_bar[id];
      const key = ["tensionBar", "sidebar", "stirrup"];
      const title = [
        this.translate.instant("safety-factors-material-strengths.rebar_ax"),
        this.translate.instant("safety-factors-material-strengths.rebar_la"),
        this.translate.instant("safety-factors-material-strengths.stirrup")
      ];
      const table2 = [];
      for (let j = 0; j < key.length; j++) {
        const target = { title: title[j] };
        const k = key[j];
        for (let i = 0; i < fx.length; i++) {
          const current = fx[i];
          const cur = current[k];
          const k1 = "fsy" + (i + 1);
          const k2 = "fsu" + (i + 1);
          target[k1] = cur.fsy === undefined ? null : cur.fsy;
          target[k2] = cur.fsu === undefined ? null : cur.fsu;
        }
        table2.push(target);
      }
      this.table2_datas.push(table2);
      
      this.handleSetSelect(this.table2_datas[i], id)

      // 鉄骨材料
      const s1 = safety.material_steel[id][0]; // t16以下
      const s2 = safety.material_steel[id][1]; // t40以下
      const s3 = safety.material_steel[id][2]; // t40以上
      this.table5_datas.push([
        {
          title: this.translate.instant("safety-factors-material-strengths.tys"),
          SRCfsyk1: s1.fsyk,
          SRCfsyk2: s2.fsyk,
          SRCfsyk3: s3.fsyk
        },
        {
          title: this.translate.instant("safety-factors-material-strengths.sys"),
          SRCfsyk1: s1.fsvyk,
          SRCfsyk2: s2.fsvyk,
          SRCfsyk3: s3.fsvyk
        },
        {
          title: this.translate.instant("safety-factors-material-strengths.ts"),
          SRCfsyk1: s1.fsuk,
          SRCfsyk2: s2.fsuk,
          SRCfsyk3: s3.fsuk
        }
      ]);

      // コンクリート材料
      const concrete = safety.material_concrete[id];
      this.table3_datas.push([{
        title: this.translate.instant("safety-factors-material-strengths.fck"),
        value: concrete.fck
      }, {
        title: this.translate.instant("safety-factors-material-strengths.max_ca"),
        value: concrete.dmax
      }]);

      // 杭の施工条件
      this.pile_factor_list.push(safety.pile_factor[id]);

      // グリッドの設定
      this.option1_list.push({
        width: 1100,
        height: 280,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders1,
        dataModel: { data: this.table1_datas[i] },
        freezeCols: 1,
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
      });
      this.option2_list.push({
        width: 756,
        height: 200,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders2,
        dataModel: { data: this.table2_datas[i] },
        freezeCols: 1,
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
          let key = Object.keys(ui.updateList[0].newRow)
          if (key.length > 0 && key[0].includes("options")){
            let number = key[0].split("options")[1];
            let newData = ui.updateList[0].rowData
            this.handleSelect(newData, +number, ui)
          }
        }
      });
      this.option3_list.push({
        width: 550,
        height: 105,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders3,
        dataModel: { data: this.table3_datas[i] },
        freezeCols: 1,
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
      });
      this.option4_list.push({
        width: 410,
        height: 205,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders4,
        dataModel: { data: this.table4_datas[i] },
        freezeCols: 1,
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
      });
      this.option5_list.push({
        width: 570,
        height: 140,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders5,
        dataModel: { data: this.table5_datas[i] },
        freezeCols: 1,
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
      });
    }
    this.groupe_name.map((data: any) => {     
      if(this.arrayAxis.length < this.groupe_name.length) 
        this.arrayAxis.push({id: data.name, consider_moment_checked: false})
    })  

    this.groupe_name.map((data: any) => {     
      if(this.arrayAxisForce.length < this.groupe_name.length) 
        this.arrayAxisForce.push({
          id: data.name, 
          used: this.used,
          opt_no_for_v: this.opt_no_for_v,
          opt_max_min: this.opt_max_min,
          opt_tens_only: this.opt_tens_only
        })
    })  
    this.current_index = 0;
    this.options1 = this.option1_list[0];
    this.options2 = this.option2_list[0];
    this.options3 = this.option3_list[0];
    this.options4 = this.option4_list[0];
    this.options5 = this.option5_list[0];
    this.options6 = this.pile_factor_list[0];
    this.pile_factor_select_id = this.getPileFactorSelectId();
    this.safety.arrayAxis = this.arrayAxis;
    this.safety.axisforce_condition = this.arrayAxisForce;    
  }

  ngAfterViewInit() {
    this.activeButtons(0);
    this.setActiveTab(this.activeTab);
    
    let dataOfTab = this.arrayAxisForce[this.groupId];
    if(dataOfTab != undefined){
      this.used = dataOfTab.used
      this.opt_no_for_v = dataOfTab.opt_no_for_v
      this.opt_max_min = dataOfTab.opt_max_min
      this.opt_tens_only = dataOfTab.opt_tens_only
    }
  }
  ngAfterContentChecked() {
    // this.arrayAxis.map((data: any)=>{
    //   if(data.id === this.groupMem){
    //     this.consider_moment_checked = data.consider_moment_checked
    //   }
    // })
    // this.arrayAxisForce. map((data: any)=>{
    //   if(data.id === this.groupMem){
    //     this.used = data.used,
    //     this.opt_no_for_v= data.opt_no_for_v,
    //     this.opt_max_min= data.opt_max_min,
    //     this.opt_tens_only= data.opt_tens_only
    //   }
    // })
    this.cdref.detectChanges();
 }
 private applyStylesToItems(safetyFactor: any) {
  for (const key in safetyFactor) {
    if (safetyFactor.hasOwnProperty(key)) {
      const items = safetyFactor[key];
      for (const item of items) {
        // if (item.isDefault) {
 
          if (!item.pq_cellstyle) {
            item.pq_cellstyle = {};
          }
          for (const prop in item) {
            if (item.hasOwnProperty(prop) && item[prop] !== null && prop !== 'title') {
              item.pq_cellstyle[prop] = { ...this.styleColor };
            }
          }

          if (item.V_rbv === null) {
            item.pq_cellstyle.V_rbv = { ...this.style };
          }
          if (item.T_rbt === null) {
            item.pq_cellstyle.T_rbt = { ...this.style };
          }
        // }
      }
      return items
    }
  }
}
  private setTitle(): void {
    this.columnHeaders1 = [
      
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      {
        title: this.translate.instant("safety-factors-material-strengths.execute"),
        align: "center",
        dataType: "bool",
        dataIndx: "NoCalc",
        type: "checkbox",
        sortable: false,
        width: 70,
        nodrag: true,
      },
      {
        title: this.translate.instant("safety-factors-material-strengths.b_safe"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("safety-factors-material-strengths.material_coefficient"),
            align: 'center', colModel: [
            { title: this.translate.instant("safety-factors-material-strengths.γc_safe"), dataType: 'float', 'format': '#.00', dataIndx: 'M_rc', sortable: false, width: 70, nodrag: true, },
            { title: this.translate.instant("safety-factors-material-strengths.γs_safe"), dataType: 'float', 'format': '#.00', dataIndx: 'M_rs', sortable: false, width: 70, nodrag: true, },
            ]
          },
          {
            title: this.translate.instant("safety-factors-material-strengths.member_coefficient_γb"),
            align: 'center', colModel: [
              { title: this.translate.instant("safety-factors-material-strengths.γbs"), dataType: 'float', 'format': '#.00', dataIndx: 'M_rbs', sortable: false, width: 70, nodrag: true, }
            ]
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("safety-factors-material-strengths.s_safe"),
        align: 'center', colModel: [
           {
              title: this.translate.instant("safety-factors-material-strengths.t_safe1"),
              align: 'center', colModel: [
                { title:  this.translate.instant("safety-factors-material-strengths.γc_safe"), dataType: 'float', 'format': '#.00', dataIndx: 'V_rc', sortable: false, width: 70, nodrag: true, },
                { title: this.translate.instant("safety-factors-material-strengths.γs_safe"), dataType: 'float', 'format': '#.00', dataIndx: 'V_rs', sortable: false, width: 70, nodrag: true, },
              ],
              nodrag: true,
          },
          {
            title: this.translate.instant("safety-factors-material-strengths.t_safe2"),
            align: 'center', colModel: [
              { title: 'Vcd, Vod,Vwcd', dataType: 'float', 'format': '#.00', dataIndx: 'V_rbc', sortable: false, width: 70, nodrag: true, },
              { title: 'Vcd, Vod,Vwcd', dataType: 'float', 'format': '#.00', dataIndx: 'V_rbs', sortable: false, width: 70, nodrag: true, },
              { title: 'Vdd', dataType: 'float', 'format': '#.00', dataIndx: 'V_rbv', sortable: false, width: 70, nodrag: true, },
              { title: 'Mtcd, Mtyd,Mtcud', dataType: 'float', 'format': '#.00', dataIndx: 'T_rbt', sortable: false, width: 70, nodrag: true, }
            ],
            nodrag: true,
          },
        ],
        nodrag: true,
      },
      // {
      //   title: this.translate.instant("safety-factors-material-strengths.t_safe"),
      //   align: 'center', colModel: [
      //   ],
      //   nodrag: true,
      // },
      {
        title: this.translate.instant("safety-factors-material-strengths.γi"),
        dataType: 'float', 'format': '#.00', dataIndx: 'ri', sortable: false, width: 70, nodrag: true,
      },
      {
        title: this.translate.instant("safety-factors-material-strengths.rsb_arr") + 
        `<div id="safety-question" style="cursor:pointer"><svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-left: 6px;">
        <path d="M2.49023 14.5098C4.1504 16.1699 6.15363 17 8.5 17C10.8464 17 12.8496 16.1699 14.5098 14.5098C16.1699 12.8496 17 10.8464 17 8.5C17 6.15363 16.1699 4.1504 14.5098 2.49023C12.8496 0.83007 10.8464 0 8.5 0C6.15363 0 4.1504 0.83007 2.49023 2.49023C0.83007 4.1504 0 6.15363 0 8.5C0 10.8464 0.83007 12.8496 2.49023 14.5098ZM8.5 2.125C9.67318 2.125 10.6748 2.46256 11.5049 3.1377C12.335 3.81283 12.75 4.78124 12.75 6.04297C12.75 7.63673 11.9753 8.85416 10.4258 9.69531C10.2044 9.80599 10.0052 9.96094 9.82812 10.1602C9.65104 10.3594 9.5625 10.5143 9.5625 10.625C9.5625 10.9128 9.45736 11.1618 9.24707 11.3721C9.03678 11.5824 8.78776 11.6875 8.5 11.6875C8.21224 11.6875 7.96322 11.5824 7.75293 11.3721C7.54264 11.1618 7.4375 10.9128 7.4375 10.625C7.4375 10.0273 7.64778 9.4795 8.06836 8.98145C8.48893 8.4834 8.93164 8.10156 9.39648 7.83594C10.2155 7.39323 10.625 6.79558 10.625 6.04297C10.625 4.84765 9.91667 4.25 8.5 4.25C7.92448 4.25 7.42643 4.43815 7.00586 4.81445C6.58528 5.19076 6.375 5.722 6.375 6.4082C6.375 6.69597 6.26986 6.94499 6.05957 7.15527C5.84928 7.36556 5.60026 7.4707 5.3125 7.4707C5.02474 7.4707 4.77572 7.36556 4.56543 7.15527C4.35514 6.94499 4.25 6.69597 4.25 6.4082C4.25 5.08007 4.68164 4.03418 5.54492 3.27051C6.40821 2.50683 7.39322 2.125 8.5 2.125ZM9.26367 14.6094C9.06445 14.8086 8.8099 14.9082 8.5 14.9082C8.1901 14.9082 7.93001 14.8031 7.71973 14.5928C7.50944 14.3825 7.4043 14.1279 7.4043 13.8291C7.4043 13.5303 7.50944 13.2702 7.71973 13.0488C7.93001 12.8275 8.1901 12.7168 8.5 12.7168C8.8099 12.7168 9.06999 12.8275 9.28027 13.0488C9.49056 13.2702 9.5957 13.5303 9.5957 13.8291C9.5957 14.1279 9.48503 14.388 9.26367 14.6094Z" fill="#00C95F"/>
        </svg></div>`,
        dataIndx: 'range', sortable: false, width: 100, nodrag: true,paste: false, 
        cls: 'pq-drop-icon pq-side-icon',
            editor:{
              type: 'select',
              options:this.rangeArray,
              labelIndx: 'text',
              valueIndx: 'id',
            },
            render: (ui) => {
              return (this.range[ui.cellData] || {}).text;
            }, 
      },
    ];

    // 鉄筋材料強度
    this.columnHeaders2 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      {
        title: this.translate.instant("safety-factors-material-strengths.rbmt"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("safety-factors-material-strengths.d25"),
            dataIndx: 'options1', sortable: false, width: 112, nodrag: true, paste: false, 
            cls: 'pq-drop-icon pq-side-icon',
            editor:{
              type: 'select',
              options:this.optionsArray,
              labelIndx: 'text',
              valueIndx: 'id',
            },
            render: (ui) => {
              return (this.options[ui.cellData] || {}).text;
            }, 
          },
          
          {
            title: this.translate.instant("safety-factors-material-strengths.d29"),
            dataIndx: 'options2', sortable: false, width: 112, nodrag: true, paste: false, 
            cls: 'pq-drop-icon pq-side-icon',
            editor: {
              type: 'select',
              options: this.optionsArray,
              labelIndx: 'text',
              valueIndx: 'id',
            }, 
            render: (ui) => {
              return (this.options[ui.cellData] || {}).text;
            },
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("safety-factors-material-strengths.ys"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("safety-factors-material-strengths.d25"),
            dataType: 'float', dataIndx: 'fsy1', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("safety-factors-material-strengths.d29"),
            dataType: 'float', dataIndx: 'fsy2', sortable: false, width: 70, nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("safety-factors-material-strengths.dts"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("safety-factors-material-strengths.d25"),
            dataType: 'float', dataIndx: 'fsu1', sortable: false, width: 70, nodrag: true,
          },
          {
            title: this.translate.instant("safety-factors-material-strengths.d29"),
            dataType: 'float', dataIndx: 'fsu2', sortable: false, width: 70, nodrag: true,
          }
        ],
        nodrag: true,
      },
    ];

    // コンクリート材料強度
    this.columnHeaders3 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 390, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      { title: '', dataType: 'float', dataIndx: 'value', sortable: false, width: 140, nodrag: true, },
    ];

    // 鉄骨 - 安全係数
    this.columnHeaders4 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      { title: 'γs', dataType: 'float', 'format': '#.00', dataIndx: 'S_rs', sortable: false, width: 70, nodrag: true, },
      { title: 'γb', dataType: 'float', 'format': '#.00', dataIndx: 'S_rb', sortable: false, width: 70, nodrag: true, }
    ];

    // 鉄骨材料強度
    this.columnHeaders5 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      { title: 't≦16', dataType: 'float', dataIndx: 'SRCfsyk1', sortable: false, width: 100, nodrag: true, },
      { title: '16＜t≦40', dataType: 'float', dataIndx: 'SRCfsyk2', sortable: false, width: 100, nodrag: true, },
      { title: '40＜t≦75', dataType: 'float', dataIndx: 'SRCfsyk3', sortable: false, width: 100, nodrag: true, }
    ];

  }

  ngOnDestroy(): void {
    this.saveData();
    this.checkedRadioSubscription.unsubscribe();
  }
  public saveData(): void {
    const safety_factor = {};
    const material_bar = {};
    const material_steel = {};
    const material_concrete = {};
    const pile_factor = {};

    for (let i = 0; i < this.groupe_list.length; i++) {
      const groupe = this.groupe_list[i];
      const first = groupe[0];
      const id = first.g_id;

      // 安全係数
      const safety_bar = this.table1_datas[i];
      const safety_steel = this.table4_datas[i];
      const factor = [];
      for (let j = 0; j < safety_bar.length; j++) {
        const bar = safety_bar[j], steel = safety_steel[j];
        factor.push({
          id: bar.id, title: bar.title,
          M_rc: bar.M_rc, M_rs: bar.M_rs, M_rbs: bar.M_rbs,
          V_rc: bar.V_rc, V_rs: bar.V_rs, V_rbc: bar.V_rbc, V_rbs: bar.V_rbs, V_rbv: bar.V_rbv,
          T_rbt: bar.T_rbt,
          ri: bar.ri, range: bar.range,
          S_rs: steel.S_rs, S_rb: steel.S_rb,
          NoCalc : bar.NoCalc,
        })
      }
      safety_factor[id] = factor;

      // 鉄筋材料
      const bar = this.table2_datas[i];
      material_bar[id] = [{
        tensionBar: { id:+bar[0].options1, fsy: bar[0].fsy1, fsu: bar[0].fsu1 },
        sidebar: { id: +bar[1].options1, fsy: bar[1].fsy1, fsu: bar[1].fsu1 },
        stirrup: { id: +bar[2].options1, fsy: bar[2].fsy1, fsu: bar[2].fsu1 }
      },
      {
        tensionBar: { id: +bar[0].options2, fsy: bar[0].fsy2, fsu: bar[0].fsu2 },
        sidebar: { id: +bar[1].options2, fsy: bar[1].fsy2, fsu: bar[1].fsu2 },
        stirrup: { id: +bar[2].options2, fsy: bar[2].fsy2, fsu: bar[2].fsu2 }
      }];

      // 鉄骨材料
      const steel = this.table5_datas[i];
      material_steel[id] = [
        {
          fsyk: steel[0].SRCfsyk1,
          fsvyk: steel[1].SRCfsyk1,
          fsuk: steel[2].SRCfsyk1,
        },
        {
          fsyk: steel[0].SRCfsyk2,
          fsvyk: steel[1].SRCfsyk2,
          fsuk: steel[2].SRCfsyk2,
        },
        {
          fsyk: steel[0].SRCfsyk3,
          fsvyk: steel[1].SRCfsyk3,
          fsuk: steel[2].SRCfsyk3,
        }
      ];

      // コンクリート材料
      const conc = this.table3_datas[i];
      material_concrete[id] = {
        fck: conc[0].value,
        dmax: conc[1].value
      }

      // 杭の施工条件
      pile_factor[id] = this.pile_factor_list[i];
    }
    this.safety.setTableColumns({
      safety_factor,
      material_bar,
      material_steel,
      material_concrete,
      pile_factor
    })
    this.safety.arrayAxis = this.arrayAxis
    this.safety.axisforce_condition = this.arrayAxisForce
  }

  // 杭の施工条件を変更を処理する関数
  public setPileFactor(j: number): void {
    const i = this.current_index;
    const pile = this.pile_factor_list[i];
    for (let k = 0; k < pile.length; k++) {
      pile[k].selected = (j === k) ? true : false;
    }
    this.pile_factor_select_id = this.getPileFactorSelectId();
  }
  private getPileFactorSelectId(): string {
    const id = this.current_index
    const options6 = this.pile_factor_list[id];
    const result = options6.find((v) => v.selected === true);
    return result.id;
  }

  public activePageChenge(id: number, group: any): void {
    this.groupMem=group.name;
    this.groupId=group.id;
    this.activeButtons(id);
    this.current_index = id;    
    // this.arrayAxis.map((data: any)=>{
    //   if(data.id === group.name){
    //     this.consider_moment_checked = data.consider_moment_checked
    //   }
    // })
   
    let dataOfTab = this.arrayAxisForce[group.id];
    this.used = dataOfTab.used
      this.opt_no_for_v = dataOfTab.opt_no_for_v
      this.opt_max_min = dataOfTab.opt_max_min
      this.opt_tens_only = dataOfTab.opt_tens_only
 
          this.consider_moment_checked  =  this.used
          this.not_consider_moment_checked = !this.used
      
    this.considerMomentChecked = !this.used;
    this.options1 = this.option1_list[id];
    this.grid1.options = this.options1;
    this.grid1.refreshDataAndView();

    this.options2 = this.option2_list[id];
    this.handleSetSelect(this.options2.dataModel.data, group.id)
    this.grid2.options = this.options2;
    this.grid2.refreshDataAndView();

    this.options3 = this.option3_list[id];
    this.grid3.options = this.options3;
    this.grid3.refreshDataAndView();

    this.options4 = this.option4_list[id];
    this.grid4.options = this.options4;
    this.grid4.refreshDataAndView();

    this.options5 = this.option5_list[id];
    this.grid5.options = this.options5;
    this.grid5.refreshDataAndView();

    this.options6 = this.pile_factor_list[id];
    this.pile_factor_select_id = this.getPileFactorSelectId();
  }


  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.groupe_name.length; i++) {
      const data = document.getElementById("saf" + i);
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
  }
  changeButton(el: any) {   
    
    if (el.target.checked && el.target.id !== "not_consider"){
      this.showOption= true;
      this.used= true;     
      this.not_consider_moment_checked = false;
      this.considerMomentChecked =false;
    }      
    else if (el.target.checked && el.target.id === "not_consider") {      
      this.consider_moment_checked = false;
      this.used= false;
      this.opt_max_min= false;
      this.opt_tens_only = false;
      this.opt_no_for_v= false;
      this.considerMomentChecked =true;
    }
    if(this.groupId != undefined){
      let data = this.arrayAxisForce[this.groupId];
        data.used = this.used,
        data.opt_no_for_v = this.opt_no_for_v,
        data.opt_max_min= this.opt_max_min,
        data.opt_tens_only= this.opt_tens_only
    }
  }
  changeOption(el: any){
    switch(el.target.id){
      case "1":
        this.opt_max_min = el.target.checked
        break;
      case "2":
        this.opt_tens_only = el.target.checked
        break;
      case "3":
        this.opt_no_for_v = el.target.checked
        break;
    }
    let data = this.arrayAxisForce[this.groupId];
        data.used = this.used,
        data.opt_no_for_v = this.opt_no_for_v,
        data.opt_max_min= this.opt_max_min,
        data.opt_tens_only= this.opt_tens_only
    this.safety.arrayAxis = this.arrayAxisForce;   
  }
  notConsider(e:any){
    this.considerMomentChecked =true;
    this.used= false;
    this.opt_max_min= false;
    this.opt_tens_only = false;
    this.opt_no_for_v= false;
  }
  handleSetSelect(dataTable:any,id:any){
    const safety = this.safety.getTableColumns();
    const fx = safety.material_bar[id];
    dataTable.forEach((data: any) => {
      this.setEdit(data, true)
      for (let i = 0; i < fx.length; i++) {
        const k1 = "fsy" + (i + 1);
        const k2 = "fsu" + (i + 1);
        data[`options${i + 1}`] = 0;
        if (data[k1] === null && data[k2] === null) {
          data[`options${i + 1}`] = "2"
          data[k1] = 345
          data[k2] = 490
        }
        if (data[k1] === 295 && data[k2] === 440 || data[k1] === 295 && data[k2] === null || data[k1] === null && data[k2] === 440) {
          data[`options${i + 1}`] = "1"
          this.setEdit(data, false, k1,k2)
          data[k1] = 295
          data[k2] = 440
        }
        if (data[k1] === 345 && data[k2] === 490 || data[k1] === 345 && data[k2] === null || data[k1] === null && data[k2] === 490) {
          data[`options${i + 1}`] = "2"
          this.setEdit(data, false, k1,k2)
          data[k1] = 345
          data[k2] = 490
        }
        if (data[k1] === 390 && data[k2] === 560 || data[k1] === 390 && data[k2] === null || data[k1] === null && data[k2] === 560) {
          data[`options${i + 1}`] = "3"
          this.setEdit(data, false, k1,k2)
          data[k1] = 390
          data[k2] = 560
        }
        if (data[k1] === 490 && data[k2] === 620 || data[k1] === 490 && data[k2] === null || data[k1] === null && data[k2] === 620) {
          data[`options${i + 1}`] = "4"
          this.setEdit(data, false, k1,k2)
          data[k1] = 490
          data[k2] = 620
        }
        if (+data[`options${i + 1}`] === 0) {
          if (data[k1] === null) {
            data[k1] = 0
          }
          if (data[k2] === null) {
            data[k2] = 0
          }
        }
      }
    }) 
       
  }
  setEdit(data:any, checkEdit:boolean, k1?:any,k2?:any){
    if (checkEdit){
      data.pq_cellstyle = {
        fsy1: { ...this.styleEdit },
        fsy2: { ...this.styleEdit },
        fsu1: { ...this.styleEdit },
        fsu2: { ...this.styleEdit }
      }
      data.pq_cellprop = {
        fsy1: { ...this.propEdit },
        fsy2: { ...this.propEdit },
        fsu1: { ...this.propEdit },
        fsu2: { ...this.propEdit }
      }
    }else{ 
      data.pq_cellstyle = {
        ...data.pq_cellstyle,
        [k1]: { ...this.styleNoEdit },
        [k2]: { ...this.styleNoEdit },
      }
      data.pq_cellprop = {
        ...data.pq_cellprop,
        [k1]: { ...this.propNoEdit },
        [k2]: { ...this.propNoEdit },
      }
    }
  }
  handleSelect(newData: any, numberCell:any,ui:any){
    let fsy = "fsy" + numberCell
    let fsu = "fsu" + numberCell
    if (+ui.updateList[0].newRow[`options${numberCell}`] === 0) {
      newData.pq_cellstyle = {
        ...newData.pq_cellstyle,
        [fsy]: { ...this.styleEdit },
        [fsu]: { ...this.styleEdit },
      }
      newData.pq_cellprop = {
        ...newData.pq_cellprop,
        [fsy]: { ...this.propEdit },
        [fsu]: { ...this.propEdit },
      }
    } else {
      newData.pq_cellstyle = {
        ...newData.pq_cellstyle,
        [fsy]: { ...this.styleNoEdit },
        [fsu]: { ...this.styleNoEdit },
      }
      newData.pq_cellprop = {
        ...newData.pq_cellprop,
        [fsy]: { ...this.propNoEdit },
        [fsu]: { ...this.propNoEdit },
      }
      if (+ui.updateList[0].newRow[`options${numberCell}`] === 1) {
        newData[fsy] = 295
        newData[fsu] = 440
      }
      if (+ui.updateList[0].newRow[`options${numberCell}`] === 2) {
        newData[fsy] = 345
        newData[fsu] = 490
      }
      if (+ui.updateList[0].newRow[`options${numberCell}`] === 3) {
        newData[fsy] = 390
        newData[fsu] = 560
      }
      if (+ui.updateList[0].newRow[`options${numberCell}`] === 4) {
        newData[fsy] = 490
        newData[fsu] = 620
      }
    }
  }
}
