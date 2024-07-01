import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import pq from 'pqgrid';
import { TranslateService } from "@ngx-translate/core";
import { NONE_TYPE } from '@angular/compiler';
import { InputBarsService } from '../bars/bars.service';
import { create } from 'domain';
import { InputMembersService } from '../members/members.service';
import { SheetComponent } from '../sheet/sheet.component';
import { ViewChild } from '@angular/core';
import { ThreeNodeService } from '../three/geometry/three-node.service';
import { SceneService } from '../three/scene.service';
import { data } from 'jquery';
import { ThreeTshapeService } from '../three/geometry/three-tshape.service';
import { ThreeOvalService } from '../three/geometry/three-oval.service';
import { ThreeCircleService } from '../three/geometry/three-circle.service';

@Component({
  selector: 'app-preview-rebar',
  templateUrl: './preview-rebar.component.html',
  styleUrls: ['./preview-rebar.component.scss', '../subNavArea.scss']
})
export class PreviewRebarComponent implements OnInit, OnChanges {
  public axialRebarOptions: pq.gridT.options;
  public stirrupOptions: pq.gridT.options;
  public calculatedPointOptions: pq.gridT.options;

  private option_list: pq.gridT.options[] = new Array();
  private axialHeaders: object[] = new Array();
  private stirrupHeaders: object[] = new Array();
  private calculatedPointHeaders: object[] = new Array();
  private table_datas_axial: any[] = [];
  private table_datas_stirrup: any[] = [];
  private table_datas_cal_point: any[] = [];
  public typeView: any
  public member: any
  public style = { "pointer-events": "none", "background": "linear-gradient(to left top, transparent 0%, transparent 50.5%, gray 52.5%, transparent 54.5%, transparent 100%)", "font-size": "0" }
  public styleShaded1 = {
    distance_side: {...this.style} 
  }
  public styleShaded2 = {
    distance_top : {...this.style},
    side_cover : {...this.style}
  }
  public styleShaded3 = {
    haunch : {...this.style}
  }

  public prop = { edit: false, show: false }
  public propShaded1 = {
    distance_side: {...this.prop}
  }
  public propShaded2 = {
    distance_top : {...this.prop},
    side_cover : {...this.prop}
  }
  public propShaded3 = {
    haunch : {...this.prop}
  }

  @Input() rebar: any
  @ViewChild('calPointGrid') grid: SheetComponent;
  @ViewChild('axialGrid') axialGrid : SheetComponent;
  @ViewChild('stirrupGrid') stirrupGrid : SheetComponent;

  constructor(
    public bars: InputBarsService,
    private translate: TranslateService,
    private members: InputMembersService,
    private threeNode: ThreeNodeService,
    private threeTRShape: ThreeTshapeService,
    private threeOval: ThreeOvalService,
    private threeCircle: ThreeCircleService,
    private scene: SceneService,
  ) { }

  ngOnChanges(obj: SimpleChanges): void {
    if (Object.keys(obj.rebar.currentValue).length > 0 || obj.rebar.currentValue === undefined) {
      this.rebar = {
        rebarList: obj.rebar.currentValue.rebarList,
        selectedCalPoint: obj.rebar.currentValue.selectedCalPoint,
        table_data: obj.rebar.currentValue.table_data
      }
    } else {
      this.rebar = {};
      this.typeView = ""
    }
    this.displayPreview();
    this.drawPreview()
  }

  ngOnInit() {
    this.displayPreview();   
    this.drawPreview()
  }
  private OrderByRebarType(rebar0: any){
    let arrUp: any[] = []
    let arrLa: any[] = []
    let arrLo: any[] = []
    let arrNew: any[] = []
    const member = this.member;
    switch(this.typeView){
      case 1: case 2:{
        rebar0.map((data) => {
          if(data.rebar_type == 0){
            arrUp.push(data)
          }
          if(data.rebar_type == 4){
            arrLa.push(data)
          }
          if(data.rebar_type == 1){
            arrLo.push(data)
          }          
        })
        arrUp.sort((a,b)=> a.dis_top- b.dis_top)
        arrLa.sort((a,b)=> a.dis_top- b.dis_top)
        arrLo.sort((a,b)=> a.dis_top- b.dis_top)
        arrNew = [...arrUp, ...arrLa, ...arrLo]
        break;
      }     
      case 4: {
        if(member.B > member.H){
          rebar0.map((data) => {
            if(data.rebar_type == 0){
              arrUp.push(data)
            }
            if(data.rebar_type == 5){
              arrLa.push(data)
            }
            if(data.rebar_type == 1){
              arrLo.push(data)
            }          
          })
        }else{
          rebar0.map((data) => {
            if(data.rebar_type == 2){
              arrUp.push(data)
            }
            if(data.rebar_type == 6){
              arrLa.push(data)
            }
            if(data.rebar_type == 3){
              arrLo.push(data)
            }          
          })
        }    
        arrUp.sort((a,b)=> a.dis_top- b.dis_top)
        arrLa.sort((a,b)=> a.dis_top- b.dis_top)
        arrLo.sort((a,b)=> a.dis_top- b.dis_top)   
        arrNew = [...arrUp, ...arrLa, ...arrLo]
        break;
      }    
      default: 
        arrNew = rebar0;        
        break;
    }  
    return arrNew;
  }
  private displayPreview(newRebar? : any, changeCalPoint : boolean = false) {
    var axialRebarData = [];
    var stirrupData = [];
    var calPointListData = [];
    const upperside = this.translate.instant("preview_rebar.upper_side");
    const lowerside = this.translate.instant("preview_rebar.lower_side");
    const lateral = this.translate.instant("preview_rebar.lateral_rebar");    
    let calPoint =  this.rebar.selectedCalPoint; 

    if (Object.keys(this.rebar).length != 0) {
      this.rebar.selectedCalPoint = newRebar !== undefined ? newRebar : this.rebar.selectedCalPoint;
      let calPoint =  this.rebar.selectedCalPoint; 
      const member = this.members.getData(calPoint.m_no != "" ? calPoint.m_no : this.rebar.table_data[0].m_no)
      this.member = member;
      this.table_datas_axial = new Array();
      this.table_datas_stirrup = new Array();
      this.table_datas_cal_point = new Array();

      this.typeView = calPoint.input_mode === 1 ? member.shape  : "" 

      // new data
      if (calPoint.rebar0.length > 0)  {        
        calPoint.rebar0 = this.typeView == 3? calPoint.rebar0 : this.OrderByRebarType(calPoint.rebar0);        
        for (let i = 0; i < calPoint.rebar0.length; i++) {
          let rebar = calPoint.rebar0[i];
          let rebar_type = "";
          switch (rebar.rebar_type) {
            case 0: 
              rebar_type = upperside;
              break;
            case 1: 
              rebar_type = lowerside;
              break;
            case 2: 
              rebar_type = upperside;
              break;
            case 3: 
              rebar_type = lowerside;
              break;
            case 4: 
              rebar_type = lateral;
              break;
            case 5: 
              rebar_type = lateral;
              break;
            case 6: 
              rebar_type = lateral;
              break;
            case 7: 
              rebar_type = lowerside; // todo: change when have correct data
              break;
          }
          axialRebarData.push({
            rebar_type: rebar_type,
            rebar_dia: rebar.dia === null ? "null" : rebar.dia,
            num: rebar.quantity,
            distance_top: rebar.dist_top,
            side_cover: rebar.dist_side,
            interval: rebar.interval,
            distance_side: rebar.dist_side,
          }) 
          if(this.typeView === 4){
            axialRebarData.forEach((data: any)=> {
              if (member.B < member.H) { 
                if (data.rebar_type === upperside || data.rebar_type === lowerside) {
                  data.pq_cellstyle = this.styleShaded2;
                  data.pq_cellprop = this.propShaded2;
                } else if (data.rebar_type === lateral) {
                  data.pq_cellstyle = this.styleShaded1;
                  data.pq_cellprop = this.propShaded1;
                } 
              } else {
                if (data.rebar_type === upperside || data.rebar_type === lowerside) {
                  data.pq_cellstyle = this.styleShaded1;
                  data.pq_cellprop = this.propShaded1;
                } else if (data.rebar_type === lateral) {
                  data.pq_cellstyle = this.styleShaded2;
                  data.pq_cellprop = this.propShaded2;
                } 
              } 
            })
          }
          
        }
      }  


      
      // Stirrup Data
      const stirrup = calPoint.rebar0.length >0 ?calPoint.stirrup: null;
      if (stirrup) {
        stirrupData.push({
          stirrup_dia: stirrup.stirrup_dia == null ? "null" : stirrup.stirrup_dia,
          stirrup_n: stirrup.stirrup_n,
          stirrup_ss: stirrup.stirrup_ss,
        })
      }
      // Calculation Point List Data
      const calPointList = this.rebar.rebarList;
      let m_no = calPointList[0].m_no;

      for (const point of calPointList) {
        if (point.index) {
          if (point.m_no !== "") {
            m_no = point.m_no;
          } else {
            point.m_no = m_no
          }
          if (calPoint.index === point.index) {
            calPointListData.push({
              no: point.m_no,
              pos: point.position,
              p_name: point.p_name,
              haunch: point.haunch_M, 
              pq_rowcls: "pq-state-select ui-state-highlight",
              pq_cellcls: {
                "no" : "pq-focus"
              }
            })
          } else {
            calPointListData.push({
              no: point.m_no,
              pos: point.position,
              p_name: point.p_name,
              haunch: point.haunch_M 
            })
          }
        }
      }
      

      calPointListData.forEach((data: any)=> {
        if (this.typeView === 3 || this.typeView === 4) {
          data.pq_cellstyle = this.styleShaded3;
          data.pq_cellprop = this.propShaded3;
        } 
      })
      this.table_datas_cal_point.push(calPointListData);
    }
    if (calPoint != undefined && axialRebarData.length <= 30){
      let pushAxialRebarData = Array.from({ length: 30 - axialRebarData.length }, (i) => ({
          distance_side: null,
          distance_top: null,
          interval: null,
          num: null,
          pq_ri: i,
          rebar_type: this.typeView == 3 ? 7 : "",
          rebar_dia: "null",
          side_cover: null,
        }));
        axialRebarData = [...axialRebarData, ...pushAxialRebarData];
    }
    this.table_datas_axial.push(axialRebarData);

    if (calPoint != undefined && stirrupData.length <= 1){
      let pushStirrupData = Array.from({ length: 1 - stirrupData.length }, (i) => ({
          stirrup_dia: "null",
          stirrup_n : null,
          stirrup_ss: null,
          pq_ri: i
        }));
        stirrupData = [...stirrupData, ...pushStirrupData];
    }
    this.table_datas_stirrup.push(stirrupData);      

    this.setAxialHeaders();
    this.setStirrupHeader();
    this.setCalculatedPointHeader();

    const axialRebarOption = {
      width: 'flex',
      maxWidth: 620,
      height: 200,
      showTop: false,
      reactive: true,
      sortable: false,
      locale: "jp",
      numberCell: {
        show: true,       
      },
      freezeCols: 1,
      editModel: {
        clicksToEdit: 1
      },
      colModel: this.axialHeaders,
      dataModel: { data: axialRebarData},
      change: (event, ui) => {
        for (const property of ui.updateList) {
          for (const key of Object.keys(property.newRow)) {           
            if(key == "side_cover"){
              property.newRow["distance_side"] = property.newRow[key]
            };
            const old = property.oldRow[key];
            if (property.newRow[key] == null) {
              continue; // 削除した場合 何もしない
            }
            if (key === 'side_dia' || key === 'stirrup_dia') {
              // 鉄筋径の規格以外は入力させない
              const value0 = this.bars.matchBarSize(property.newRow[key]);
              const j = property.rowIndx;
              if (value0 === null) {
                this.table_datas_axial[j][key] = old;
              }
            }
          }         
          
          let table_data_bar = this.rebar.table_data
          let indexBar= table_data_bar.findIndex(data=> data.m_no ===  this.rebar.selectedCalPoint.m_no)
          if(indexBar !== -1){
            let newRebar0=  this.OrderByRebarType(this.setRebar0(this.table_datas_axial))
            table_data_bar[indexBar].rebar0=newRebar0          
            this.bars.setTableColumns(table_data_bar)  
            this.rebar.selectedCalPoint.rebar0 = newRebar0;  
            // this.displayPreview(this.rebar.selectedCalPoint);  
            if(this.typeView === 4){
              axialRebarData.forEach((data: any)=> {
                if (this.member.B < this.member.H) { 
                  if (data.rebar_type === upperside || data.rebar_type === lowerside) {
                    data.pq_cellstyle = this.styleShaded2;
                    data.pq_cellprop = this.propShaded2;
                  } else if (data.rebar_type === lateral) {
                    data.pq_cellstyle = this.styleShaded1;
                    data.pq_cellprop = this.propShaded1;
                  } 
                } else {
                  if (data.rebar_type === upperside || data.rebar_type === lowerside) {
                    data.pq_cellstyle = this.styleShaded1;
                    data.pq_cellprop = this.propShaded1;
                  } else if (data.rebar_type === lateral) {
                    data.pq_cellstyle = this.styleShaded2;
                    data.pq_cellprop = this.propShaded2;
                  } 
                } 
              })
            }     
            this.axialGrid.refreshDataAndView();                 
          }
            this.drawPreview();
        }
      }
    }
    
    const stirrupOption = {
      width: 'flex',
      maxWidth: 290,
      height: this.setStirrupTableHeight(),
      showTop: false,
      reactive: true,
      sortable: false,
      locale: "jp",
      numberCell: {
        show: false
      },       
      freezeCols: 1,
      editModel: {
        clicksToEdit: 1
      },
      colModel: this.stirrupHeaders,
      dataModel: { data: stirrupData },
      change: (event, ui) => {
        for (const property of ui.updateList) {
          for (const key of Object.keys(property.newRow)) {
            const old = property.oldRow[key];
            if (property.newRow[key] == null) {
              continue; // 削除した場合 何もしない
            }
            if ( key === 'side_dia' || key === 'stirrup_dia') {
              // 鉄筋径の規格以外は入力させない
              const value0 = this.bars.matchBarSize(property.newRow[key]);
              const j = property.rowIndx;
              if (value0 === null) {
                this.table_datas_stirrup[j][key] = old;
              }
            }
          }         
          
          let table_data_bar = this.rebar.table_data
          let indexBar= table_data_bar.findIndex(data=> data.m_no ===  this.rebar.selectedCalPoint.m_no)
          if(indexBar !== -1){
            let newStirrup= this.setStrrup(this.table_datas_stirrup)
            console.log(table_data_bar[indexBar])
            table_data_bar[indexBar].stirrup=newStirrup   
            table_data_bar[indexBar].stirrup_dia=newStirrup.stirrup_dia  
            table_data_bar[indexBar].stirrup_n=newStirrup.stirrup_n 
            table_data_bar[indexBar].stirrup_ss=newStirrup.stirrup_ss       
            this.bars.setTableColumns(table_data_bar)  
            this.rebar.selectedCalPoint.stirrup = newStirrup;
          }
          // this.bars.setTableColumns(this.table_datas_axial)      
          this.drawPreview();
        }
      }
    }   

    const calculatedPointOption = {
      width: 'flex',
      maxWidth: 620,
      height: 420,
      showTop: false,
      reactive: true,
      sortable: false,
      locale: "jp",
      numberCell: {
        show: false,       
      },    
      colModel: this.calculatedPointHeaders,
      dataModel: { data: calPointListData },
      change: (evt, ui) =>{
        for (const property of ui.updateList) {
          for (const key of Object.keys(property.newRow)) {
            const old = property.oldRow[key];
            if (property.newRow[key] == null) {
              continue; // 削除した場合 何もしない
            }
          }
        }    
        this.table_datas_cal_point = new Array();
        this.table_datas_cal_point.push(calPointListData);
        let table_data_bar = this.rebar.table_data
        let indexBar= table_data_bar.findIndex(data=> data.m_no ===  this.rebar.selectedCalPoint.m_no)
        if(indexBar !== -1){
          let newCalPoint= this.setCalPoint(this.table_datas_cal_point);
          console.log(table_data_bar[indexBar])
          table_data_bar[indexBar].haunch_height= newCalPoint.haunch_height            
          this.bars.setTableColumns(table_data_bar)  
          this.rebar.selectedCalPoint.haunch_height = newCalPoint.haunch_height;
          this.rebar.selectedCalPoint.haunch_M = newCalPoint.haunch_height;
          this.rebar.selectedCalPoint.haunch_V = newCalPoint.haunch_height;

        }        
        this.drawPreview();
      },
      cellClick: (evt, ui) => {  
        this.clearFocus(calPointListData);
        ui.rowData.pq_rowcls = "pq-state-select ui-state-highlight";
        this.grid.refreshDataAndView();    
        this.member = this.members.getData(ui.rowData.no)
        this.typeView = this.member.shape
        if(Object.keys(this.rebar).length != 0){
          for (let rebar of this.rebar.rebarList) {
            if (rebar.p_name === ui.rowData.p_name && rebar.m_no === ui.rowData.no) {          
              if(rebar.rebar0.length === 0){
                this.removeScene();  
                this.typeView = ""                         
              }else  {
                this.rebar.selectedCalPoint = rebar  
              }      
              this.displayPreview(rebar, true); 
              this.axialGrid.refreshDataAndView(); 
              this.stirrupGrid.refreshDataAndView();
              this.drawPreview();
              break;
            }
          } 
        
        }
          
      },
     
    }

    this.axialRebarOptions = axialRebarOption;
    this.stirrupOptions = stirrupOption;
    if(!changeCalPoint){
      this.calculatedPointOptions = calculatedPointOption; 
    }
  }  
  private drawPreview() {
    this.threeNode.dataRebar = this.rebar  
    this.removeScene();
    switch(this.typeView){
      case 1: {
        this.threeTRShape.createDemoRectangle();
        break;
      }
      case 2: {
        this.threeTRShape.createDemoTShape();
        break;
      }
      case 3: {
        this.threeCircle.createDemoCircleRing();
        break;
      }
      case 4: {
        this.threeOval.createDemoOval();
        break;
      }
      default: 
        this.threeNode.showMessage();
        break;
    }  
    this.scene.render();
  }

  private setRebar0(table_data){
    const upperside = this.translate.instant("preview_rebar.upper_side");
    const lowerside = this.translate.instant("preview_rebar.lower_side");
    const lateral = this.translate.instant("preview_rebar.lateral_rebar");
    let dataNew= new Array();
    table_data[0].map((data)=>{
      const b = {
        rebar_type: null,
        dia: "null",
        quantity: null,
        dist_top: null,
        dist_side: null,                  
        interval: null
      }; 
      b.dist_side = data.side_cover; 
      switch (data.rebar_type) {
        case upperside: 
          if(this.typeView ===  1 || this.typeView === 2 ){            
            b.rebar_type = 0;        
           }           
          else if (this.typeView === 4){
            if (this.member.B < this.member.H) {
              b.rebar_type = 2;    
              b.dist_side = data.distance_side;               
              data.distance_top = b.dist_side          
            } else {
              b.rebar_type = 0;
            }
          }else{
            b.rebar_type = 7;
            b.dist_side = data.distance_side; 
            data.distance_top = data.distance_side; 
          }
          break;
        case lowerside: 
          if (this.typeView ===  1 || this.typeView === 2 )
            b.rebar_type = 1;
          else if(this.typeView === 4){
            if (this.member.B < this.member.H) {
                b.rebar_type = 3;      
                b.dist_side = data.distance_side;               
                data.distance_top = b.dist_side
            } else {
                b.rebar_type = 1;
            }
            }
          else{
              b.rebar_type = 7;
              b.dist_side = data.distance_side; 
            }
          break;
        case lateral: 
          if(this.typeView ===  1 || this.typeView === 2)
            b.rebar_type = 4;
          else if(this.typeView === 4){
            if (this.member.B < this.member.H) {
              b.rebar_type = 6;              
            } else {
                      
              b.dist_side = data.distance_side; 
              data.distance_top = data.distance_side;      
            }
          }
          break;         
        default:{
          b.rebar_type = 7;
          b.dist_side = data.distance_side;               
          data.distance_top = b.dist_side 
          break;
        }       
      }
          b.dist_top= data.distance_top          
          b.dia = data.rebar_dia === "null" ? null : data.rebar_dia
          b.quantity= data.num                
          b.interval=data.interval
          console.log("b",b)
          dataNew.push(b)
    })
    return dataNew
  }
  private clearFocus(calPointListData : any) {
    calPointListData.forEach(row => {
      row.pq_rowcls = ""; 
      row.pq_cellcls = {}; 
    });
  }
  private setStrrup(table_data){
    var data = table_data[0][0]
    var stirrup = this.bars.default_stirrup_bar()
    stirrup.stirrup_dia = data.stirrup_dia === "null" ? null : data.stirrup_dia;
    stirrup.stirrup_n = data.stirrup_n;
    stirrup.stirrup_ss = data.stirrup_ss;
    return stirrup;
  }
  private setCalPoint(table_data){
    var datatb = table_data[0];
    var dataNew : any
    datatb.map((data) => {
      const b = {
        m_no: null,
        p_name: null,
        haunch_height: null,
        position: null 
      }
      if(this.rebar.selectedCalPoint.m_no === data.no){
        b.haunch_height = data.haunch
        b.m_no = data.no
        b.p_name = data.p_name
        b.position = data.pos
        dataNew = b; 
      
      }           
    })
   
    return dataNew;
  }
  private setColumnWidth(column) {
    const isJapanese = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]/.test(column);

    const widthMap = {
      "preview_rebar.rebar_type": { japanese: 90, english: 140 },
      "preview_rebar.rebar_dia": { japanese: 70, english: 120 },
      "preview_rebar.side_cover": { japanese: 85, english: 120 }
    };

    for (const key in widthMap) {
      if (this.translate.instant(key) === column) {
        return isJapanese ? widthMap[key].japanese : widthMap[key].english;
      }
    }

    return 100;
  }

  private setStirrupTableHeight() {
    const jaRegex = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]/
    const isJapanese = jaRegex.test(this.translate.instant("preview_rebar.stirrup"));
    if (isJapanese) {
      return 100
    } else {
      return 98
    }
  }

  private setAxialHeaders(): void {
    this.axialHeaders = [];
    const upper_side = this.translate.instant("preview_rebar.upper_side");
    const lower_side = this.translate.instant("preview_rebar.lower_side");
    const lateral_rebar = this.translate.instant("preview_rebar.lateral_rebar");

    const rebar_type = this.translate.instant("preview_rebar.rebar_type");
    const rebar_dia = this.translate.instant("preview_rebar.rebar_dia");
    const number = this.translate.instant("preview_rebar.num");
    const distance_edge = this.translate.instant("preview_rebar.distance_edge");
    const distance_perimeter = this.translate.instant("preview_rebar.distance_perimeter");

    const distance_top = this.translate.instant("preview_rebar.dis_top");
    const side_cover = this.translate.instant("preview_rebar.side_cover");
    
    const rebar_type_options = [upper_side, lower_side, lateral_rebar];
    const rebar_dia_options = ["null",10, 13, 16, 19, 22, 25, 29, 32, 35, 38, 41, 51];

    if (this.typeView === 1 || this.typeView === 2 || this.typeView === "") {
      this.axialHeaders.push(
        {
          title: rebar_type,
          width: this.setColumnWidth(rebar_type), align: 'center',
          dataIndx: 'rebar_type',
          cls: 'pq-drop-icon pq-side-icon',
          sortable: false, nodrag: true, resizable: false,
          editable: true,
          editor: {
            type: 'select',
            options: rebar_type_options
          },
          render:  (ui) => {       
            return rebar_type_options[ui.cellData] || {};
          },
        },
        {
          title: rebar_dia,
          width: this.setColumnWidth(rebar_dia), align: 'center',
          dataIndx: 'rebar_dia',
          cls: 'pq-drop-icon pq-side-icon',
          editable: true, sortable: false, nodrag: true, resizable: false,
          editor: {
            type: 'select',
            options: rebar_dia_options
          },
          render:  (ui) =>{
       
            return rebar_dia_options[ui.cellData] || {};
          },
        },
        {
          title: number,
          width: 70, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'num', format: "#.000",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
        {
          title: distance_top,
          width: 120, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'distance_top', format: "#.0",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
        {
          title: side_cover,
          width: this.setColumnWidth(side_cover), halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'side_cover', format: "#.0",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
      )
    } else if (this.typeView === 4) {
      this.axialHeaders.push(
        {
          title: rebar_type,
          width: this.setColumnWidth(rebar_type), align: 'center',
          dataIndx: 'rebar_type',
          cls: 'pq-drop-icon pq-side-icon',
          editable: true, sortable: false, nodrag: true, resizable: false,
          editor: {
            type: 'select',
            options: rebar_type_options
          },
          render:  (ui) =>{       
            return rebar_type_options[ui.cellData] || {};
          },
        },
        {
          title: rebar_dia,
          width: this.setColumnWidth(rebar_dia), align: 'center',
          dataIndx: 'rebar_dia',
          cls: 'pq-drop-icon pq-side-icon',
          editable: true, sortable: false, nodrag: true, resizable: false,
          editor: {
            type: 'select',
            options: rebar_dia_options
          },
          render:  (ui) => {
       
            return rebar_dia_options[ui.cellData] || {};
          },
        },
        {
          title: number,
          width: 70, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'num', format: "#.000",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
        {
          title: distance_edge,
          width: 135, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'distance_side', format: "#.0",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
        {
          title: distance_top,
          width: 120, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'distance_top', format: "#.0",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
        {
          title: side_cover,
          width: this.setColumnWidth(side_cover), halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'side_cover', format: "#.0",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
      )
    } else if (this.typeView === 3) {
      this.axialHeaders.push(
        {
          title: rebar_dia,
          width: this.setColumnWidth(rebar_dia), align: 'center',
          dataIndx: 'rebar_dia',
          cls: 'pq-drop-icon pq-side-icon',
          editable: true, sortable: false, nodrag: true, resizable: false,
          editor: {
            type: 'select',
            options: rebar_dia_options
          },
          render:  (ui) => {       
            return rebar_dia_options[ui.cellData] || {};
          },
        },
        {
          title: number,
          width: 70, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'num', format: "#.000",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
        {
          title: distance_perimeter,
          width: 120, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'distance_side', format: "#.0",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
      )
    }
  }

  private setStirrupHeader(): void {
    this.stirrupHeaders = [];
    const rebar_dia = this.translate.instant("preview_rebar.rebar_dia");
    const number = this.translate.instant("preview_rebar.num");
    const interval = this.translate.instant("preview_rebar.interval")
    const rebar_dia_options = ["null",10, 13, 16, 19, 22, 25, 29, 32, 35, 38, 41, 51];

    this.stirrupHeaders.push(
      {
        title: rebar_dia,
        width: this.setColumnWidth(rebar_dia),
        dataIndx: 'stirrup_dia', align: 'center',
        editable: true, sortable: false, nodrag: true, resizable: false,
        cls: 'pq-drop-icon pq-side-icon',
        editor: {
          type: 'select',
          options: rebar_dia_options
        },
        render:  (ui) =>{     
          return rebar_dia_options[ui.cellData] || {};
        },
      },
      {
        title: number,
        width: 70, halign: 'center', align: 'right',
        dataType: 'integer', dataIndx: 'stirrup_n', format: "#.000",
        editable: true, sortable: false, nodrag: true, resizable: false,
      },
      {
        title: interval,
        width: 80, halign: 'center', align: 'right',
        dataType: 'integer', dataIndx: 'stirrup_ss', resizable: false,
      },
    )
  }
  private setCalculatedPointHeader(): void {
    this.calculatedPointHeaders = [];

    const no = this.translate.instant("preview_rebar.no");
    const pos = this.translate.instant("preview_rebar.pos");
    const p_name = this.translate.instant("preview_rebar.p_name");
    const haunch = this.translate.instant("preview_rebar.haunch");
    let rebarList = this.rebar.rebarList
    let m_no = 0;
    let cls = []
    if (rebarList) {
      for (let i = 0; i < rebarList.length - 1; i++) {
        if (rebarList[i].m_no === m_no && rebarList[i + 1].m_no === m_no) {
          cls.push("l-shape");
        } else if (rebarList[i].m_no === m_no && rebarList[i + 1].m_no !== m_no) {
          cls.push("last-l-shape");
        } else if (rebarList[i].m_no !== m_no && rebarList[i].m_no === rebarList[i + 1].m_no) {
          cls.push("dot-line");
          m_no = rebarList[i].m_no;
        } else {
          cls.push("dot");
          m_no = rebarList[i].m_no;
        }
      }
    }
    
    this.calculatedPointHeaders.push(
      {
        title: "",
        minWidth: 24,
        nodrag: true, resizable: false, editable: false, sortable: false,
        render: function (ui) {
          ui.column.width = 24
          return {
            cls: cls[ui.rowIndx]
          }
        }
      },
      {
        title: no,
        width: 70, halign: 'center', align: 'center',
        dataType: 'integer', dataIndx: 'no',
        editable: false, sortable: false, nodrag: true, resizable: false,
      },
      {
        title: pos,
        width: 70, halign: 'center', align: 'right',
        dataType: 'float', dataIndx: 'pos',
        editable: false, sortable: false, nodrag: true, resizable: false,
      },
      {
        title: p_name,
        width: 340, halign: 'center', align: 'left',
        dataType: 'string', dataIndx: 'p_name',
        editable: false, sortable: false, nodrag: true, resizable: false,
        render: function (ui) {
          return {
            cls: 'long-text',
            attr: {
              title: ui.cellData
            }
          }
        }
      },
      {
        title: haunch,
        width: 90, halign: 'center', align: 'right',
        dataType: 'integer', dataIndx: 'haunch',
        editable: true, sortable: false, nodrag: true, resizable: false,
      },
    );
  }

  private back(): void {
    this.bars.is_review = !this.bars.is_review;
  }
  public removeScene() {
    let index = []
    if (this.scene.scene.children.length > 0) {
      for (let i = 0; i < this.scene.scene.children.length; i++) {
        let name = this.scene.scene.children[i].name;
        let type = this.scene.scene.children[i].type;
        if (type === "Mesh" || type === "Line" || name === "node" || type == "LineSegments") {
          index.push(i)
        }
        if (type === "Object3D") {
          this.scene.scene.children[i].children = []
        }
      }
      index.sort((a, b) => b - a)
      index.forEach(index => {
        if (index >= 0 && index < this.scene.scene.children.length) {
          this.scene.scene.children.splice(index, 1)
        }
      })

    }
    let toRemove: any = Array.from(document.getElementsByClassName("label_theerjs"));
    toRemove.map((e)=> e.remove());    
  }
}
