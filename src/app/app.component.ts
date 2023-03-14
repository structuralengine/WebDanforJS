import { Component, OnInit } from "@angular/core";
import { AngularFireDatabase } from "@angular/fire/database";
import { AngularFireAuth } from '@angular/fire/auth';
import { InputDesignPointsService } from "./components/design-points/design-points.service";
import * as FileSaver from "file-saver";
import { InputMembersService } from "./components/members/members.service";
import { ConfigService } from "./providers/config.service";
import { DsdDataService } from "src/app/providers/dsd-data.service";
import { SaveDataService } from "./providers/save-data.service";
import { Observable } from 'rxjs';
import { ElectronService } from 'ngx-electron';
import { DataHelperModule } from "./providers/data-helper.module";
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

  public fileName: string="";
  public version: string;

  constructor(
    private modalService: NgbModal,
    private config: ConfigService,
    private router: Router,
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private auth: AngularFireAuth,
    private ui_db: AngularFireDatabase,
    private helper: DataHelperModule,
    private dsdData: DsdDataService,
    private electronService: ElectronService,
    private translate: TranslateService
  ) {
    this.version = packageJson.version;
  }

  public isManual(): boolean {
    return this.save.isManual();
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
    this.load_ui_state();
  }

  public isElectronApp():boolean
  {
    return this.electronService.isElectronApp;
  }

  // ファイルを保存
  public fileSave(): void {
    this.config.saveActiveComponentData();

    if (this.fileName.length === 0) {
      this.fileName = "WebDan.wdj";
    }

    if (this.helper.getExt(this.fileName) !== "wdj") {
      this.fileName += ".wdj";
    }

    const inputJson: string = this.save_ui_state();

    // 保存する
    if(this.electronService.isElectronApp) {
      this.fileName =
        this.electronService.ipcRenderer.sendSync('saveFile', this.fileName, inputJson);
    } else {
      const blob = new window.Blob([inputJson], { type: "text/plain" });
      FileSaver.saveAs(blob, this.fileName);
    }
  }

  // ファイルを開く
  public open(evt) {
    const modalRef = this.modalService.open(WaitDialogComponent);
    const file = evt.target.files[0];
    this.fileName = file.name;
    evt.target.value = "";

    this.router.navigate(["/blank-page"]);
    this.deactiveButtons();

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

    this.fileName = "";

    setTimeout(() => {
      this.save.clear();
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
    this.fileName = response.path;

    this.router.navigate(["/blank-page"]);  // ngOnDestroyと非同期
    this.deactiveButtons();

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

  // 上書き保存
  // 上書き保存のメニューが表示されるのは electron のときだけ
  public overWrite(): void {
    if (this.fileName === ""){
      this.fileSave();
      return;
    }
    this.config.saveActiveComponentData();
    //const inputJson: string = this.save.getInputText();
    const inputJson: string = this.save_ui_state();

    this.fileName =
      this.electronService.ipcRenderer.sendSync('overWrite', this.fileName, inputJson);
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

  private _restore_ui_data(json: string, file_name: string): boolean
  {
    if(null === json)
      return false;

    this.fileName = (null===file_name?"":file_name);

    this.save.readInputData(json);

    // 有効な部材データが有れば部材に伴う機能を有効にする
    this.memberChange();

    // 有効な部材グループと算出点データがあったらそれらに伴う機能を有効にする
    this.designPointChange();

    return true;
  }

  private _load_ui_state_local()
  {
    this._restore_ui_data(localStorage.getItem("AutoSaved"),
                          localStorage.getItem("AutoSavedFileName"));
  }

  private _load_ui_state_realtime_database()
  {
    this.auth.onAuthStateChanged((credential) => {

      var multi_login:boolean = false;

      if(credential){
        //console.log('User is logged in:', credential);

        // 近い将来uidでなくグループID的なものになりそう
        const ui_data_key:string = credential.uid + "_UI_DATA_n";
        var json$:Observable<string> = this.ui_db.object<string>(ui_data_key).valueChanges();

        json$.subscribe(
          (j: string) => {
            const ui_filename_key:string = credential.uid + "_UI_FILENAME";
            var filename$:Observable<string> =
              this.ui_db.object<string>(ui_filename_key).valueChanges();

            filename$.subscribe((f: string) => {
              this._restore_ui_data(j, f);
            });
          });

        const ui_login_date_key:string = credential.uid + "_LAST_LOGIN";
        var r = this.ui_db.database.ref(ui_login_date_key);
        var d:string = new Date().toString();
        var init:boolean = true;
        r.set(d).then(() => {
          r.on('value', (snapshot) => {
            if(init)
              init = false;
            else
            {
              multi_login = true;
              this.auth.signOut();
            }
          });
        });
      }
      else {
        if(multi_login) {
          multi_login = false;
          this.helper.alert("ほかからログインされた");
        }
      }
    });
  }

  public load_ui_state()
  {
    this.router.navigate(["/blank-page"]);
    this.deactiveButtons();

    // ローカルから読み出す
    // this._load_ui_state_local();

    // realtime databaseから読み出す
    this._load_ui_state_realtime_database();
  }

  private _save_ui_state_local(json: string, filename: string)
  {
    localStorage.setItem("AutoSaved", json);
    localStorage.setItem("AutoSavedFileName", filename);
  }

  private _save_ui_state_realtime_database(ui_data: any, filename: string)
  {
    this.auth.currentUser.then(user=>{
      if(user === null) return;

      // 近い将来uidでなくグループID的なものになりそう
      const ui_data_key:string = user.uid + "_UI_DATA_n";
      const ui_filename_key:string = user.uid + "_UI_FILENAME";
      this.ui_db.database.ref(ui_data_key).set(ui_data);
      this.ui_db.database.ref(ui_filename_key).set(filename);
    });
  }

  public save_ui_state():string
  {
    // ステートメッセージとか出す？

    const data:string = this.save.getInputText();

    // ローカル保存
    //this._save_ui_state_local(data, this.fileName);

    // realtime database
    this._save_ui_state_realtime_database(data, this.fileName);

    return data;
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
