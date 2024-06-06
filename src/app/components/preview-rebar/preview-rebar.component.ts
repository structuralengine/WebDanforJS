import { Component, Input, OnInit } from '@angular/core';
import pq from 'pqgrid';
import { TranslateService } from "@ngx-translate/core";
import { NONE_TYPE } from '@angular/compiler';
import { InputBarsService } from '../bars/bars.service';
import { create } from 'domain';
import { InputMembersService } from '../members/members.service';
import { SheetComponent } from '../sheet/sheet.component';
import { ViewChild } from '@angular/core';

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
  private table_datas: any[];
  public typeView: any
  @Input() rebar: any
  @ViewChild('calPointGrid') grid: SheetComponent;
  constructor(
    public bars: InputBarsService,
    private translate: TranslateService,
    private members: InputMembersService,
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
      var axialRebarData = [];
      var stirrupData = [];
      var calPointListData = [];
      this.typeView = this.rebar.typeView
      console.log("typeview", this.typeView)
      //Upper Side Rebar
      // if (this.hasRebar(calPoint.rebar1)) {
        const upperRebar = calPoint.rebar1;
        axialRebarData.push({
          rebar_type: this.translate.instant("preview_rebar.upper_side"),
          rebar_dia: upperRebar.rebar_dia,
          num: upperRebar.rebar_n,
          distance_top: upperRebar.rebar_cover,
          side_cover: upperRebar.rebar_ss
        })
      // }

      // Lateral Rebar Data
      const lateralRebalTop = calPoint.sidebar1;
      const lateralRebalBottom = calPoint.sidebar2;
      for (let i = 1; i <= lateralRebalTop.side_n; i++) {
        axialRebarData.push({
          rebar_type: this.translate.instant("preview_rebar.lateral_rebar"),
          rebar_dia: lateralRebalTop.side_dia,
          num: 2,
          distance_top: lateralRebalTop.side_cover * i,
          side_cover: lateralRebalTop.side_ss
        })
      }

      for (let i = 1; i <= lateralRebalBottom.side_n; i++) {
        axialRebarData.push({
          rebar_type: this.translate.instant("preview_rebar.lateral_rebar"),
          rebar_dia: lateralRebalBottom.side_dia,
          num: 2,
          distance_top: calPoint.h - lateralRebalBottom.side_cover * i,
          side_cover: lateralRebalBottom.side_ss
        })
      }

      // Lower Side Rebar
      // if (this.hasRebar(calPoint.rebar2)) {
        const lowerRebar = calPoint.rebar2;
        axialRebarData.push({
          rebar_type: this.translate.instant("preview_rebar.lower_side"),
          rebar_dia: lowerRebar.rebar_dia,
          num: lowerRebar.rebar_n,
          distance_top: calPoint.h - lowerRebar.rebar_cover,
          side_cover: lowerRebar.rebar_ss
        })
      // }

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
      return 65
    } else {
      return 63
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
    const distance_top = this.translate.instant("preview_rebar.dis_top");
    const side_cover = this.translate.instant("preview_rebar.side_cover");

    const rebar_type_options = [upper_side, lower_side, lateral_rebar];
    const rebar_dia_options = [10, 13, 16, 19, 22, 25, 29, 32, 35, 38, 41, 51];

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
}
