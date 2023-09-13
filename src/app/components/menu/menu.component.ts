﻿import { Component, HostListener, OnInit, ViewChild } from "@angular/core";
import { NgbModal, ModalDismissReasons } from "@ng-bootstrap/ng-bootstrap";
import { AppComponent } from "../../app.component";

import {
  Router,
  ActivatedRoute,
  ParamMap,
  NavigationEnd,
} from "@angular/router";

import { LoginDialogComponent } from "../login-dialog/login-dialog.component";
import { WaitDialogComponent } from "../wait-dialog/wait-dialog.component";

import * as FileSaver from "file-saver";
import { SaveDataService } from "../../providers/save-data.service";
import { ConfigService } from "../../providers/config.service";
import { DsdDataService } from "src/app/providers/dsd-data.service";

import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputMembersService } from "../members/members.service";
import { InputDesignPointsService } from "../design-points/design-points.service";
import { Auth, getAuth } from "@angular/fire/auth";

import { LanguagesService } from "../../providers/languages.service";
import { ElectronService } from "src/app/providers/electron.service";
import packageJson from '../../../../package.json';
import { TranslateService } from "@ngx-translate/core";
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile } from 'keycloak-js';
import { UserInfoService } from "src/app/providers/user-info.service";

@Component({
  selector: "app-menu",
  templateUrl: "./menu.component.html",
  styleUrls: ["./menu.component.scss"],
})
export class MenuComponent implements OnInit {
  public fileName: string;
  public version: string;
  public pickup_file_name: string; 
  constructor(
    private modalService: NgbModal,
    private app: AppComponent,
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private helper: DataHelperModule,
    private dsdData: DsdDataService,
    private router: Router,
    private config: ConfigService,
    public user: UserInfoService,
    public auth: Auth,
    public language: LanguagesService,
    public electronService: ElectronService,
    private translate: TranslateService,

    private readonly keycloak: KeycloakService
  ) {
    this.auth = getAuth();
    this.fileName = "";
    this.pickup_file_name = "";
    this.version = packageJson.version;
  }

  ngOnInit() {
    this._renew();    
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload($event: BeforeUnloadEvent) {
    if (!this.electronService.isElectron) {
      $event.returnValue = "Your work will be lost. Do you want to leave this site?";
    }
  }
  
  // 新規作成
  renew(): void {
    this.router.navigate(["/blank-page"]);
    this._renew();
  }

  private _renew(): void {
    this.app.deactiveButtons();

    // this.fileName = "";
    this.fileName = "";
    this.pickup_file_name = "";

    setTimeout(() => {
      this.save.clear();
      this.app.memberChange(false); // 左側のボタンを無効にする。
    }, 10);
  }

  // Electron でファイルを開く
  open_electron(){

    const response = this.electronService.ipcRenderer.sendSync('open');

    if(response.status!==true){
      this.helper.alert(this.translate.instant("menu.fail") + response.status);
      return;
    }
    const modalRef = this.modalService.open(WaitDialogComponent);
    this.fileName = response.path;

    this.router.navigate(["/blank-page"]);  // ngOnDestroyと非同期
    this.app.deactiveButtons();

    setTimeout(() => {
      switch (this.helper.getExt(this.fileName)) {
        case "dsd":
          const pik = this.dsdData.readDsdData(response.text);
          this.open_done(modalRef);
          if (pik !== null) {
            this.helper.alert(pik + this.translate.instant("menu.open"));
          }
          break;
        default:
          this.save.readInputData(response.text);
          this.open_done(modalRef);
      }
    }, 10);

  }

  // ファイルを開く
  open(evt) {
    const modalRef = this.modalService.open(WaitDialogComponent);
    const file = evt.target.files[0];
    this.fileName = file.name;
    evt.target.value = "";

    this.router.navigate(["/blank-page"]);
    this.app.deactiveButtons();

    switch (this.helper.getExt(this.fileName)) {
      case "dsd":
        this.fileToBinary(file)
          .then((buff) => {
            const pik = this.dsdData.readDsdData(buff);
            this.open_done(modalRef);
            if (pik !== null) {
              this.helper.alert(pik + this.translate.instant("menu.open"));
            }
          })
          .catch((err) => {
            this.open_done(modalRef, err);
          });
        break;
      default:
        this.fileToText(file)
          .then((text) => {
            this.save.readInputData(text);
            this.open_done(modalRef);
          })
          .catch((err) => {
            this.open_done(modalRef, err);
          });
    }

  }

  private open_done(modalRef, error = null) {
    // 後処理
    if (error === null) {
      this.pickup_file_name = this.save.getPickupFilename();
      this.app.memberChange(); // 左側のボタンを有効にする。
      this.app.designPointChange(); // 左側のボタンを有効にする。
    } else {
      this.helper.alert(error);
    }

    modalRef.close();
  }

  // 上書き保存
  // 上書き保存のメニューが表示されるのは electron のときだけ
  public overWrite(): void {
    if (this.fileName === ""){
      this.fileSave();
      return;
    }
    this.config.saveActiveComponentData();
    const inputJson: string = this.save.getInputText();
    this.fileName = this.electronService.ipcRenderer.sendSync('overWrite', this.fileName, inputJson);
  }

  // ピックアップファイルを開く
  pickup(evt) {
    const file = evt.target.files[0];
    var ext = /^.+\.([^.]+)$/.exec(file.name);
    if (ext != null && (ext[1] == 'pik' || ext[1] == "csv")) {
      const modalRef = this.modalService.open(WaitDialogComponent);
      evt.target.value = "";

      this.router.navigate(["/blank-page"]);
      this.app.deactiveButtons();

      this.fileToText(file)
        .then((text) => {
          this.save.readPickUpData(text, file.name); // データを読み込む
          this.pickup_file_name = this.save.getPickupFilename();
          modalRef.close();
        })
        .catch((err) => {
          modalRef.close();
          console.log(err);
        });
    } else {
      this.helper.alert(this.translate.instant("menu.acceptedFile"));
    }
  }

  // ファイルのテキストを読み込む
  private fileToText(file): any {
    const reader = new FileReader();
    reader.readAsText(file);
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
    });
  }

  // バイナリのファイルを読み込む
  private fileToBinary(file): any {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
    });
  }

  // ファイルを保存
  public fileSave(): void {
    this.config.saveActiveComponentData();
    const inputJson: string = this.save.getInputText();
    if (this.fileName.length === 0) {
      this.fileName = "WebDan.wdj";
    }

    if (this.helper.getExt(this.fileName) !== "wdj") {
      this.fileName += ".wdj";
    }
    // 保存する
    if(this.electronService.isElectron) {
      this.fileName = this.electronService.ipcRenderer.sendSync('saveFile', this.fileName, inputJson);
    } else {
      const blob = new window.Blob([inputJson], { type: "text/plain" });
      FileSaver.saveAs(blob, this.fileName);
    }
  }

  // ログイン関係
  async logIn() {
    if (this.electronService.isElectron) {
      this.modalService.open(LoginDialogComponent, {backdrop: false}).result.then((result) => {});
    } else {
      this.keycloak.login();
    }
  }

  logOut(): void {
    if (this.electronService.isElectron) {
      this.user.setUserProfile(null);
    } else {
      this.keycloak.logout(window.location.origin);
      this.user.setUserProfile(null);
    }    
  }
  
  public goToLink() {
    window.open(
      "https://fresh-tachometer-148.notion.site/WebDan-5a22f8541cb14d27b56389fec84b580f?pvs=4",
      "_blank"
    );
  }
  
}
