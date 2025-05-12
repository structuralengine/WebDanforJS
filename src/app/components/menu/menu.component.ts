import { Component, HostListener, OnInit, ElementRef, ViewChild, Inject } from "@angular/core";
import { NgbModal, ModalDismissReasons } from "@ng-bootstrap/ng-bootstrap";
import { AppComponent } from "../../app.component";
import { InputBasicInformationService } from '../basic-information/basic-information.service';
// import { InputFatiguesService } from '../fatigues/fatigues.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { read } from 'xlsx';

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

import { UserInfoService } from "src/app/providers/user-info.service";
import { MultiWindowService, Message, KnownAppWindow } from 'ngx-multi-window';
import { MenuService } from "./menu.service";
import { MenuBehaviorSubject } from "./menu-behavior-subject.service";
import { InputCrackSettingsService } from "../crack/crack-settings.service";
import { InputBarsService } from "../bars/bars.service";
import { ShearStrengthService } from "../shear/shear-strength.service";
import { Subject } from 'rxjs';
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService } from "@azure/msal-angular";
import { RedirectRequest, InteractionStatus, EventMessage, EventType, IdTokenClaims, PopupRequest, AuthenticationResult, AccountInfo, SsoSilentRequest, PromptValue, } from "@azure/msal-browser";
import { filter, takeUntil } from 'rxjs/operators';
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { IPC_MESSAGES } from "src/electron/login/constants";

type IdTokenClaimsWithPolicyId = IdTokenClaims & {
  acr?: string,
  tfp?: string,
};

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
  // public train_A_count: number;
  // public train_B_count: number;
  // public service_life: number;
  public showIcon: boolean = false;

  @ViewChild("grid1") grid1: SheetComponent;
  private table1_datas: any[] = [];
  public options1: pq.gridT.options;

  @ViewChild("grid2") grid2: SheetComponent;
  private table2_datas: any[] = [];
  public options2: pq.gridT.options;

  @ViewChild("grid3") grid3: SheetComponent;
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
  public firstCondition: any;

  public checkOpenDSD: boolean = false;
  public arg_wdj: string = null;

  loginDisplay = false;
  private readonly _destroying$ = new Subject<void>();

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
    // private fatigues: InputFatiguesService,
    private menuBehaviorSubject: MenuBehaviorSubject,
    private crack: InputCrackSettingsService,
    private shear: ShearStrengthService,
    // public auth: Auth,
    public language: LanguagesService,
    public electronService: ElectronService,
    private translate: TranslateService,
    private elementRef: ElementRef,
    private multiWindowService: MultiWindowService,
    private bars: InputBarsService,
    private http: HttpClient,
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService
  ) {
    // this.auth = getAuth();
    this.fileName = "";
    this.pickup_file_name = "";
    this.version = packageJson.version;
  }

  ngOnInit() {
    this.initMSAL();
    this.menuService.selectedRoad = false;
    this._renew();
    this.windows = this.multiWindowService.getKnownWindows();
    this.setDefaultOpenControl();
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.openShiyoJoken();
    });
    this.arg_wdj = this.electronService.ipcRenderer.sendSync("get-main-wdj");
    if (this.arg_wdj !== null) {
      this.open_electron();
    }
    if (this.conditions_list.length > 0) {
      this.firstCondition = this.conditions_list[0];
    }
  }

  @HostListener("window:beforeunload", ["$event"])
  onBeforeUnload($event: BeforeUnloadEvent) {
    // if (!this.electronService.isElectron) {
    //   $event.returnValue =
    //     "Your work will be lost. Do you want to leave this site?";
    // }
  }
  @HostListener("window:unload")
  unloadHandler() {
    this.multiWindowService.saveWindow();
  }

  @HostListener("document:click", ["$event"])
  public documentClick(event: MouseEvent): void {
    const megaMenuElement =
      this.elementRef.nativeElement.querySelector(".mega-menu");
    const controlBtnElement =
      this.elementRef.nativeElement.querySelector(".control-btn");
    if (
      megaMenuElement &&
      !megaMenuElement.contains(event.target) &&
      controlBtnElement &&
      !controlBtnElement.contains(event.target)
    ) {
      this.showMenu = false;
    }
  }
  onKeyDown(event: KeyboardEvent): void {
    //Check if Ctrl and S key are both pressed
    if (event.ctrlKey && (event.key === "S" || event.key === "s")) {
      event.preventDefault(); // Prevent default behavior of Ctrl + S
      // Perform your action here
      this.overWrite();
    }
  }

  // changeInput() {
  //   this.fatigues.setInputData(
  //     this.train_A_count,
  //     this.train_B_count,
  //     this.service_life);
  // }

  initMSAL() {
    if (this.electronService.isElectron) {
      this.electronService.ipcRenderer.on(
        IPC_MESSAGES.GET_PROFILE,
        (event, listClaims) => {
          const profile = {
            uid: listClaims.find((item) => item.claim === "sub")?.value,
            email: listClaims.find((item) => item.claim === "emails")?.value[0],
            givenName: listClaims.find((item) => item.claim === "given_name")
              ?.value,
            surname: listClaims.find((item) => item.claim === "family_name")
              ?.value,
          };
          if (profile.uid) {
            // this.setUserProfile(profile);
            // this.checkUserPermission();
            const role = listClaims.find(
              (item) => item.claim === "extension_Role"
            )?.value;
            if (role && role.includes(environment.productionRole)) {
              localStorage.setItem("malme_roles", JSON.stringify(role));
              this.setUserProfile(profile);
              return;
            } else {
              const isForceLogout = true;
              // alert('No access to app')
              localStorage.removeItem("frameweb_accesstoken");
              localStorage.removeItem("malme_roles");
              this.logoutMS(isForceLogout);
            }
          }
        }
      );
    } else {
      this.setLoginDisplay();

      this.authService.instance.enableAccountStorageEvents();
      this.msalBroadcastService.msalSubject$
        .pipe(
          filter(
            (msg: EventMessage) =>
              msg.eventType === EventType.ACCOUNT_ADDED ||
              msg.eventType === EventType.ACCOUNT_REMOVED
          )
        )
        .subscribe((result: EventMessage) => {
          if (this.authService.instance.getAllAccounts().length === 0) {
            window.location.pathname = "/";
          } else {
            this.setLoginDisplay();
          }
        });

      this.msalBroadcastService.inProgress$
        .pipe(
          filter(
            (status: InteractionStatus) => status === InteractionStatus.None
          ),
          takeUntil(this._destroying$)
        )
        .subscribe(() => {
          this.setLoginDisplay();
          this.checkAndSetActiveAccount();
          if (this.loginDisplay) {
            const listClaims = this.getClaims(
              this.authService.instance.getActiveAccount()
                ?.idTokenClaims as Record<string, any>
            );
            const profile = {
              uid: listClaims.find((item) => item.claim === "sub")?.value,
              email: listClaims.find((item) => item.claim === "emails")
                ?.value[0],
              givenName: listClaims.find((item) => item.claim === "given_name")
                ?.value,
              surname: listClaims.find((item) => item.claim === "family_name")
                ?.value,
            };
            this.setUserProfile(profile);
            this.checkUserPermission();
          }
        });

      this.msalBroadcastService.msalSubject$
        .pipe(
          filter(
            (msg: EventMessage) =>
              msg.eventType === EventType.LOGIN_SUCCESS ||
              msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
              msg.eventType === EventType.SSO_SILENT_SUCCESS
          ),
          takeUntil(this._destroying$)
        )
        .subscribe(async (result: EventMessage) => {
          let payload = result.payload as AuthenticationResult;
          let idtoken = payload.idTokenClaims as IdTokenClaimsWithPolicyId;

          if (
            idtoken.acr === environment.b2cPolicies.names.signUpSignIn ||
            idtoken.tfp === environment.b2cPolicies.names.signUpSignIn
          ) {
            this.authService.instance.setActiveAccount(payload.account);
          }

          // if (
          //   idtoken.acr === environment.b2cPolicies.names.editProfile ||
          //   idtoken.tfp === environment.b2cPolicies.names.editProfile
          // ) {
          //   const originalSignInAccount = this.authService.instance
          //     .getAllAccounts()
          //     .find(
          //       (account: AccountInfo) =>
          //         account.idTokenClaims?.oid === idtoken.oid &&
          //         account.idTokenClaims?.sub === idtoken.sub &&
          //         ((account.idTokenClaims as IdTokenClaimsWithPolicyId).acr ===
          //           environment.b2cPolicies.names.signUpSignIn ||
          //           (account.idTokenClaims as IdTokenClaimsWithPolicyId).tfp ===
          //             environment.b2cPolicies.names.signUpSignIn)
          //     );

          //   let signUpSignInFlowRequest: SsoSilentRequest = {
          //     authority:
          //       environment.b2cPolicies.authorities.signUpSignIn.authority,
          //     account: originalSignInAccount,
          //   };

          //   this.authService.ssoSilent(signUpSignInFlowRequest);
          // }

          if (
            idtoken.acr === environment.b2cPolicies.names.resetPassword ||
            idtoken.tfp === environment.b2cPolicies.names.resetPassword
          ) {
            let signUpSignInFlowRequest: RedirectRequest | PopupRequest = {
              authority:
                environment.b2cPolicies.authorities.signUpSignIn.authority,
              scopes: [...environment.apiConfig.scopes],
              prompt: PromptValue.LOGIN,
            };

            await this.loginMS(signUpSignInFlowRequest, true);
          }

          return result;
        });

      this.msalBroadcastService.msalSubject$
        .pipe(
          filter(
            (msg: EventMessage) =>
              msg.eventType === EventType.LOGIN_FAILURE ||
              msg.eventType === EventType.ACQUIRE_TOKEN_FAILURE
          ),
          takeUntil(this._destroying$)
        )
        .subscribe(async (result: EventMessage) => {
          if (
            result.error &&
            result.error.message.indexOf("AADB2C90118") > -1
          ) {
            let resetPasswordFlowRequest: RedirectRequest | PopupRequest = {
              authority:
                environment.b2cPolicies.authorities.resetPassword.authority,
              scopes: [],
            };

            await this.loginMS(resetPasswordFlowRequest, true);
          }
        });
    }
  }

  getClaims(claims: Record<string, any>) {
    const listClaims = []
    if (claims) {
      Object.entries(claims).forEach((claim: [string, unknown], index: number) => {
        listClaims.push({ id: index, claim: claim[0], value: claim[1] });
      });
    }
    return listClaims;
  }

  setUserProfile(profile: any) {
    this.user.setUserProfile({
      uid: profile.uid,
      email: profile.email,
      firstName: profile.givenName ?? "User",
      lastName: profile.surname ?? "",
    });
  }

  checkUserPermission() {
    this.user.checkPermission().subscribe({
      next: (res: any) => {
        if (res.roles && res.roles.includes(environment.productionRole)) {
          localStorage.setItem('malme_roles', JSON.stringify(res.roles));
          return;
        } else {
          const isForceLogout = true;
          // alert('No access to app')
          localStorage.removeItem('frameweb_accesstoken');
          localStorage.removeItem('webdan_roles');
          this.logoutMS(isForceLogout);
        }
      },
      error: (err) => {
        console.error(err);
        const isForceLogout = true;
        alert('No access to app')
        localStorage.removeItem('frameweb_accesstoken');
        localStorage.removeItem('webdan_roles');
        this.logoutMS(isForceLogout);
      }
    });
  }

  setLoginDisplay() {
    this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
  }

  checkAndSetActiveAccount() {
    /**
     * If no active account set but there are accounts signed in, sets first account to active account
     * To use active account set here, subscribe to inProgress$ first in your component
     * Note: Basic usage demonstrated. Your app may require more complicated account selection logic
     */
    let activeAccount = this.authService.instance.getActiveAccount();

    if (
      !activeAccount &&
      this.authService.instance.getAllAccounts().length > 0
    ) {
      let accounts = this.authService.instance.getAllAccounts();
      this.authService.instance.setActiveAccount(accounts[0]);
    }
  }

  async loginMS(userFlowRequest?: RedirectRequest | PopupRequest, ignoreAlert?: boolean) {
    if (this.electronService.isElectron) {
      this.electronService.ipcRenderer.send(IPC_MESSAGES.LOGIN);
    } else {
      //If you ignore the alert, it is considered as confirmation to leave the page.
      let isConfirm = false;
      if (ignoreAlert) isConfirm = true;
      else {
        isConfirm = await this.helper.confirm(
          this.translate.instant("menu.leave"), this.translate.instant("window.leaveTitle"),
        );
      }

      if (!this.loginDisplay && isConfirm) {
        this.msalBroadcastService.inProgress$
          .pipe(
            filter(
              (status: InteractionStatus) => status === InteractionStatus.None
            )
          )
          .subscribe(async () => {
            if (this.msalGuardConfig.authRequest) {
              await this.authService.loginRedirect({ ...this.msalGuardConfig.authRequest, ...userFlowRequest } as RedirectRequest);
              await this.authService.acquireTokenRedirect({ ...this.msalGuardConfig.authRequest } as RedirectRequest)
            } else {
              await this.authService.loginRedirect(userFlowRequest);
            }
          });
      }
    }
  }

  functionHandleRedirectPromise() {
    this.authService.instance
    .handleRedirectPromise()
    .then((tokenResponse) => {
      if (!tokenResponse) {
        this.user.setUserProfile(null);
        localStorage.removeItem("frameweb_accesstoken");
        localStorage.removeItem("malme_roles");
        this.authService.logoutRedirect();
        window.sessionStorage.setItem("openStart", "1");
      } else {
        // Do something with the tokenResponse
      }
    })
    .catch((err) => {
      // Handle error
      console.error(err);
    });
  }

  async handleForceLogout() {
    try {
      const isNotify = await this.helper.notify(
        this.translate.instant("menu.logoutMessage"),
        this.translate.instant("menu.logoutTitle")
      );
      if (isNotify) {
        this.functionHandleRedirectPromise()
      }
    } catch (error) {
      this.functionHandleRedirectPromise()
    }
  }

  async logoutMS(isForceLogout?: boolean) {
    if (this.electronService.isElectron) {
      this.electronService.ipcRenderer.send(IPC_MESSAGES.LOGOUT)
      this.user.setUserProfile(null);
      window.sessionStorage.setItem("openStart", "1");
      if (isForceLogout) {
        await this.handleForceLogout()
        return;
      }
    } else {
      if(isForceLogout) {
        await this.handleForceLogout()
        return;
      }
      const isConfirm = await this.helper.confirm(
        this.translate.instant('menu.leave'),
        this.translate.instant('window.leaveTitle')
      );
      if (isConfirm) {
        this.functionHandleRedirectPromise()
      }
    }
  }

  public setDefaultOpenControl() {
    const controlBtnElement =
      this.elementRef.nativeElement.querySelector(".control-btn");
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
    const isConfirm = await this.helper.confirm(
      this.translate.instant("window.confirm")
    );
    if (isConfirm) {
      this.router.navigate(["/blank-page"]);
      this._renew();
      this.checkOpenDSD = false;
    }
  }

  private _renew(): void {
    this.app.deactiveButtons();

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
    const response = this.electronService.ipcRenderer.sendSync("open");
    if (response.status !== true) {
      this.helper.alert(this.translate.instant("menu.fail") + response.status);
      return;
    }
    const modalRef = this.modalService.open(WaitDialogComponent);
    this.fileName = response.path;

    this.router.navigate(["/blank-page"]); // ngOnDestroyと非同期
    this.app.deactiveButtons();

    setTimeout(() => {
      switch (this.helper.getExt(this.fileName)) {
        case "dsd":
          this.checkOpenDSD = true;
          const pik = this.dsdData.readDsdData(response.textB);
          this.open_done(modalRef);
          if (pik !== null) {
            this.helper.alert(pik + this.translate.instant("menu.open"));
          }
          break;
        default:
          this.checkOpenDSD = false;
          if (this.save.checkVerFile(response.text)) {
            this.showIcon = false;
            this.fileName =
              this.translate.instant("menu.softName") + " ver." + this.version;
            this.helper.alert(this.translate.instant("menu.message_ver"));
          } else {
            this.showIcon = true;
            this.save.readInputData(response.text);
          }
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
            this.checkOpenDSD = true;
            const pik = this.dsdData.readDsdData(buff);
            this.app.getText(this.basic.get_specification2());
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
            this.checkOpenDSD = false;
            //Check to hide design condition
            this.hideDCJ3_J5 = this.save.hideDC(text);

            //Read file
            if (this.save.checkVerFile(text)) {
              this.showIcon = false;
              this.fileName =
                this.translate.instant("menu.softName") +
                " ver." +
                this.version;
              this.helper.alert(this.translate.instant("menu.message_ver"));
            } else {
              this.showIcon = true;
              this.save.readInputData(text);
              let basicFile = this.save.getBasicData();
              this.specification1_list_file = basicFile.specification1_list;
              this.basic.set_specification1_data_file(
                this.specification1_list_file
              );
              this.specification2_list = basicFile.specification2_list;
            }
            this.open_done(modalRef);
          })
          .catch((err) => {
            this.open_done(modalRef, err);
          });
    }
    this.showMenu = false;
  }

  public getFileNameFromUrl(url) {
    return url.replace(/^.*[\\/]/, "");
  }

  public shortenFilename(filename, maxLength = 30) {
    let tempName = filename;
    tempName = this.getFileNameFromUrl(tempName);
    return tempName.length <= maxLength
      ? tempName
      : "..." + tempName.slice(tempName.length - maxLength);
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
    this.fileName = this.electronService.ipcRenderer.sendSync(
      "overWrite",
      this.fileName,
      inputJson
    );
  }

  // ピックアップファイルを開く
  pickup(evt) {
    const file = evt.target.files[0];

    this.showMenu = false;

    let ext = this.helper.getExt(file.name); ///^.+\.([^.]+)$/.exec(file.name);
    // nullじゃないことの確認
    if (ext == '') {
      this.helper.alert(this.translate.instant("menu.acceptedFile"));
      return;
    }

    const modalRef = this.modalService.open(WaitDialogComponent);
    evt.target.value = "";

    this.router.navigate(["/blank-page"]);
    this.app.deactiveButtons();

    ext = ext.toLowerCase();
    if (ext == "pik" || ext == "csv") {
      this.fileToText(file)
        .then((text) => {
          this.save.readPickUpData(text, file.name, this.checkOpenDSD); // データを読み込む
          this.pickup_file_name = this.save.getPickupFilename();
          modalRef.close();
        })
        .catch((err) => {
          modalRef.close();
          console.log(err);
        });
    } else if (ext == "xls" || ext == "xlsx") {
      this.fileToBinary(file)
        .then((data) => {
          const workbook = read(data, { type: 'array' });
          this.save.readMidasData(workbook, file.name); // データを読み込む
          this.pickup_file_name = this.save.getPickupFilename();
          modalRef.close();
        })
        .catch((err) => {
          modalRef.close();
          console.log(err);
        });
    } else {
      this.helper.alert(this.translate.instant("menu.acceptedFile"));
      return;
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
    if (this.electronService.isElectron) {
      this.fileName = this.electronService.ipcRenderer.sendSync(
        "saveFile",
        this.fileName,
        inputJson
      );
    } else {
      const blob = new window.Blob([inputJson], { type: "text/plain" });
      FileSaver.saveAs(blob, this.fileName);
    }
  }

  // ログイン関係
  async logIn() {
    if (this.electronService.isElectron) {
      this.modalService
        .open(LoginDialogComponent, { backdrop: false })
        .result.then((result) => { });
    } else {
      //this.keycloak.login();
    }
  }

  logOut(): void {
    if (this.electronService.isElectron) {
      this.user.setUserProfile(null);
    } else {
      //this.keycloak.logout(window.location.origin);
      this.user.setUserProfile(null);
    }
  }

  public goToLink() {
    window.open("https://help-webdan.malme.app/", "_blank");
  }

  public setSpecification1(i: number): void {
    let basic = this.basic.set_specification1(i);
    this.specification1_list = basic.specification1_list; // 適用

    ///Set selected for specification2_list
    if (i === 2) { //道路
      //Case Road: temporary set default spe_2.2: "partial coefficient method"
      basic.specification2_list.map(
        (obj) => (obj.selected = obj.id === 6 ? true : false)
      );
      this.specification2_select_id = 6;
      this.basic.setPreSpecification2(
        this.specification1_select_id,
        basic.specification2_list
      );
    } else {
      const prev = this.basic.prevSpecification2[i];
      if (prev != undefined) {
        this.basic.specification2_list = prev;
        basic.specification2_list = this.basic.specification2_list;
      }
      const selectedObject = basic.specification2_list.find(
        (obj) => obj.selected === true
      );
      this.specification2_select_id = selectedObject ? selectedObject.id : 0;
    }

    this.specification2_list = basic.specification2_list; // 仕様
    this.conditions_list = basic.conditions_list; //  設計条件

    this.table1_datas = basic.pickup_moment;
    this.table2_datas = basic.pickup_shear_force;
    this.table3_datas = basic.pickup_torsional_moment;

    if (!(this.grid1 == null)) this.grid1.refreshDataAndView();
    if (!(this.grid2 == null)) this.grid2.refreshDataAndView();
    if (!(this.grid3 == null)) this.grid3.refreshDataAndView();
    this.specification1_select_id = i;
    this.menuService.selectApply(i);
    this.menuBehaviorSubject.setValue(i.toString());
    this.router.navigate(["./basic-information"]);
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
  public setSpecification2(id: number): void {
    this.menuService.setCheckedRadio(id);
    this.specification2_list.map(
      (obj) => (obj.selected = obj.id === id ? true : false)
    );
    this.specification2_select_id = id;
    this.bars.refreshShowHidden$.next({});
    this.crack.refreshTitle$.next({});
    this.shear.refreshTable$.next({});
    this.basic.setPreSpecification2(
      this.specification1_select_id,
      this.specification2_list
    );
  }

  // 耐用年数, jA, jB
  public openShiyoJoken() {
    const basic = this.basic.getSaveData();
    // 適用
    this.basic.updateTitleSpecification(1, basic.specification1_list);
    this.specification1_list = basic.specification1_list;
    this.specification1_select_id = this.basic.get_specification1();

    // 仕様
    this.basic.updateTitleSpecification(2, basic.specification2_list);
    this.specification2_list = basic.specification2_list;
    this.specification2_select_id = this.basic.get_specification2();
    //  設計条件
    this.basic.updateTitleCondition(basic.conditions_list);
    this.conditions_list = basic.conditions_list;

    this.table1_datas = basic.pickup_moment;
    this.table2_datas = basic.pickup_shear_force;
    this.table3_datas = basic.pickup_torsional_moment;

    // const fatigues = this.fatigues.getSaveData();
    // this.train_A_count = fatigues.train_A_count;
    // this.train_B_count = fatigues.train_B_count;
    // this.service_life = fatigues.service_life;
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
      conditions_list: this.conditions_list, // 設計条件
    });
  }

  public changeDesignCondition(item: any) {
    if (item.id === "JR-003" && item.selected) {
      const jR005 = this.conditions_list.find((item) => item.id === "JR-005");
      if (jR005 && jR005.selected) {
        jR005.selected = false;
      }
    } else if (item.id === "JR-005" && item.selected) {
      const jR003 = this.conditions_list.find((item) => item.id === "JR-003");
      if (jR003 && jR003.selected) {
        jR003.selected = false;
      }
    }
    // if (item.id === "JR-003" || item.id === "JR-005")
    // this.members.setGTypeForMembers();
  }
  handelClickChat() {
    const elementChat = document.getElementById("chatplusheader");
    elementChat.click();
  }
}