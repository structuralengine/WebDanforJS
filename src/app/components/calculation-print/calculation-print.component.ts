import { Component, OnInit, OnDestroy, ViewChild, OnChanges } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { InputCalclationPrintService } from './calculation-print.service';
import { SaveDataService } from '../../providers/save-data.service';

// import { Auth, getAuth } from "@angular/fire/auth";
import { UserInfoService } from 'src/app/providers/user-info.service';
import { TranslateService } from "@ngx-translate/core";
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { LanguagesService } from "../../providers/languages.service";

import printJS from "print-js";
import { ElectronService } from 'src/app/providers/electron.service';
import packageJson from '../../../../package.json';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "src/environments/environment";

import * as FileSaver from "file-saver";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PreviewExcelComponent } from '../preview-excel/preview-excel.component';
import { merge } from 'rxjs';
import { Guid } from 'guid-typescript';
import { MenuService } from '../menu/menu.service';

@Component({
  selector: 'app-calculation-print',
  templateUrl: './calculation-print.component.html',
  styleUrls: ['./calculation-print.component.scss']
})
export class CalculationPrintComponent implements OnInit, OnDestroy {

  // 設計条件
  public print_calculate_checked: boolean;
  public print_section_force_checked: boolean;
  public print_summary_table_checked: boolean;
  public print_safety_ratio_checked: boolean;
  // 照査
  public calculate_moment_checked: boolean;
  public calculate_shear_force_checked: boolean;
  public calculate_torsional_moment_checked: boolean;

  // 照査
  public consider_moment_checked: boolean;

  // 部材
  public table_datas: any[];

  public hasSummary: boolean = false;
  public selectedRoad: boolean ;
  private summary_data;

  constructor(
    private calc: InputCalclationPrintService,
    private save: SaveDataService,
    private router: Router,
    private http: HttpClient,
    private user: UserInfoService,
    // public auth: Auth,
    public electronService: ElectronService,
    private translate: TranslateService,
    public language: LanguagesService,
    private helper: DataHelperModule,
    private modalService: NgbModal,
    private menuService: MenuService,
  ) {
    // this.auth = getAuth();
  }

  ngOnInit() {
    console.log("menu",this.menuService.selectedRoad);
    this.selectedRoad=this.menuService.selectedRoad
    console.log(this.selectedRoad,"selectedRoad");
    this.print_calculate_checked = this.calc.print_selected.print_calculate_checked;
    this.print_section_force_checked = this.calc.print_selected.print_section_force_checked;
    this.print_summary_table_checked = this.calc.print_selected.print_summary_table_checked;
    this.print_safety_ratio_checked = this.calc.print_selected.print_safety_ratio_checked;

    this.calculate_moment_checked = true;
    this.calculate_shear_force_checked = true;
    this.calculate_torsional_moment_checked = true;

    this.consider_moment_checked = true;

    this.table_datas = new Array();
    for (const data of this.calc.getColumnData()) {
      this.table_datas.push({
        'calc_checked': data.checked,
        'g_name': data.g_name
      });
    }


  }

  ngOnDestroy() {
    this.saveData();
  }

  public saveData(): void {
    this.calc.print_selected.print_calculate_checked = this.print_calculate_checked;
    this.calc.print_selected.print_section_force_checked = this.print_section_force_checked;
    this.calc.print_selected.print_summary_table_checked = this.print_summary_table_checked;

    this.calc.print_selected.calculate_moment_checked = this.calculate_moment_checked;
    this.calc.print_selected.calculate_shear_force = this.calculate_shear_force_checked;
    this.calc.print_selected.calculate_torsional_moment = this.calculate_torsional_moment_checked;

    this.calc.setColumnData(this.table_datas);
  }

  // 計算開始
  onClick() {

    const user = this.user.userProfile;
    if (!user) {
      this.helper.alert(this.translate.instant("calculation-print.p_login"));
      return;
    }

    this.user.clear(user.uid);

    //console.log('印刷データ準備中...');

    this.loading_enable();

    this.saveData();
    var ui_data: any = this.save.getInputJson();
    ui_data["lang"] = this.language.browserLang;
    ui_data["uid"] = user.uid;

    var column_data = new Array();
    for (var i = 0; this.table_datas.length > i; i++)
      column_data.push({
        GroupName: this.table_datas[i].g_name,
        Checked: this.table_datas[i].calc_checked
      });

    ui_data["member_group_selection"] = column_data;

    console.log(JSON.stringify(ui_data));
    
    const url = environment.calcURL; // サーバ側で集計もPDF生成もするバージョンのAzureFunction

    this.http
      .post(url, ui_data, {
        headers: new HttpHeaders({
          "Content-Type": "application/json",
          "Accept": "*/*"
        }),
        responseType: "text"
      })
      .subscribe(
        (response) => {
          this.loading_disable();

          var resp = JSON.parse(response.toString());

          //console.log("JSON!!!", response.toString());
          //console.log("from JSON!!!", resp);

          this.showPDF(resp.pdf_base64);

          const byteCharacters = atob(resp.excel_base64);
          let byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++)
            byteNumbers[i] = byteCharacters.charCodeAt(i);

          this.summary_data = new Uint8Array(byteNumbers);
          this.hasSummary = true;
        },
        (err) => {
          this.loading_disable();
          this.hasSummary = false;
          console.log("Error response: ", err);
          this.helper.alert(err['error']);
        }
      );
  }

  previewSummary() {
    window.alert("preview excel");
  }

  downloadSummary() {

    const user = this.user.userProfile;
    if (!user) {
      this.helper.alert(this.translate.instant("calculation-print.p_login"));
      return;
    }

    this.user.clear(user.uid);

    //console.log('印刷データ準備中...');

    this.loading_enable();

    this.saveData();
    var ui_data: any = this.save.getInputJson();
    ui_data["lang"] = this.language.browserLang;
    ui_data["uid"] = user.uid;

    var column_data = new Array();
    for (var i = 0; this.table_datas.length > i; i++)
      column_data.push({
        GroupName: this.table_datas[i].g_name,
        Checked: this.table_datas[i].calc_checked
      });

    ui_data["member_group_selection"] = column_data;

    console.log(JSON.stringify(ui_data));

    const url = environment.calcURL; // サーバ側で集計もPDF生成もするバージョンのAzureFunction
    const url_summary = environment.printURL;
    this.http
      .post(url, ui_data, {
        headers: new HttpHeaders({
          "Content-Type": "application/json",
          "Accept": "*/*"
        }),
        responseType: "text"
      })
      .subscribe(
        (response) => {
          this.loading_disable();

          var resp = JSON.parse(response.toString());

          //console.log("JSON!!!", response.toString());
          //console.log("from JSON!!!", resp);

          //this.showPDF(resp.pdf_base64);

          const byteCharacters = atob(resp.excel_base64);
          let byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++)
            byteNumbers[i] = byteCharacters.charCodeAt(i);

          this.summary_data = new Uint8Array(byteNumbers);
          this.hasSummary = true;
          const filename = "dummy.xlsx";
          this._save_summary(filename);
        },
        (err) => {
          this.loading_disable();
          this.hasSummary = false;
          console.log("Error response: ", err);
          this.helper.alert(err['error']);
        }
      );


    //this.http.get('assets/' + filename, { responseType: 'arraybuffer' })
    //  .subscribe((binaryData: ArrayBuffer) => {
    //    this.summary_data = binaryData;
    //    this._save_summary(filename);
    //  });
  }
  pdfSummary() {
    const user = this.user.userProfile;
    if (!user) {
      this.helper.alert(this.translate.instant("calculation-print.p_login"));
      return;
    }

    this.user.clear(user.uid);

    //console.log('印刷データ準備中...');

    this.loading_enable();

    this.saveData();
    var ui_data: any = this.save.getInputJson();
    ui_data["lang"] = this.language.browserLang;
    ui_data["uid"] = user.uid;

    var column_data = new Array();
    for (var i = 0; this.table_datas.length > i; i++)
      column_data.push({
        GroupName: this.table_datas[i].g_name,
        Checked: this.table_datas[i].calc_checked
      });

    ui_data["member_group_selection"] = column_data;

    console.log(JSON.stringify(ui_data));
    //check if get safety ratio list
    const isSR = this.print_safety_ratio_checked;
    let url = environment.calcURL; // サーバ側で集計もPDF生成もするバージョンのAzureFunction
    if (isSR) {
      ui_data['calc']['print_calculate_checked'] = true;
      url = environment.prevURL;
    }
    this.http
      .post(url, ui_data, {
        headers: new HttpHeaders({
          "Content-Type": "application/json",
          "Accept": "*/*"
        }),
        responseType: "text"
      }).subscribe((response: any) => {
        this.loading_disable();
        var resp = JSON.parse(response.toString());
        if (resp.pdf_base64 !== null) {
          this.showPDF(resp.pdf_base64);
          this.hasSummary = true;
        }
      },
        (err) => {
          this.loading_disable();
          this.hasSummary = false;
          console.log("Error response: ", err);
          this.helper.alert(err['error']);
        })
  }

  isAnyPrintCheckboxChecked(): boolean {
    return this.print_section_force_checked || this.print_calculate_checked || this.print_safety_ratio_checked;
  }

  isAnyDownloadCheckboxChecked(): boolean {
    return this.calculate_moment_checked || this.calculate_shear_force_checked || this.calculate_torsional_moment_checked;
  }

  changeButton(el: any) {
    if (el.target.checked && el.target.id !== "print_safety_ratio")
      this.print_safety_ratio_checked = false;
    else if (el.target.checked && el.target.id === "print_safety_ratio") {
      this.print_calculate_checked = false;
      this.print_section_force_checked = false;
      this.consider_moment_checked = false;
    }
  }

  downloadSummaryFun4() {
    const user = this.user.userProfile;
    if (!user) {
      this.helper.alert(this.translate.instant("calculation-print.p_login"));
      return;
    }
    this.loading_enable_download();
    this.user.clear(user.uid);
    this.saveData();
    var ui_data: any = this.save.getInputJson();
    ui_data["lang"] = this.language.browserLang;
    ui_data["uid"] = user.uid;

    var column_data = new Array();
    for (var i = 0; this.table_datas.length > i; i++)
      column_data.push({
        GroupName: this.table_datas[i].g_name,
        Checked: this.table_datas[i].calc_checked
      });

    ui_data["member_group_selection"] = column_data;
    ui_data['calc']['print_calculate_checked'] = true;
    console.log(JSON.stringify(ui_data));

    const url_summary = environment.printURL;
    this.http
      .post(url_summary, ui_data, {
        headers: new HttpHeaders({
          "Content-Type": "application/json",
          "Accept": "*/*"
        }),
        responseType: "text"
      })
      .subscribe(
        (response) => {
          this.loading_disable_dowload();
          var resp = JSON.parse(response.toString());
          const byteCharacters = atob(resp.excel_base64);
          let byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++)
            byteNumbers[i] = byteCharacters.charCodeAt(i);

          this.summary_data = new Uint8Array(byteNumbers);
          this.hasSummary = true;
          const filename = `${Guid.create()}.xlsx`;
          this._save_summary(filename);
        },
        (err) => {
          this.loading_disable_dowload();
          this.hasSummary = false;
          console.log("Error response: ", err);
          this.helper.alert(err['error']);
        }
      );

  }
  @ViewChild('modalPreviewExcel') modalPreviewExcel: any;
  private _save_summary(filename: string) {
    let file = new Blob([this.summary_data],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    let fileURL = URL.createObjectURL(file);

    // const modalRef = this.modalService.open(PreviewExcelComponent, {backdrop: 'static',size: 'lg', keyboard: false, centered: true});
    // modalRef.componentInstance.url = fileURL;
    // modalRef.componentInstance.file = file;

    // this.modalService.open(this.modalPreviewExcel, {backdrop: 'static',size: 'lg', keyboard: false, centered: true});
    //window.open(fileURL, "_blank");

    //const out_filename = "out_" + filename;
    //
    //// 保存する
    if(this.electronService.isElectron)
     this.electronService.ipcRenderer.sendSync('saveFileExcel', filename, this.summary_data);
    else {
      window.open(fileURL, "_blank");
    }
  }

  private showPDF(base64: string) {

    if (this.electronService.isElectron) {
      // electron の場合
      const byteCharacters = atob(base64);
      let byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      let byteArray = new Uint8Array(byteNumbers);
      let file = new Blob([byteArray], { type: 'application/pdf;base64' });
      let fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");

    } else {
      //Webアプリの場合
      printJS({ printable: base64, type: "pdf", base64: true });
    }
  }

  private loading_enable(): void {
    // loadingの表示
    document.getElementById("print-loading").style.display = "block";
    const print_button = document.getElementById("printButton");
    print_button.setAttribute("disabled", "true");
    print_button.style.opacity = "0.7";
  }
  private loading_enable_download(): void {
    // loadingの表示
    document.getElementById("download-loading").style.display = "block";
    const download_button = document.getElementById("downloadButton");
    download_button.setAttribute("disabled", "true");
    download_button.style.opacity = "0.7";
  }

  private loading_disable() {
    document.getElementById("print-loading").style.display = "none";
    const print_button = document.getElementById("printButton");
    print_button.removeAttribute("disabled");
    print_button.style.opacity = "";
  }
  private loading_disable_dowload() {
    document.getElementById("download-loading").style.display = "none";
    const download_button = document.getElementById("downloadButton");
    download_button.removeAttribute("disabled");
    download_button.style.opacity = "";
  }
  public isManual(): boolean {
    return this.save.isManual();
  }
}
