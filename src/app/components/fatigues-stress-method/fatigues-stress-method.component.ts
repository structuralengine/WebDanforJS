import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';

import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { AppComponent } from 'src/app/app.component';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { TranslateService } from "@ngx-translate/core";
import { InputMembersService } from '../members/members.service';

@Component({
  selector: 'app-fatigues',
  templateUrl: './fatigues-stress-method.component.html',
  styleUrls: ['./fatigues-stress-method.component.scss', '../subNavArea.scss']
})
export class FatiguesStressMethodComponent implements OnInit, OnDestroy, AfterViewInit {


  constructor(
   
    ) { }

  ngOnInit() {

  }

  ngAfterViewInit() {
   
  }
  ngOnDestroy() {
  
  }

}
