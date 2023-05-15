import { Injectable } from '@angular/core';
import { TranslateService } from "@ngx-translate/core";
import { SaveDataService } from "./save-data.service";
import { DataHelperModule } from "./data-helper.module";
import { Observable } from 'rxjs';
import { InputMembersService } from '../components/members/members.service';
import { InputDesignPointsService } from "../components/design-points/design-points.service";

//import { AngularFireAuth } from '@angular/fire/compat/auth';
//import { AngularFireDatabase } from '@angular/fire/compat/database';
//import { Component, inject } from '@angular/core';
import { Database, getDatabase,
         ref, off, onValue, set, runTransaction } from '@angular/fire/database';
import { Auth, getAuth } from "@angular/fire/auth";

@Injectable({
  providedIn: 'root'
})
export class UIStateService {

  public file_name:string="";

  private app_id:string="";
  private key_prefix:string="";
  private restore_callback=null;
  private my_login_date:string = ""; // ログイン中であるかどうかのフラグでもある
  private my_login_uid:string = ""; // ログアウトされたときにログイン中のuidを覚えておくために使用

  constructor(
    //private auth: AngularFireAuth,
    //private ui_db: AngularFireDatabase,
    private helper: DataHelperModule,
    private translate: TranslateService,
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private ui_db: Database,
    private auth: Auth
  ) {
    this.auth = getAuth();
    this.ui_db = getDatabase();
  }

  public init_ui_state(_app_id:string, _restore_callback)
  {
    this.app_id = _app_id;
    this.restore_callback = _restore_callback;

    // ローカルから読み出す
    // this._load_ui_state_local();

    // realtime databaseから読み出す
    this._load_ui_state_realtime_database();
  }

  public save_ui_filename()
  {
    // ローカル保存(今はやってない)
    //localStorage.setItem("AutoSavedFileName", this.file_name);

    const ui_filename_key:string = this.key_prefix + "_UI_FILENAME";
    //this.ui_db.database.ref(ui_filename_key).set(this.file_name);
    set(ref(this.ui_db, ui_filename_key), this.file_name);
  }

  // - key : first character must be '/' or completely empty
  public save_ui_state(ui_data:any = null, key:string="")
  {
    // ステートメッセージとか出す？

    if(null === ui_data)
      ui_data = this.save.getInputJson();

    // realtime database
    if ("" == this.my_login_uid)
      return;

    const refKey = `${this.key_prefix}_UI_DATA_n${key}`;

    //console.log("SAVE UI_DATA: ", refKey, ui_data);

    // 近い将来uidでなくグループID的なものになりそう
    set(ref(this.ui_db, refKey), ui_data).then(() => {
      //console.log(`更新が完了: ${refKey}`);
    }).catch((error) => {
      console.error(error);
    });
  }

  // realtime databaseに「行」データを保存する
  public save_ui_row_state(rowData: any = null, key: string = "", rowIndx: number) {
    // rowIndxが未指定のときは処理を中断
    if (rowIndx == null) {
      console.log('rowIndxが未指定');
      return;
    }

    // keyが未指定のときは処理を中断
    if (key == '') {
      console.log('keyが未指定');
      return;
    }

    // ローカル保存(今はやってない)
    //localStorage.setItem("AutoSaved", ui_data);

    // realtime database
    if("" == this.my_login_uid)
      return;

    const refKey = `${this.key_prefix}_UI_DATA_n${key}`;

    console.log("SAVE ROW_DATA: ", refKey, rowData);

    this.setItem(`${refKey}/${rowIndx}`, rowData);
  }

  // Realtime Database上でキーを指定してセット
  private setItem(key: string, newData: any) {
    const r = ref(this.ui_db, key);

    set(r, newData).then(() => {
      console.log(`行の更新が完了: ${key}`);
    }).catch((error) => {
      console.error(error);
    });
  }

  private _restore_ui_data(ui_data: any, _file_name: string): boolean {
    if (null === ui_data)
      return false;

    this.file_name = (null===_file_name?"":_file_name);

    if('string' === typeof ui_data)
      this._restore_ui_data(JSON.parse(ui_data), this.file_name);
    else
      this.save.setInputData(ui_data);

    this.restore_callback();

    return true;
  }

  private _load_ui_state_local()
  {
    this._restore_ui_data(localStorage.getItem("AutoSaved"),
                          localStorage.getItem("AutoSavedFileName"));
  }

  private _restore_from_realtime_database()
  {
    // 近い将来uidでなくグループID的なものになりそう
    const ui_data_key:string = this.key_prefix + "_UI_DATA_n";
    const ui_filename_key:string = this.key_prefix + "_UI_FILENAME";
    var r1 = ref(this.ui_db, ui_data_key);

    var detach_func1 = onValue(r1, (ui_data_ss) => {
      var r2 = ref(this.ui_db, ui_filename_key);
      var detach_func2 = onValue(r2, (filename_ss) => {
        this._restore_ui_data(ui_data_ss.val(), filename_ss.val());
        detach_func2();
      });

      detach_func1();
    });
  }

  private _common_login_error_handler(login_date_local:number, ss, unsub=null)
  {
    console.log("D");
    if(login_date_local > parseInt(this.my_login_date))
    {
      console.log("E");

      // 同一ブラウザからのログイン
      this.helper.alert("同一ブラウザでのログインを検知。ビューアモードに移行します");

      // TODO
      if(null !== unsub)
        unsub();
    }
    else
    {
      console.log("F");

      // 別のブラウザ（またはPC）からのログインを検知
      console.log("OTHER LOGIN DATE: " + ss.val());

      this.my_login_uid = "";
      this.key_prefix = "";
      this.my_login_date = "";
      if(null !== unsub)
        unsub();
      this.auth.signOut();
      this.helper.alert("ほかからログインされたのでログアウトしました");
    }
  }

  private _common_login_handler(login_date_local:number, ss, unsub): boolean
  {
    console.log("_common_login_handler: ", login_date_local);
    console.log("my_login_date: ", this.my_login_date);

    if(login_date_local <= parseInt(this.my_login_date) && ss.val() == this.my_login_date)
    {
      // 自分のログインのコールバック. サーバのUIデータをリストアする
      console.log("C2");

      this._restore_from_realtime_database();
      return true;
    }
    else
      this._common_login_error_handler(login_date_local, ss, unsub);
  }

  private _load_ui_state_realtime_database()
  {
    this.auth.onAuthStateChanged((credential) =>
      {
        console.log("AuthStateChanged: " + (null===credential?"LOGOUT":"LOGIN"), credential);

        if(null !== credential)
        {
          // メールアドレス確認が済んでいるかどうか
          if (!credential.emailVerified) {
            this.auth.signOut();
            this.helper.alert(this.translate.instant("login-dialog.mail_check"));
            return;
          }

          console.log("J");

          this.my_login_uid = credential.uid;

          //this.key_prefix = credential.uid; // キーを全アプリ共通にするとき
          this.key_prefix = credential.uid + "/" + this.app_id;

          const ui_login_date_key:string = this.key_prefix + "_LAST_LOGIN";
          const local_login_date_key = this.key_prefix + "_LOGIN_DATE_LOCAL";

          var d:string = new Date().getTime().toString();
          console.log("date of invoking login", d);

          this.my_login_date = d;
          localStorage.setItem(local_login_date_key, d);

          var r = ref(this.ui_db, ui_login_date_key);
          runTransaction(r, (old) => {

            // どうやらold===nullの状態で一度呼ばれるらしい.
            // 正式なoldの値が入るのはその後２回めで呼び出されたときらしい.
            // 妙な仕様だ.
            console.log("OLD, d: ", old, d);
            if(null === old || parseInt(old) <= parseInt(d))
              return d;
            else
              return; // トランザクションアボート

          }).then(result => {

            //if(err)
            //{
            //  // どう対処すべき？
            //  console.log("K: Write transaction has finished with error: ", err);
            //}
            //else
            if(!result.committed)
            {
              // 書き込みが競合して書き込まれなかった。
              // 最新より前のログインとみなしてログアウトなり編集不能にするなりする
              console.log("L: Write transaction was aborted.");

              var login_date_local:number = parseInt(localStorage.getItem(local_login_date_key));
              this._common_login_error_handler(login_date_local, result.snapshot);
              off(r, 'value');
            }
            else
            {
              console.log("A");

              //var login_date_local:number = parseInt(localStorage.getItem(local_login_date_key));
              //if(this._common_login_handler(login_date_local, ss, r))
              //{
              var unsub = onValue(r, (snapshot) => {
                var login_date_local:number = parseInt(localStorage.getItem(local_login_date_key));
                this._common_login_handler(login_date_local, snapshot, unsub);
                console.log("new local login date: ", login_date_local);
              });
              // }
            }
          });

          console.log("G");
        }
        else // ログアウト
        {
          console.log("I");

          off(ref(this.ui_db, this.key_prefix + "_LAST_LOGIN"), 'value');

          this.my_login_uid = "";
          this.key_prefix = "";
          this.my_login_date = "";
        }
      });
  }
}
