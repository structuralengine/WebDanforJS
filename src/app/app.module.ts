import { BrowserModule } from "@angular/platform-browser";
import { CommonModule, HashLocationStrategy, LocationStrategy } from "@angular/common";
import { APP_INITIALIZER, NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { HttpClientModule, HttpClient } from "@angular/common/http";

import { DragDropModule } from "@angular/cdk/drag-drop";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { AppRoutingModule } from "./app-routing.module";

// import { initializeApp, provideFirebaseApp } from "@angular/fire/app";
// import { getAuth, provideAuth } from '@angular/fire/auth';
// import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { AppComponent } from "./app.component";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { NgxPrintModule } from "ngx-print";

import { DataHelperModule } from "./providers/data-helper.module";
import { InputBasicInformationService } from "./components/basic-information/basic-information.service";
import { InputMembersService } from "./components/members/members.service";
import { InputDesignPointsService } from "./components/design-points/design-points.service";
import { InputBarsService } from "./components/bars/bars.service";
import { InputSteelsService } from "./components/steels/steels.service";
import { InputFatiguesService } from "./components/fatigues/fatigues.service";
import { InputSafetyFactorsMaterialStrengthsService } from "./components/safety-factors-material-strengths/safety-factors-material-strengths.service";
import { InputSectionForcesService } from "./components/section-forces/section-forces.service";
import { InputCalclationPrintService } from "./components/calculation-print/calculation-print.service";
import { SaveDataService } from "./providers/save-data.service";

import { UserInfoService } from "./providers/user-info.service";
import { ConfigService } from ".//providers/config.service";

import { MenuComponent } from "./components/menu/menu.component";
import { LoginDialogComponent } from "./components/login-dialog/login-dialog.component";
import { WaitDialogComponent } from "./components/wait-dialog/wait-dialog.component";
import { AlertDialogComponent } from "./components/alert-dialog/alert-dialog.component";

import { BlankPageComponent } from "./components/blank-page/blank-page.component";
import { BasicInformationComponent } from "./components/basic-information/basic-information.component";
import { MembersComponent } from "./components/members/members.component";
import { DesignPointsComponent } from "./components/design-points/design-points.component";
import { BarsComponent } from "./components/bars/bars.component";
import { FatiguesComponent } from "./components/fatigues/fatigues.component";
import { SafetyFactorsMaterialStrengthsComponent } from "./components/safety-factors-material-strengths/safety-factors-material-strengths.component";
import { SectionForcesComponent } from "./components/section-forces/section-forces.component";
import { SteelsComponent } from "./components/steels/steels.component";
import { CrackSettingsComponent } from "./components/crack/crack-settings.component";
import { CalculationPrintComponent } from "./components/calculation-print/calculation-print.component";
import { SheetComponent } from "./components/sheet/sheet.component";

import { environment } from "src/environments/environment";

import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { ElectronService } from "./providers/electron.service";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { ChatComponent } from './components/chat/chat.component';
import { ShearComponent } from './components/shear/shear.component';

import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { ActivateSessionComponent } from './components/activate-session/activate-session.component';

import { PreviewExcelComponent } from "./components/preview-excel/preview-excel.component";
import { IgxExcelModule } from 'igniteui-angular-excel';
import { IgxSpreadsheetModule } from 'igniteui-angular-spreadsheet';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {MultiWindowConfig, MultiWindowModule, WindowSaveStrategy} from 'ngx-multi-window'


const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader =>
  new TranslateHttpLoader(http, "./assets/i18n/", ".json");
const config: MultiWindowConfig = {windowSaveStrategy: WindowSaveStrategy.SAVE_WHEN_EMPTY};
function initializeKeycloak(keycloak: KeycloakService) {
    console.log("initializaing keycloak");
    return () => keycloak.init({
        config: {
            url: 'https://auth.malme.app',
            realm: 'structural-engine',
            clientId: 'structural-engine'
        },
        initOptions: {
            onLoad: 'check-sso',
        }
    }).catch(error => window.alert("自動ログインに失敗しました。"));
}

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
        KeycloakAngularModule,
        // provideFirebaseApp(() => initializeApp(environment.firebase)),
        // provideAuth(() => getAuth()),
        // provideFirestore(() => getFirestore()),
        DataHelperModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: httpLoaderFactory,
                deps: [HttpClient],
            },
            defaultLanguage: "ja",
        }),
        IgxExcelModule,
        IgxSpreadsheetModule,
        MultiWindowModule.forRoot(config),
    ],
    declarations: [
        AppComponent,
        AlertDialogComponent,
        MenuComponent,
        LoginDialogComponent,
        WaitDialogComponent,
        AlertDialogComponent,
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
        SteelsComponent,
        CrackSettingsComponent,
        ChatComponent,
        ShearComponent,
        ActivateSessionComponent,
        PreviewExcelComponent
    ],
    providers: [
        UserInfoService,
        ConfigService,
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
        // 計算結果コンポーネントで他のコンポーネントから使いまわされるものは
        // declarations だけではなくココ(providers) にも宣言して
        // 他のコンポーネントから機能の一部を使えるようにする
        ElectronService,
        {
            provide: APP_INITIALIZER,
            useFactory: initializeKeycloak,
            multi: true,
            deps: [KeycloakService]
        },
        NgbActiveModal,
    ],
    entryComponents: [PreviewExcelComponent],
    bootstrap: [AppComponent],
})
export class AppModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}
