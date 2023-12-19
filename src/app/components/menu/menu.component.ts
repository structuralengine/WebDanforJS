import { Component, HostListener, OnInit, ElementRef, ViewChild } from "@angular/core";
import { NgbModal, ModalDismissReasons } from "@ng-bootstrap/ng-bootstrap";
import { AppComponent } from "../../app.component";
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { InputFatiguesService } from '../fatigues/fatigues.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';

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
// import { Auth, getAuth } from "@angular/fire/auth";

import { LanguagesService } from "../../providers/languages.service";
import { ElectronService } from "src/app/providers/electron.service";
import packageJson from '../../../../package.json';
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile } from 'keycloak-js';
import { UserInfoService } from "src/app/providers/user-info.service";
import { MultiWindowService, Message, KnownAppWindow } from 'ngx-multi-window';
import { MenuService } from "./menu.service";
import { MenuBehaviorSubject } from "./menu-behavior-subject.service";

@Component({
  selector: "app-menu",
  templateUrl: "./menu.component.html",
  styleUrls: ["./menu.component.scss"],
})
export class MenuComponent implements OnInit {
  public fileName: string;
  public version: string;
  public pickup_file_name: string;
  public showMenu: boolean = false;
  public specification1_select_id: number;
  public specification2_select_id: number;
  public train_A_count: number;
  public train_B_count: number;
  public service_life: number;


  @ViewChild('grid1') grid1: SheetComponent;
  private table1_datas: any[] = [];
  public options1: pq.gridT.options;

  @ViewChild('grid2') grid2: SheetComponent;
  private table2_datas: any[] = [];
  public options2: pq.gridT.options;

  @ViewChild('grid3') grid3: SheetComponent;
  private table3_datas: any[] = [];
  public options3: pq.gridT.options;


  // 適用 に関する変数
  public specification1_list: any[];
  public specification1_list_file: any[];
  public specification2_list_file: any[];

  // 仕様 に関する変数
  public specification2_list: any[];

  // 設計条件
  public conditions_list: any[];

  public windows: KnownAppWindow[] = [];
  public logs: string[] = [];
  public hideDCJ3_J5: boolean = false;

  constructor(
    private modalService: NgbModal,
    public menuService: MenuService,
    private app: AppComponent,
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private helper: DataHelperModule,
    private dsdData: DsdDataService,
    private router: Router,
    private config: ConfigService,
    public user: UserInfoService,
    private basic: InputBasicInformationService,
    private fatigues: InputFatiguesService,
    private menuBehaviorSubject: MenuBehaviorSubject,
    // public auth: Auth,
    public language: LanguagesService,
    public electronService: ElectronService,
    private translate: TranslateService,
    private elementRef: ElementRef,
    private readonly keycloak: KeycloakService,
    private multiWindowService: MultiWindowService
  ) {
    // this.auth = getAuth();
    this.fileName = "";
    this.pickup_file_name = "";
    this.version = packageJson.version;
  }

  ngOnInit() {
    this.menuService.selectedRoad = false;
    this._renew();
    this.windows = this.multiWindowService.getKnownWindows();
    this.setDefaultOpenControl();
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.openShiyoJoken();
    })
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload($event: BeforeUnloadEvent) {
    if (!this.electronService.isElectron) {
      $event.returnValue = "Your work will be lost. Do you want to leave this site?";
    }
  }
  @HostListener('window:unload')
  unloadHandler() {
    this.multiWindowService.saveWindow();
  }

  @HostListener("document:click", ["$event"])
  public documentClick(event: MouseEvent): void {
    const megaMenuElement = this.elementRef.nativeElement.querySelector(
      ".mega-menu"
    );
    const controlBtnElement = this.elementRef.nativeElement.querySelector(
      ".control-btn"
    );
    if (
      (megaMenuElement && !megaMenuElement.contains(event.target)) &&
      (controlBtnElement && !controlBtnElement.contains(event.target))
    ) {
      this.showMenu = false;
    }
  }
  onKeyDown(event: KeyboardEvent): void {
    //Check if Ctrl and S key are both pressed
    if (event.ctrlKey && (event.key === 'S' || event.key === 's')) {
      event.preventDefault(); // Prevent default behavior of Ctrl + S
      // Perform your action here
      this.overWrite();
    }
  }

  changeInput(){
    this.fatigues.setInputData(
    this.train_A_count,
    this.train_B_count,
    this.service_life);
  }


  public setDefaultOpenControl() {
    const controlBtnElement = this.elementRef.nativeElement.querySelector(
      ".control-btn"
    );
    if (controlBtnElement) {
      this.openShiyoJoken();
      this.showMenu = true;
    }
  }


  public newWindow() {
    //window.open('index.html');     
    this.electronService.ipcRenderer.send("newWindow");
  }

  // 新規作成
  async renew(): Promise<void> {
    const isConfirm = await this.helper.confirm(this.translate.instant("window.confirm"));
    if (isConfirm) {
      this.router.navigate(["/blank-page"]);
      this._renew();
    }
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
    this.showMenu = false;
  }

  // Electron でファイルを開く
  open_electron() {

    const response = this.electronService.ipcRenderer.sendSync('open');
    if (response.status !== true) {
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
          const pik = this.dsdData.readDsdData(response.textB);
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
    this.showMenu = false;

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
            //Check to hide design condition
            this.hideDCJ3_J5 = this.save.hideDC(text);

            //Read file
            this.save.readInputData(text);
            let basicFile = this.save.getBasicData();
            this.specification1_list_file = basicFile.specification1_list;
            this.basic.set_specification1_data_file(this.specification1_list_file);
            this.specification2_list_file = basicFile.specification2_list;
            this.specification2_list_file.forEach(el => {
              this.setSpecification2(el.id,"");
            })
            this.open_done(modalRef);
          })
          .catch((err) => {
            this.open_done(modalRef, err);
          });
    }
    this.showMenu = false;

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
    if (this.fileName === "") {
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
    if (ext != null && (ext[1].toLowerCase() == 'pik' || ext[1].toLowerCase() == "csv")) {
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
    this.showMenu = false;
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
    if (this.electronService.isElectron) {
      this.fileName = this.electronService.ipcRenderer.sendSync('saveFile', this.fileName, inputJson);
    } else {
      const blob = new window.Blob([inputJson], { type: "text/plain" });
      FileSaver.saveAs(blob, this.fileName);
    }
  }

  // ログイン関係
  async logIn() {
    if (this.electronService.isElectron) {
      this.modalService.open(LoginDialogComponent, { backdrop: false }).result.then((result) => { });
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
      "https://help-webdan.malme.app/",
      "_blank"
    );
  }

  public setSpecification1(i: number): void {
    this.basic.id=i;
    const basic = this.basic.set_specification1(i);
    this.specification1_list = basic.specification1_list; // 適用
    
    ///temporary set default spe_2.2: "partial coefficient method"
    if(i === 2)
    {
      this.menuService.setStressMethod(false)
      basic.specification2_list.map(obj => 
        obj.selected = (obj.id === 6) ? true : false);
        this.specification2_select_id = 6;
      }
      
      this.specification2_list = basic.specification2_list; // 仕様
      this.conditions_list = basic.conditions_list;         //  設計条件
      
      this.table1_datas = basic.pickup_moment;
      this.table2_datas = basic.pickup_shear_force;
      this.table3_datas = basic.pickup_torsional_moment;
      
      if (!(this.grid1 == null))
       this.grid1.refreshDataAndView();
      if (!(this.grid2 == null))
       this.grid2.refreshDataAndView();
      if (!(this.grid3 == null))
       this.grid3.refreshDataAndView();
      this.specification1_select_id = i;
      this.menuService.selectApply(i);
      this.menuBehaviorSubject.setValue(i.toString());
      this.router.navigate(['./basic-information']);
    for (let i = 0; i <= 12; i++) {
      const data = document.getElementById(i + "");
      if (data != null) {
        if (data.classList.contains("is-active")) {
          data.classList.remove("is-active");
        }
      }
    }
    document.getElementById("0").classList.add("is-active");
  }

  /// 仕様 変更時の処理
  public setSpecification2(id: number,type:string): void {
    this.specification2_list.map(
      obj => {
        obj.selected = (obj.id === id) ? true : false
        if(id===7 && type ==="click"){
          this.menuService.setStressMethod(obj.selected);
          this.basic.id=3;
          const basic = this.basic.set_specification1(3);
          this.table1_datas = basic.pickup_moment;
          this.table2_datas = basic.pickup_shear_force;
          this.table3_datas = basic.pickup_torsional_moment;
          if (!(this.grid1 == null))
           this.grid1.refreshDataAndView();
          if (!(this.grid2 == null))
           this.grid2.refreshDataAndView();
          if (!(this.grid3 == null))
           this.grid3.refreshDataAndView();
          this.menuBehaviorSubject.setValue("3");
          this.router.navigate(['./basic-information']);
          for (let i = 0; i <= 12; i++) {
            const data = document.getElementById(i + "");
            if (data != null) {
              if (data.classList.contains("is-active")) {
                data.classList.remove("is-active");
              }
            }
          }
          document.getElementById("0").classList.add("is-active");
        }
        if(id!==7 && type ==="click"){
          this.menuService.setStressMethod(false);
          this.basic.id=0;
          const basic = this.basic.set_specification1(this.specification1_select_id);
          this.table1_datas = basic.pickup_moment;
          this.table2_datas = basic.pickup_shear_force;
          this.table3_datas = basic.pickup_torsional_moment;
          if (!(this.grid1 == null))
            this.grid1.refreshDataAndView();
          if (!(this.grid2 == null))
            this.grid2.refreshDataAndView();
          if (!(this.grid3 == null))
            this.grid3.refreshDataAndView();
          this.menuBehaviorSubject.setValue(this.specification1_select_id.toString());
          this.router.navigate(['./basic-information']);
          for (let i = 0; i <= 12; i++) {
            const data = document.getElementById(i + "");
            if (data != null) {
              if (data.classList.contains("is-active")) {
                data.classList.remove("is-active");
              }
            }
          }
          document.getElementById("0").classList.add("is-active");
        }
      });
    this.specification2_select_id = id;
  }

  // 耐用年数, jA, jB
  public openShiyoJoken() {
    const basic = this.basic.getSaveData();
    // 適用
    this.basic.updateTitleSpecification(1, basic.specification1_list)
    this.specification1_list = basic.specification1_list;
    this.specification1_select_id = this.basic.get_specification1();

    // 仕様
    this.basic.updateTitleSpecification(2, basic.specification2_list)
    this.specification2_list = basic.specification2_list;
    this.specification2_select_id = this.basic.get_specification2();
    //  設計条件
    this.basic.updateTitleCondition(basic.conditions_list)
    this.conditions_list = basic.conditions_list;

    this.table1_datas = basic.pickup_moment;
    this.table2_datas = basic.pickup_shear_force;
    this.table3_datas = basic.pickup_torsional_moment;

    const fatigues = this.fatigues.getSaveData();
    this.train_A_count = fatigues.train_A_count;
    this.train_B_count = fatigues.train_B_count;
    this.service_life = fatigues.service_life;
  }

  ngOnDestroy() {
    this.saveData();
  }

  public saveData(): void {
    this.basic.setSaveData({
      pickup_moment: this.table1_datas,
      pickup_shear_force: this.table2_datas,
      pickup_torsional_moment: this.table3_datas,

      specification1_list: this.specification1_list, // 適用
      specification2_list: this.specification2_list, // 仕様
      conditions_list: this.conditions_list         // 設計条件
    });
  }

  public changeDesignCondition(item: any) {
    if (item.id === "JR-003" && item.selected) {
      const jR005 = this.conditions_list.find(item => item.id === "JR-005");
      if (jR005 && jR005.selected) {
        jR005.selected = false;
      }
    }
    else if (item.id === "JR-005" && item.selected) {
      const jR003 = this.conditions_list.find(item => item.id === "JR-003");
      if (jR003 && jR003.selected) {
        jR003.selected = false;
      }
    }
    if (item.id === "JR-003" || item.id === "JR-005")
      this.members.setGTypeForMembers();
  }
}