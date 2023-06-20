import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { InputCalclationPrintService } from './calculation-print.service';
import { SaveDataService } from '../../providers/save-data.service';

import { Auth, getAuth } from "@angular/fire/auth";
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
  // 照査
  public calculate_moment_checked: boolean;
  public calculate_shear_force_checked: boolean;
  public calculate_torsional_moment_checked: boolean;
  // 部材
  public table_datas: any[];

  public hasSummary:boolean=false;
  private summary_data;

  constructor(
    private calc: InputCalclationPrintService,
    private save: SaveDataService,
    private router: Router,
    private http: HttpClient,
    private user: UserInfoService,
    public auth: Auth,
    public electronService: ElectronService,
    private translate: TranslateService,
    public language: LanguagesService,
    private helper: DataHelperModule
  ) {
    this.auth = getAuth();
  }

  ngOnInit() {

    this.print_calculate_checked = this.calc.print_selected.print_calculate_checked;
    this.print_section_force_checked = this.calc.print_selected.print_section_force_checked;
    this.print_summary_table_checked = this.calc.print_selected.print_summary_table_checked;

    this.calculate_moment_checked = this.calc.print_selected.calculate_moment_checked;
    this.calculate_shear_force_checked = this.calc.print_selected.calculate_shear_force;
    this.calculate_torsional_moment_checked = this.calc.print_selected.calculate_torsional_moment;

    this.table_datas = new Array();
    for ( const data of this.calc.getColumnData()) {
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

  // テストデータ生成
  // JavaScriptで照査表・総括表を作っていたときの処理はテストデータ生成として生かしている
  generateTestData() {
    if(this.auth.currentUser !== null)
      this.user.clear(this.auth.currentUser.uid);

    this.router.navigate(['/result-viewer']);
  }

  // 計算開始
  onClick() {

    const user = this.user.userProfile;
    if(!user){
      this.helper.alert(this.translate.instant("calculation-print.p_login"));
      return;
    }

    this.user.clear(user.uid);

    this.loading_enable();

    this.saveData();
    var ui_data: any = this.save.getInputJson();
    ui_data["lang"] = this.language.browserLang;
    ui_data["uid"] = user.uid;

    var column_data = new Array();
    for(var i=0; this.table_datas.length>i; i++)
      column_data.push({GroupName: this.table_datas[i].g_name,
                        Checked: this.table_datas[i].calc_checked});

    ui_data["member_group_selection"] = column_data;

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
          this.hasSummary=true;
        },
        (err) => {
          this.loading_disable();
          this.hasSummary=false;
          console.log("Error response: ", err);
          this.helper.alert(err['error']);
        }
      );
  }

  previewSummary() {
    window.alert("preview excel");
  }

  downloadSummary() {

    let filename = document.getElementById("filename_in_menu").innerText;

    //console.log("FILENAME: ", filename);
    const pos = filename.lastIndexOf('.');
    if (pos !== -1)
      filename = filename.slice(0, pos);

    filename = "EXCEL_SRC_" + filename + ".xlsx"

    let file = new Blob([this.summary_data],
                        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    let fileURL = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = fileURL;
    link.download = filename
    link.click();

    // For Firefox it is necessary to delay revoking the ObjectURL.
    setTimeout(() => {
      window.URL.revokeObjectURL(fileURL);
    }, 250);

    //const out_filename = "out_" + filename;
    //
    //// 保存する
    //if(this.electronService.isElectron)
    //  this.electronService.ipcRenderer.sendSync('saveFile', filename, this.summary_data);
    //else {
    //  const blob =
    //    new window.Blob([this.summary_data],
    //                    {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    //  FileSaver.saveAs(blob, filename);
    //}
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

  private loading_disable() {
    document.getElementById("print-loading").style.display = "none";
    const print_button = document.getElementById("printButton");
    print_button.removeAttribute("disabled");
    print_button.style.opacity = "";
  }

  public isManual(): boolean{
    return this.save.isManual();
  }
}
