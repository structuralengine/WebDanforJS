import { parse } from 'path';
import { forEach } from 'jszip';
import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { MenuService } from '../menu/menu.service';
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { log } from 'console';
import { hide } from '@popperjs/core';


@Component({
  selector: 'app-section-forces-stress-method',
  templateUrl: './section-forces-stress-method.component.html',
  styleUrls: ['./section-forces-stress-method.component.scss']
})
export class SectionForcesStressMethodComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(

     ) { }

  
  
  

  ngOnInit() {
   

  
  }

 

  ngAfterViewInit() {
   
  }

 


  ngOnDestroy(): void {
   
   
  }
 

}
