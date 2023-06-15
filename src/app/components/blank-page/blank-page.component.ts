import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { InputCalclationPrintService } from '../calculation-print/calculation-print.service';
import { AppComponent } from "../../app.component";
import { SaveDataService } from "../../providers/save-data.service";

@Component({
  selector: 'app-blank-page',
  templateUrl: './blank-page.component.html',
  styleUrls: ['./blank-page.component.scss']
})
export class BlankPageComponent {

  constructor(public calc: InputCalclationPrintService,
              private router: Router,
              private app: AppComponent,
              private save: SaveDataService,
             ){}

  public download_js_summary()
  {
    var json_data = document.getElementById("p_for_json_data").innerText;
    var test_id = document.getElementById("p_for_test_id").innerText;
    //console.log("TEST ID: ", test_id);
    this.calc.test_id = test_id;

    this.save.readInputData(json_data);
    this.app.memberChange(); // 左側のボタンを有効にする。
    this.app.designPointChange(); // 左側のボタンを有効にする。
  }
}
