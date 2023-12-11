


import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { InputMembersService } from '../members/members.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { InputMaterialStrengthVerificationConditionService } from './material-strength-verification-conditions.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';


@Component({
  selector: 'app-material-strength',
  templateUrl: './material-strength-verification-conditions.component.html',
  styleUrls: ['./material-strength-verification-conditions.component.scss', '../subNavArea.scss']
})

export class MaterialStrengthVerificationConditionComponent implements OnInit {
  public groupe_name: string[];
  public activeTab: string = 'rsb_con';
  private current_index: number;
  private groupe_list: any[];
  public fck: any;

  public groupMem: any;
  @ViewChild('grid1') grid1: SheetComponent;
  public options1: pq.gridT.options;
  private option1_list: pq.gridT.options[] = new Array();
  private columnHeaders1: object[] = [];
  private table1_datas: any[];
  @ViewChild('grid2') grid2: SheetComponent;
  public options2: pq.gridT.options;
  private option2_list: pq.gridT.options[] = new Array();
  private columnHeaders2: object[] = [];
  private table2_datas: any[];

  public options3: any[];
  public component_list: any[] = new Array();
  public component_select_id: string;

 public options4: any[];
  private option4_list: any[] = new Array();

  public options5: any[];
  public other_list: any[] = new Array();
 
  

  constructor(
    private material: InputMaterialStrengthVerificationConditionService,
    private members: InputMembersService,
    private translate: TranslateService,
  ) { }

  ngOnInit() {
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.saveData();
      this.onInitData();
    });
    this.onInitData();
  }
  onInitData(){
    this.setTitle()
    const material = this.material.getTableColumns();
    this.table1_datas = new Array();
    this.component_list = new Array();
    this.option1_list = new Array();
    this.option2_list = new Array();
    this.option4_list =new Array();
    this.other_list= new Array();
    this.table2_datas = new Array();
    this.groupe_name = new Array();
    this.groupe_list = material.groupe_list;
   
    for (let i = 0; i < material.groupe_list.length; i++) {
      const groupe = material.groupe_list[i];
      const first = groupe[0];
      const id = first.g_id;
      this.groupe_name.push(this.members.getGroupeName(i));
      const fx = material.material_bar[id];
      const key = ["tensionBar", "sidebar", "stirrup"];
      const title = [
        this.translate.instant("material-strength-verifiaction-condition.rebar_ax"),
        this.translate.instant("material-strength-verifiaction-condition.rebar_la"),
        this.translate.instant("material-strength-verifiaction-condition.stirrup")
      ];
      const table1 = [];
      for (let j = 0; j < key.length; j++) {
        const target = { title: title[j] };
        const k = key[j];
        for (let i = 0; i < fx.length; i++) {
          const current = fx[i];
          const cur = current[k];
          const k1 = "fsy" + (i + 1);
          const k2 = "fsu" + (i + 1);
          target[k1] = cur.fsy;
          target[k2] = cur.fsu;
        }
        table1.push(target);
      }
      this.table1_datas.push(table1);
      const concrete = material.material_concrete[id];
      this.table2_datas.push([{
        title: this.translate.instant("material-strength-verifiaction-condition.fck"),
        value: concrete.fck
      }, {
        title: this.translate.instant("material-strength-verifiaction-condition.max_ca"),
        value: concrete.dmax
      }]);

      this.component_list.push(material.component[id]);
      this.other_list.push(material.other[id]);   
      const verification = material.verification[id];   
      this.option4_list.push(verification);     

      this.option1_list.push({
        width: 650,
        height: 180,
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
        width: 550,
        height: 105,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders2,
        dataModel: { data: this.table2_datas[i] },
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
        change: (evt, ui) => {
        this.fck= this.table2_datas[0][0].value;
        }
      });

    }
    this.current_index = 0;
    this.options1 = this.option1_list[0];
    this.options2 = this.option2_list[0];
    this.options3 = this.component_list[0]
    this.component_select_id = this.getComponentSelectId();
    this.options4 = this.option4_list[0];
    this.options5 = this.other_list[0];
    this.fck = this.table2_datas.length>0?this.table2_datas[0][0].value: 0;
   
  }
  ngOnDestroy(): void {
    //throw new Error('Method not implemented.');
    this.saveData();
  }
  public setActiveTab(tab: string) {
    this.activeTab = tab;  
    const i = this.current_index;    
    this.fck = this.table2_datas.length>0?this.table2_datas[i][0].value: 0;
  }
  public saveData(): void {    
    const material_bar = {};
    const component = {};
    const verification ={};
    const other = {};
    const material_concrete = {};
    for (let i = 0; i < this.groupe_list.length; i++) {
      const groupe = this.groupe_list[i];
      const first = groupe[0];
      const id = first.g_id;        
      component[id] = this.component_list[i];   
      const bar = this.table1_datas[i]; 
      material_bar[id] = [{
        tensionBar: { fsy: bar[0].fsy1, fsu: bar[0].fsu1 },
        sidebar: { fsy: bar[1].fsy1, fsu: bar[1].fsu1 },
        stirrup: { fsy: bar[2].fsy1, fsu: bar[2].fsu1 }
      },
      {
        tensionBar: { fsy: bar[0].fsy2, fsu: bar[0].fsu2 },
        sidebar: { fsy: bar[1].fsy2, fsu: bar[1].fsu2 },
        stirrup: { fsy: bar[2].fsy2, fsu: bar[2].fsu2 }
      }];

      const conc = this.table2_datas[i];
      material_concrete[id] = {
        fck: conc[0].value,
        dmax: conc[1].value
      }
      verification[id] = this.option4_list[i];
      other[id] =  this.other_list[i];
    }
    this.material.setTableColumns({
      material_bar,
      material_concrete,
      component,
      verification,
      other
    })

  }
  ngAfterViewInit(): void {
    this.activeButtons(0);
    this.setActiveTab(this.activeTab)
  }
  private setTitle(): void {
    this.columnHeaders1 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, frozen: true, sortable: false, width: 250, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      {
        title: this.translate.instant("material-strength-verifiaction-condition.ys"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("material-strength-verifiaction-condition.d25"),
            dataType: 'float', dataIndx: 'fsy1', sortable: false, width: 90, nodrag: true,
          },
          {
            title: this.translate.instant("material-strength-verifiaction-condition.d29"),
            dataType: 'float', dataIndx: 'fsy2', sortable: false, width: 100, nodrag: true,
          }
        ],
        nodrag: true,
      },
      {
        title: this.translate.instant("material-strength-verifiaction-condition.dts"),
        align: 'center', colModel: [
          {
            title: this.translate.instant("material-strength-verifiaction-condition.d25"),
            dataType: 'float', dataIndx: 'fsu1', sortable: false, width: 90, nodrag: true,
          },
          {
            title: this.translate.instant("material-strength-verifiaction-condition.d29"),
            dataType: 'float', dataIndx: 'fsu2', sortable: false, width: 100, nodrag: true,
          }
        ],
        nodrag: true,
      },
    ];
    this.columnHeaders2 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 390, nodrag: true, style: { 'background': '#373e45' }, styleHead: { 'background': '#373e45' } },
      { title: '', dataType: 'float', dataIndx: 'value', sortable: false, width: 140, nodrag: true, },
    ];
  }
  public setComponent(j: number): void {
    const i = this.current_index;
    const component = this.component_list[i];
    for (let k = 0; k < component.length; k++) {
      component[k].selected = (j === k) ? true : false;
    }
    this.component_select_id = this.getComponentSelectId();
  }
  public setCheckboxPlastic(j: number): void {
    const i = this.current_index;
    const plastic = this.option4_list[i];
    const element = plastic[j];     
    element.selected = !element.selected
  }
  private getComponentSelectId(): string {
    const id = this.current_index;
    let result:any = []
    const options3 = this.component_list[id];
   if(options3){
     result = options3.find((v) => v.selected === true);
   }
    return result.id;
  }
  handleCheck(event:any,item:any, type){
    const id = this.current_index
    if(type==="component"){
      this.component_list[id].forEach((data:any)=>{
        if(data.id === item.id){
          data.selected = event.target.checked
        }
       })
    }
    if(type==="other"){
      this.other_list[id].forEach((data:any)=>{
        if(data.id === item.id){
          data.selected = event.target.checked
        }
       })
    }
  }
  setLevel(j: number, event: any){
    const i = this.current_index;
    const plastic = this.option4_list[i];
    const element = plastic[j];  
    element.type = event.target.value;
  }
  public activePageChenge(id: number, group: any): void {
    this.groupMem = group;
    this.activeButtons(id);
    this.current_index = id;

    this.options1 = this.option1_list[id];
    this.grid1.options = this.options1;
    this.grid1.refreshDataAndView();

    this.options2 = this.option2_list[id];
    this.grid2.options = this.options2;
    this.grid2.refreshDataAndView();

    this.options3 = this.component_list[id];
    this.component_select_id = this.getComponentSelectId();

    this.options5= this.other_list[id]

    this.options4 = this.option4_list[id]
    this.fck = this.table2_datas[id][0].value;  
  }
  private activeButtons(id: number) {
    for (let i = 0; i <= this.groupe_name.length; i++) {
      const data = document.getElementById("mat" + i);
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
