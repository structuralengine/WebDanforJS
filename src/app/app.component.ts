import { Component, OnInit } from "@angular/core";
import { InputDesignPointsService } from "./components/design-points/design-points.service";
import * as FileSaver from "file-saver";
import { InputMembersService } from "./components/members/members.service";
import { ConfigService } from "./providers/config.service";
import { DsdDataService } from "src/app/providers/dsd-data.service";
import { SaveDataService } from "./providers/save-data.service";
import { ElectronService } from 'ngx-electron';
import { DataHelperModule } from "./providers/data-helper.module";
import { UIStateService } from "./providers/ui-state.service";
import { NgbModal, ModalDismissReasons } from "@ng-bootstrap/ng-bootstrap";
import { WaitDialogComponent } from "./components/wait-dialog/wait-dialog.component";
import { TranslateService } from "@ngx-translate/core";
import packageJson from '../../package.json';
import { Router, ActivatedRoute, ParamMap, NavigationEnd} from "@angular/router";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})

export class AppComponent implements OnInit {

  public version: string;

  constructor(
    private modalService: NgbModal,
    private config: ConfigService,
    private router: Router,
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private helper: DataHelperModule,
    private dsdData: DsdDataService,
    private electronService: ElectronService,
    private ui_state: UIStateService,
    private translate: TranslateService
  ) {
    this.version = packageJson.version;
  }

  public isManual(): boolean {
    return this.save.isManual();
  }

  public getFileName():string {
    return this.ui_state.file_name;
  }

  // 画面遷移したとき現在表示中のコンポーネントを覚えておく
  public onActivate(componentRef: any): void {
    this.config.setActiveComponent(componentRef);
  }
  public onDeactivate(componentRef: any): void {
    this.config.setActiveComponent(null);
  }

  public activePageChenge(id: number): void {
    this.deactiveButtons();
    document.getElementById(id.toString()).classList.add("is-active");
  }

  ngOnInit() {
    this.router.navigate(["/blank-page"]);
    this.deactiveButtons();

    this.ui_state.init_ui_state("WebDanforJS", () =>
      {
        // 有効な部材データが有れば部材に伴う機能を有効にする
        this.memberChange();

        // 有効な部材グループと算出点データがあったらそれらに伴う機能を有効にする
        this.designPointChange();
      });
  }

  public isElectronApp():boolean
  {
    return this.electronService.isElectronApp;
  }

  // ファイルを保存
  public fileSave(): void {
    this.config.saveActiveComponentData();

    var fname:string = this.ui_state.file_name;
    if (fname.length === 0)
      fname = "WebDan.wdj";

    if (this.helper.getExt(fname) !== "wdj")
      fname += ".wdj";

    this.ui_state.file_name = fname;

    const inputJson: string = this.save.getInputText();

    // 保存する
    if(this.electronService.isElectronApp) {
      this.ui_state.file_name =
        this.electronService.ipcRenderer.sendSync('saveFile', this.ui_state.file_name, inputJson);
    } else {
      const blob = new window.Blob([inputJson], { type: "text/plain" });
      FileSaver.saveAs(blob, this.ui_state.file_name);
    }

    this.ui_state.save_ui_state();
    this.ui_state.save_ui_filename();
  }

  // ファイルを開く
  public open(evt) {
    const modalRef = this.modalService.open(WaitDialogComponent);
    const file = evt.target.files[0];
    this.ui_state.file_name = file.name;
    evt.target.value = "";

    this.router.navigate(["/blank-page"]);
    this.deactiveButtons();

    switch (this.helper.getExt(this.ui_state.file_name)) {
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
      this.ui_state.save_ui_state();
      this.ui_state.save_ui_filename();

      //this.pickup_file_name = this.save.getPickupFilename();
      this.memberChange(); // 左側のボタンを有効にする。
      this.designPointChange(); // 左側のボタンを有効にする。
    } else {
      this.helper.alert(error);
    }

    modalRef.close();
  }

  // 新規作成
  public renew(): void {
    this.router.navigate(["/blank-page"]);
    this.deactiveButtons();

    setTimeout(() => {
      this.ui_state.file_name = "";
      this.save.clear();
      this.ui_state.save_ui_state();
      this.ui_state.save_ui_filename();
      this.memberChange(false); // 左側のボタンを無効にする。
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
    this.ui_state.file_name = response.path;

    this.router.navigate(["/blank-page"]);  // ngOnDestroyと非同期
    this.deactiveButtons();

    setTimeout(() => {
      switch (this.helper.getExt(this.ui_state.file_name)) {
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

  // 上書き保存
  // 上書き保存のメニューが表示されるのは electron のときだけ
  public overWrite(): void {
    if (this.ui_state.file_name === ""){
      this.fileSave();
      return;
    }
    this.config.saveActiveComponentData();

    const inputJson: string = this.save.getInputText();

    this.ui_state.file_name =
      this.electronService.ipcRenderer.sendSync('overWrite', this.ui_state.file_name, inputJson);

    this.ui_state.save_ui_filename(); // 上でthis.ui_state.file_nameが修正されている？ので一応更新
  }

  // ピックアップファイルを開く
  pickup(evt) {
    const file = evt.target.files[0];
    const modalRef = this.modalService.open(WaitDialogComponent);
    evt.target.value = "";

    this.router.navigate(["/blank-page"]);
    this.deactiveButtons();

    this.fileToText(file)
      .then((text) => {
        this.save.readPickUpData(text, file.name); // データを読み込む
        //this.pickup_file_name = this.save.getPickupFilename();
        this.ui_state.save_ui_state();
        modalRef.close();
      })
      .catch((err) => {
        modalRef.close();
        console.log(err);
      });
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

  // アクティブになっているボタンを全て非アクティブにする
  public deactiveButtons() {
    for (let i = 0; i <= 10; i++) {
      const data = document.getElementById(i + "");
      if (data != null) {
        if (data.classList.contains("is-active")) {
          data.classList.remove("is-active");
        }
      }
    }
  }

  // 部材に何か入力されたら呼ばれる
  // 有効な入力行があったら次のボタンを有効にする
  private isMemberEnable = false;

  public memberChange(flg: boolean = this.members.checkMemberEnables()): void {

    if (this.isMemberEnable !== flg) {
      for (const id of ["2", "7"]) {
        const data = document.getElementById(id);
        if (data != null) {

          if (flg === true) {
            if (data.classList.contains("disabled")) {
              data.classList.remove("disabled");
            }
          } else {
            if (!data.classList.contains("disabled")) {
              data.classList.add("disabled");
            }
          }
        }
        else
          console.log("data is null");
      }
      this.isMemberEnable = flg;
    }

    if (this.isManual()) {
      this.designPointChange(this.isMemberEnable);
    }
  }

  // 算出点に何か入力されたら呼ばれる
  // 有効な入力行があったら次のボタンを有効にする
  private isDesignPointEnable = false;
  public designPointChange(flg = (this.points.designPointChange()
    && 0 != this.members.getGroupeList().length)): void {
    // if(!this.save.isManual()){
    //   flg = this.points.designPointChange();
    // }

    //console.log("FLG: ", this.points.designPointChange());
    //console.log("group_list.len: ", this.members.getGroupeList().length);

    if (this.isDesignPointEnable !== flg) {
      for (const id of ["3", "4", "5", "6", "7", "10"]) {
        const data = document.getElementById(id);
        if (data != null) {
          if (flg === true) {
            if (data.classList.contains("disabled")) {
              data.classList.remove("disabled");
            }
          } else {
            if (!data.classList.contains("disabled")) {
              data.classList.add("disabled");
            }
          }
        }
      }
      this.isDesignPointEnable = flg;
    }
  }
}
