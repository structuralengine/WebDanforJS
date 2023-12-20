import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { InputMembersService } from '../members/members.service';
import { visitAll } from '@angular/compiler';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-safety-factors-material-strengths',
  templateUrl: './safety-factors-material-strengths-stress-method.component.html',
  styleUrls: ['./safety-factors-material-strengths-stress-method.component.scss', '../subNavArea.scss']
})
export class SafetyFactorsMaterialStrengthsStressMethodComponent
  implements OnInit, OnDestroy, AfterViewInit {
  
  constructor(
    
  ) { }

  ngOnInit() {
   
  }

  ngAfterViewInit() {
  
   
  }
  ngAfterContentChecked() {
    
 }
 
  ngOnDestroy(): void {
   
  }
 
}
