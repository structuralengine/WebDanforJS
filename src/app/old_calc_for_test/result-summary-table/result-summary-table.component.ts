import { Component, OnInit, AfterViewInit } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { CalcSummaryTableService } from './calc-summary-table.service';
import { TranslateService } from "@ngx-translate/core";
import { InputCalclationPrintService } from "../../components/calculation-print/calculation-print.service";

@Component({
  selector: 'app-result-summary-table',
  templateUrl: './result-summary-table.component.html',
  styleUrls: ['./result-summary-table.component.scss']
})
export class ResultSummaryTableComponent implements OnInit, AfterViewInit {
  //
  public summary_table: any;
  public isSRC: boolean = false;

  constructor(
    private helper: DataHelperModule,
    private calc: CalcSummaryTableService,
    private calc_print: InputCalclationPrintService,
    private translate: TranslateService,
    ) { }

  ngOnInit() {
    // 初期化
    this.summary_table = new Array();
    this.isSRC = this.calc.isSRC;
    // 総括表の index配列を取得
    const keys = Object.keys(this.calc.summary_table);
    keys.sort(); // 並び変える
    // 並び変えた順に登録
    for(const k of keys){
      this.summary_table.push(this.calc.summary_table[k]);
    }
    // 総括表の高さを設定する
    const table = document.getElementById("userinput");
    const height = window.innerHeight;
    table.style.height = (height *0.9) + 'px';
  }

   /* To copy Text from Textbox */
  public copyInputMessage($tbody) {
    const selBox = document.createElement("textarea");
    selBox.style.position = "fixed";
    selBox.style.left = "0";
    selBox.style.top = "0";
    selBox.style.opacity = "0";
    selBox.value = this.helper.table_To_text($tbody);
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();

    document.execCommand("copy");
    //navigator.clipboard.writeText(selBox.value);

    document.body.removeChild(selBox);

    //console.log("CSV DATA??: ", this.helper.table_To_text($tbody));

    let filename = this.calc_print.test_id;

    //console.log("FILENAME: ", filename);
    const pos = filename.lastIndexOf('.');
    if (pos !== -1)
      filename = filename.slice(0, pos);

    filename = "JS_out_" + filename + ".csv"

    let file = new Blob([this.helper.table_To_text($tbody)], { type: 'text/csv' });
    let fileURL = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = fileURL;
    link.download = filename
    link.click();

    // For Firefox it is necessary to delay revoking the ObjectURL.
    setTimeout(() => {
      window.URL.revokeObjectURL(fileURL);
    }, 250);

    //window.location.assign(fileURL);
    //URL.revokeObjectURL(fileURL);
  }

  ngAfterViewInit(): void {
    /*
      document.querySelector('copybutton').addEventListener('click', () => {
      navigator.clipboard.writeText(this.helper.table_To_text($tbody))
      .then(() => {
      console.log('Text copied.');
      })
      .catch(() => {
      console.log('Failed to copy text.');
      });
      });
    */
  }
}
