import { Component, Input, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-preview-rebar',
  templateUrl: './preview-rebar.component.html',
  styleUrls: ['./preview-rebar.component.scss']
})
export class PreviewRebarComponent implements OnInit {
  public axialRebarOptions: pq.gridT.options;
  public stirrupOptions: pq.gridT.options;
  public calculatedPointOptions: pq.gridT.options;

  private option_list: pq.gridT.options[] = new Array();
  private axialHeaders: object[] = new Array();
  private stirrupHeaders: object[] = new Array();
  private calculatedPointHeaders: object[] = new Array();
  private table_datas_axial: any[];
  public typeView: any
  public style = { "pointer-events": "none", "background": "linear-gradient(to left top, transparent 0%, transparent 50.5%, gray 52.5%, transparent 54.5%, transparent 100%)", "font-size": "0" }
  public styleShaded1 = {
    distance_edge: {...this.style} // todo: change to Distance from the outer edge of the semicircle（Rebar core）(mm)
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
    rebar_dia: {...this.prop}
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
  constructor(
    public bars: InputBarsService,
    private translate: TranslateService,
    private members: InputMembersService,
    private threeNode: ThreeNodeService,
    private scene: SceneService,
  ) { }

  private hasRebar(obj: any): boolean {
    for (const key in obj) {
      if (key.startsWith("rebar_") && obj[key] === null) {
        return false;
      }
    }
    return true;
  }


  ngOnInit() {
    if (Object.keys(this.rebar).length != 0) {
      let calPoint = this.rebar.selectedCalPoint; 
      const member = this.members.getData(calPoint.m_no)
      console.log('member', member)
      console.log('calPoint', calPoint)
      this.table_datas_axial = new Array();
      var axialRebarData = [];
      var stirrupData = [];
      var calPointListData = [];
      this.typeView = member.shape
      console.log("typeview", this.typeView)

      const upperside = this.translate.instant("preview_rebar.upper_side");
      const lowerside = this.translate.instant("preview_rebar.lower_side");
      const lateral = this.translate.instant("preview_rebar.lateral_rebar");

      // new data
      if (calPoint.rebar0.length > 0)  {
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
            rebar_dia: rebar.dia,
            num: rebar.quantity,
            distance_top: rebar.dist_top,
            side_cover: rebar.dist_side,
            interval: rebar.interval
          })        
        }
      }

      this.table_datas_axial.push(axialRebarData);

      // Stirrup Data
      const stirrup = calPoint.stirrup;
      if (stirrup) {
        stirrupData.push({
          rebar_dia: stirrup.stirrup_dia,
          num: stirrup.stirrup_n,
          interval: stirrup.stirrup_ss,
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
              haunch: point.haunch_M, // haunch_M or haunch_V ???
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
              haunch: point.haunch_M // haunch_M or haunch_V ???
            })
          }
        }
      }
      axialRebarData.forEach((data: any)=> {
        if (this.typeView === 5) {
          if (data.rebar_type === upperside || data.rebar_type === lowerside) {
            data.pq_cellstyle = this.styleShaded2;
            data.pq_cellprop = this.propShaded2;
          } else if (data.rebar_type === lateral) {
            data.pq_cellstyle = this.styleShaded1;
            data.pq_cellprop = this.propShaded1;
          } 
        } else if (this.typeView === 6) {
            if (data.rebar_type === upperside || data.rebar_type === lowerside) {
              data.pq_cellstyle = this.styleShaded1;
              data.pq_cellprop = this.propShaded1;
            } else if (data.rebar_type === lateral) {
              data.pq_cellstyle = this.styleShaded2;
              data.pq_cellprop = this.propShaded2;
            } 
        } 
      })

      calPointListData.forEach((data: any)=> {
        if (this.typeView === 3 || 
          this.typeView === 4 || 
          this.typeView === 5 || 
          this.typeView === 6
        ) {
          data.pq_cellstyle = this.styleShaded3;
          data.pq_cellprop = this.propShaded3;
        } 
      })
    }
 
    this.setAxialHeaders();
    this.setStirrupHeader();
    this.setCalculatedPointHeader();

    const axialRebarOption = {
      width: 'flex',
      maxWidth: 620,
      height: 180,
      showTop: false,
      reactive: true,
      sortable: false,
      locale: "jp",
      numberCell: {
        show: true,
        width: 24,
        title: "",
        resizable: false,
        minWidth: 24,
      },
      colModel: this.axialHeaders,
      dataModel: { data: axialRebarData },
      change: (event, ui) => {
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
                this.table_datas_axial[j][key] = old;
              }
            }
          }         
          
          let table_data_bar = this.rebar.table_data
          let indexBar= table_data_bar.findIndex(data=> data.m_no ===  this.rebar.selectedCalPoint.m_no)
          if(indexBar !== -1){
            console.log(this.table_datas_axial);
            let newRebar0= this.setRebar0(this.table_datas_axial)
            table_data_bar[indexBar].rebar0=newRebar0          
            this.bars.setTableColumns(table_data_bar)  
            this.rebar.selectedCalPoint.rebar0 = newRebar0;
          }
          // this.bars.setTableColumns(this.table_datas_axial)      
          this.threeNode.dataRebar = this.rebar  
          this.removeScene();
          this.scene.render();
          switch(this.typeView){
            case 1: {
              this.threeNode.createDemoRectangle();
              break;
            }
            case 2: {
              this.threeNode.createDemoTShape();
              break;
            }
            case 3: {
              this.threeNode.createDemoCircleRing();
              break;
            }
            case 4: {
              this.threeNode.createDemoCircleRing();
              break;
            }
            case 5: {
              this.threeNode.createDemoOval();
              break;
            }
            case 6: {
              this.threeNode.createDemoOval();
              break;
            }
          }   
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
      colModel: this.stirrupHeaders,
      dataModel: { data: stirrupData },
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
        width: 0,
      },
      colModel: this.calculatedPointHeaders,
      dataModel: { data: calPointListData },
      // selectionModel: { type: 'row', mode: 'single' },
      rowClick: (evt, ui) => {
        this.clearFocus(calPointListData);
        console.log(ui.rowData)
        ui.rowData.pq_rowcls = "pq-state-select ui-state-highlight";
        this.grid.refreshDataAndView();

      },
    }

    this.option_list.push(axialRebarOption);
    this.axialRebarOptions = this.option_list[0];
    this.stirrupOptions = stirrupOption;
    this.calculatedPointOptions = calculatedPointOption;
  }
  private setRebar0(table_data){
    const upperside = this.translate.instant("preview_rebar.upper_side");
    const lowerside = this.translate.instant("preview_rebar.lower_side");
    const lateral = this.translate.instant("preview_rebar.lateral_rebar");
    let dataNew= new Array();
    table_data[0].map((data)=>{
      const b = {rebar_type: 0,
                  dia: 0,
                  quantity: 0,
                  dist_top: 0,
                  dist_side: 0,
                  interval:0
                }; 

      switch (data.rebar_type) {
        case upperside: 
          if(this.typeView ===  1 || this.typeView === 2 || this.typeView === 5)
            b.rebar_type = 0;
          else if(this.typeView === 6){
            b.rebar_type = 2;
          }
          break;
        case lowerside: 
          if(this.typeView ===  1 || this.typeView === 2 || this.typeView === 5)
            b.rebar_type = 1;
          else if(this.typeView === 6){
            b.rebar_type = 3;
          }
          break;
        case lateral: 
          if(this.typeView ===  1 || this.typeView === 2)
            b.rebar_type = 4;
          else if(this.typeView === 5){
            b.rebar_type = 5;
          }
          else if(this.typeView === 6){
            b.rebar_type = 6;
          }
          break; 
        default:
          b.rebar_type = 7;
          break     
      }
          b.dist_top= data.distance_top          
          b.dia= data.rebar_dia
          b.quantity= data.num
          b.dist_side= data.side_cover
          b.interval=data.interval

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
    const dist_edge = "Distance from the outer edge of the semicircle（Rebar core）(mm)";
    const dist_perimeter = "Distance from the outer perimeter（Rebar core）(mm)";

    const distance_top = this.translate.instant("preview_rebar.dis_top");
    const side_cover = this.translate.instant("preview_rebar.side_cover");
    
    const rebar_type_options = [upper_side, lower_side, lateral_rebar];
    const rebar_dia_options = [10, 13, 16, 19, 22, 25, 29, 32, 35, 38, 41, 51];

    if (this.typeView === 1 || this.typeView === 2) {
      this.axialHeaders.push(
        {
          title: rebar_type,
          width: this.setColumnWidth(rebar_type), align: 'center',
          dataIndx: 'rebar_type',
          editable: false, sortable: false, nodrag: true, resizable: false,
          render: function (ui) {
            var cellData = ui.cellData;
            var options = rebar_type_options;
            var selectBoxHtml = '<select>';
  
            options.forEach(function (option) {
              var selected = (option === cellData) ? 'selected' : '';
              selectBoxHtml += `<option value="${option}" ${selected}>${option}</option>`;
            });
            selectBoxHtml += '</select>';
  
            return {
              text: selectBoxHtml,
              cls: 'pq-select-box'
            }
          },
        },
        {
          title: rebar_dia,
          width: this.setColumnWidth(rebar_dia), align: 'center',
          dataIndx: 'rebar_dia',
          editable: false, sortable: false, nodrag: true, resizable: false,
          render: function (ui) {
            var cellData = ui.cellData;
            var options = rebar_dia_options;
            var selectBoxHtml = '<select>';
  
            options.forEach(function (option) {
              var selected = (option === cellData) ? 'selected' : '';
              selectBoxHtml += `<option value="${option}" ${selected}>${option}</option>`;
            });
            selectBoxHtml += '</select>';
  
            return {
              text: selectBoxHtml,
              cls: 'pq-select-box'
            }
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
    } else if (this.typeView === 5 || this.typeView === 6) {
      this.axialHeaders.push(
        {
          title: rebar_type,
          width: this.setColumnWidth(rebar_type), align: 'center',
          dataIndx: 'rebar_type',
          editable: false, sortable: false, nodrag: true, resizable: false,
          render: function (ui) {
            var cellData = ui.cellData;
            var options = rebar_type_options;
            var selectBoxHtml = '<select>';
  
            options.forEach(function (option) {
              var selected = (option === cellData) ? 'selected' : '';
              selectBoxHtml += `<option value="${option}" ${selected}>${option}</option>`;
            });
            selectBoxHtml += '</select>';
  
            return {
              text: selectBoxHtml,
              cls: 'pq-select-box'
            }
          },
        },
        {
          title: rebar_dia,
          width: this.setColumnWidth(rebar_dia), align: 'center',
          dataIndx: 'rebar_dia',
          editable: false, sortable: false, nodrag: true, resizable: false,
          render: function (ui) {
            var cellData = ui.cellData;
            var options = rebar_dia_options;
            var selectBoxHtml = '<select>';
  
            options.forEach(function (option) {
              var selected = (option === cellData) ? 'selected' : '';
              selectBoxHtml += `<option value="${option}" ${selected}>${option}</option>`;
            });
            selectBoxHtml += '</select>';
  
            return {
              text: selectBoxHtml,
              cls: 'pq-select-box'
            }
          },
        },
        {
          title: number,
          width: 70, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'num', format: "#.000",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
        {
          title: dist_edge,
          width: 120, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'distance_edge', format: "#.0",
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
    } else if (this.typeView === 3 || this.typeView === 4) {
      this.axialHeaders.push(
        {
          title: rebar_dia,
          width: this.setColumnWidth(rebar_dia), align: 'center',
          dataIndx: 'rebar_dia',
          editable: false, sortable: false, nodrag: true, resizable: false,
          render: function (ui) {
            var cellData = ui.cellData;
            var options = rebar_dia_options;
            var selectBoxHtml = '<select>';
  
            options.forEach(function (option) {
              var selected = (option === cellData) ? 'selected' : '';
              selectBoxHtml += `<option value="${option}" ${selected}>${option}</option>`;
            });
            selectBoxHtml += '</select>';
  
            return {
              text: selectBoxHtml,
              cls: 'pq-select-box'
            }
          },
        },
        {
          title: number,
          width: 70, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'num', format: "#.000",
          editable: true, sortable: false, nodrag: true, resizable: false,
        },
        {
          title: dist_perimeter,
          width: 120, halign: 'center', align: 'right',
          dataType: 'integer', dataIndx: 'distance_edge', format: "#.0",
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
    const rebar_dia_options = [10, 13, 16, 19, 22, 25, 29, 32, 35, 38, 41, 51];

    this.stirrupHeaders.push(
      {
        title: rebar_dia,
        width: this.setColumnWidth(rebar_dia),
        dataIndx: 'rebar_dia', align: 'center',
        editable: true, sortable: false, nodrag: true, resizable: false,
        render: function (ui) {
          var cellData = ui.cellData;
          var options = rebar_dia_options;
          var selectBoxHtml = '<select>';

          options.forEach(function (option) {
            var selected = (option === cellData) ? 'selected' : '';
            selectBoxHtml += `<option value="${option}" ${selected}>${option}</option>`;
          });
          selectBoxHtml += '</select>';

          return {
            text: selectBoxHtml,
            cls: 'pq-select-box'
          }
        },
      },
      {
        title: number,
        width: 70, halign: 'center', align: 'right',
        dataType: 'integer', dataIndx: 'num', format: "#.000",
        editable: true, sortable: false, nodrag: true, resizable: false,
      },
      {
        title: interval,
        width: 80, halign: 'center', align: 'right',
        dataType: 'integer', dataIndx: 'interval', resizable: false,
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
        editable: false, sortable: false, nodrag: true, resizable: false,
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
        if (type === "Mesh" || type === "Line" || name === "node") {
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
    console.log("sence", this.scene.scene.children)
    let toRemove: any = Array.from(document.getElementsByClassName("label_theerjs"));
    toRemove.map((e)=> e.remove());    
  }
}
