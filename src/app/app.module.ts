import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';  
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HttpClientModule, HttpClient } from '@angular/common/http';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';

import { CoreModule } from './core/core.module';
import { AngularFireModule } from '@angular/fire';
import { AuthGuard } from './guard/auth.guard';


import { WebviewDirective } from './directives/webview.directive';

import { AppComponent } from './app.component';
import { HotTableModule } from '@handsontable/angular';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxPrintModule } from 'ngx-print';

import { DataHelperModule } from './providers/data-helper.module';
import { InputBasicInformationService } from './components/basic-information/basic-information.service';
import { InputMembersService } from './components/members/members.service';
import { InputDesignPointsService } from './components/design-points/design-points.service';
import { InputBarsService } from './components/bars/bars.service';
import { InputSteelsService } from './components/steels/steels.service';
import { InputFatiguesService } from './components/fatigues/fatigues.service';
import { InputSafetyFactorsMaterialStrengthsService } from './components/safety-factors-material-strengths/safety-factors-material-strengths.service';
import { InputSectionForcesService } from './components/section-forces/section-forces.service';
import { InputCalclationPrintService } from './components/calculation-print/calculation-print.service';
import { SaveDataService } from './providers/save-data.service';

import { UserInfoService } from './providers/user-info.service';
import { ConfigService } from './/providers/config.service';

import { MenuComponent } from './components/menu/menu.component';
import { LoginDialogComponent } from './components/login-dialog/login-dialog.component';
import { WaitDialogComponent } from './components/wait-dialog/wait-dialog.component';

import { BlankPageComponent } from './components/blank-page/blank-page.component';
import { BasicInformationComponent } from './components/basic-information/basic-information.component';
import { MembersComponent } from './components/members/members.component';
import { DesignPointsComponent } from './components/design-points/design-points.component';
import { BarsComponent } from './components/bars/bars.component';
import { FatiguesComponent } from './components/fatigues/fatigues.component';
import { SafetyFactorsMaterialStrengthsComponent } from './components/safety-factors-material-strengths/safety-factors-material-strengths.component';
import { SectionForcesComponent } from './components/section-forces/section-forces.component';
import { SteelsComponent } from './components/steels/steels.component';
import { CrackSettingsComponent } from './components/crack/crack-settings.component';
import { CalculationPrintComponent } from './components/calculation-print/calculation-print.component';
import { SheetComponent } from './components/sheet/sheet.component';

import { ResultDataService } from './calculation/result-data.service';
import { CalcSafetyMomentService } from './calculation/result-safety-moment/calc-safety-moment.service';
import { CalcSafetyShearForceService } from './calculation/result-safety-shear-force/calc-safety-shear-force.service';
import { CalcSafetyFatigueMomentService } from './calculation/result-safety-fatigue-moment/calc-safety-fatigue-moment.service';
import { CalcSafetyFatigueShearForceService } from './calculation/result-safety-fatigue-shear-force/calc-safety-fatigue-shear-force.service';
import { CalcServiceabilityMomentService } from './calculation/result-serviceability-moment/calc-serviceability-moment.service';
import { CalcServiceabilityShearForceService } from './calculation/result-serviceability-shear-force/calc-serviceability-shear-force.service';
import { CalcDurabilityMomentService } from './calculation/result-durability-moment/calc-durability-moment.service';
import { CalcRestorabilityMomentService } from './calculation/result-restorability-moment/calc-restorability-moment.service';
import { CalcRestorabilityShearForceService } from './calculation/result-restorability-shear-force/calc-restorability-shear-force.service';
import { CalcEarthquakesMomentService } from './calculation/result-earthquakes-moment/calc-earthquakes-moment.service';
import { CalcEarthquakesShearForceService } from './calculation/result-earthquakes-shear-force/calc-earthquakes-shear-force.service';

import { ResultViewerComponent } from './calculation/result-viewer/result-viewer.component';
import { ResultSafetyMomentComponent } from './calculation/result-safety-moment/result-safety-moment.component';
import { ResultSafetyShearForceComponent } from './calculation/result-safety-shear-force/result-safety-shear-force.component';
import { ResultDurabilityMomentComponent } from './calculation/result-durability-moment/result-durability-moment.component';
import { ResultSafetyFatigueMomentComponent } from './calculation/result-safety-fatigue-moment/result-safety-fatigue-moment.component';
import { ResultSafetyFatigueShearForceComponent } from './calculation/result-safety-fatigue-shear-force/result-safety-fatigue-shear-force.component';
import { ResultServiceabilityMomentComponent } from './calculation/result-serviceability-moment/result-serviceability-moment.component';
import { ResultServiceabilityShearForceComponent } from './calculation/result-serviceability-shear-force/result-serviceability-shear-force.component';
import { ResultRestorabilityMomentComponent } from './calculation/result-restorability-moment/result-restorability-moment.component';
import { ResultRestorabilityShearForceComponent } from './calculation/result-restorability-shear-force/result-restorability-shear-force.component';
import { ResultEarthquakesMomentComponent } from './calculation/result-earthquakes-moment/result-earthquakes-moment.component';
import { ResultEarthquakesShearForceComponent } from './calculation/result-earthquakes-shear-force/result-earthquakes-shear-force.component';
import { ResultSummaryTableComponent } from './calculation/result-summary-table/result-summary-table.component';
import { SectionForceListComponent } from './calculation/section-force-list/section-force-list.component';

import { SetDesignForceService} from './calculation/set-design-force.service';
import { SetPostDataService} from './calculation/set-post-data.service';
import { environment } from 'src/environments/environment';

@NgModule({
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    DragDropModule,
    BrowserAnimationsModule,
    NgbModule,
    NgxPrintModule,
    HotTableModule,
    AngularFireModule.initializeApp(environment.firebase),
    CoreModule,
    DataHelperModule
  ],
  declarations: [
    AppComponent,
    WebviewDirective,
    MenuComponent,
    LoginDialogComponent,
    WaitDialogComponent,
    ResultViewerComponent,
    BasicInformationComponent,
    MembersComponent,
    DesignPointsComponent,
    BarsComponent,
    FatiguesComponent,
    SafetyFactorsMaterialStrengthsComponent,
    SectionForcesComponent,
    CalculationPrintComponent,
    BlankPageComponent,

    SheetComponent,

    ResultSafetyMomentComponent,
    ResultSafetyShearForceComponent,
    ResultDurabilityMomentComponent,
    ResultSafetyFatigueMomentComponent,
    ResultSafetyFatigueShearForceComponent,
    ResultServiceabilityMomentComponent,
    ResultServiceabilityShearForceComponent,
    ResultRestorabilityMomentComponent,
    ResultRestorabilityShearForceComponent,
    ResultEarthquakesMomentComponent,
    ResultEarthquakesShearForceComponent,
    ResultSummaryTableComponent,
    SectionForceListComponent,
    SteelsComponent,
    CrackSettingsComponent
  ],
  entryComponents: [
    LoginDialogComponent,
    WaitDialogComponent,
    ResultViewerComponent
  ],
  providers: [
    UserInfoService,
    ConfigService,
    AuthGuard,

    InputBasicInformationService,
    InputMembersService,
    InputDesignPointsService,
    InputBarsService,
    InputSteelsService,
    InputFatiguesService,
    InputSafetyFactorsMaterialStrengthsService,
    InputSectionForcesService,
    InputCalclationPrintService,
    SaveDataService,

    ResultDataService,
    CalcSafetyMomentService,
    CalcSafetyShearForceService,
    CalcSafetyFatigueMomentService,
    CalcSafetyFatigueShearForceService,
    CalcServiceabilityMomentService,
    CalcServiceabilityShearForceService,
    CalcDurabilityMomentService,
    CalcRestorabilityMomentService,
    CalcRestorabilityShearForceService,
    CalcEarthquakesMomentService,
    CalcEarthquakesShearForceService,

    SetDesignForceService,
    SetPostDataService,

    // ??????????????????????????????????????????????????????????????????????????????????????????????????????
    // declarations ????????????????????????(providers) ??????????????????
    // ???????????????????????????????????????????????????????????????????????????
    ResultSafetyShearForceComponent,
    ResultSafetyMomentComponent,
    ResultRestorabilityMomentComponent,
    ResultRestorabilityShearForceComponent,
    ResultServiceabilityMomentComponent,
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }
