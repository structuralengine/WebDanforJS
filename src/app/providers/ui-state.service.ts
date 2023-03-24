import { Injectable } from '@angular/core';
import { AngularFireDatabase } from "@angular/fire/database";
import { AngularFireAuth } from '@angular/fire/auth';
import { TranslateService } from "@ngx-translate/core";
import { SaveDataService } from "./save-data.service";
import { DataHelperModule } from "./data-helper.module";
import { Observable } from 'rxjs';

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
    private auth: AngularFireAuth,
    private ui_db: AngularFireDatabase,
    private helper: DataHelperModule,
    private translate: TranslateService,
    private save: SaveDataService
  ){}

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
    this.ui_db.database.ref(ui_filename_key).set(this.file_name);
  }

  // - key : first character must be '/' or completely empty
  public save_ui_state(ui_data:any = null, key:string="")
  {
    // ステートメッセージとか出す？

    if(null === ui_data)
      ui_data = this.save.getInputJson();

    // ローカル保存(今はやってない)
    //localStorage.setItem("AutoSaved", ui_data);

    // realtime database
    if("" == this.my_login_uid)
      return;

    key = this.key_prefix + "_UI_DATA_n" + key;

    // 近い将来uidでなくグループID的なものになりそう
    this.ui_db.database.ref(key).set(ui_data);
  }

  private _restore_ui_data(ui_data: any, _file_name: string): boolean
  {
    if(null === ui_data)
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
    var r1 = this.ui_db.database.ref(ui_data_key);

    r1.once('value', (ui_data_ss) => {
      var r2 = this.ui_db.database.ref(ui_filename_key);
      r2.once('value', (filename_ss) => {
        this._restore_ui_data(ui_data_ss.val(), filename_ss.val());
      });
    });
  }

  private _common_login_error_handler(login_date_local:number, ss, r)
  {
    console.log("D");
    if(login_date_local > parseInt(this.my_login_date))
    {
      console.log("E");

      // 同一ブラウザからのログイン
      this.helper.alert("同一ブラウザでのログインを検知。ビューアモードに移行します");

      // TODO
      r.off('value');
    }
    else
    {
      console.log("F");

      // 別のブラウザ（またはPC）からのログインを検知
      console.log("OTHER LOGIN DATE: " + ss.val());

      this.my_login_uid = "";
      this.key_prefix = "";
      this.my_login_date = "";
      r.off('value');
      this.auth.signOut();
      this.helper.alert("ほかからログインされたのでログアウトしました");
    }
  }

  private _common_login_handler(login_date_local:number, ss, r): boolean
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
      this._common_login_error_handler(login_date_local, ss, r);
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

          var r = this.ui_db.database.ref(ui_login_date_key);
          r.transaction((old) => {

            // どうやらold===nullの状態で一度呼ばれるらしい.
            // 正式なoldの値が入るのはその後２回めで呼び出されたときらしい.
            // 妙な仕様だ.
            console.log("OLD, d: ", old, d);
            if(null === old || parseInt(old) <= parseInt(d))
              return d;
            else
              return; // トランザクションアボート

          }, (err,committed,ss) => {

            if(err)
            {
              // どう対処すべき？
              console.log("K: Write transaction has finished with error: ", err);
            }
            else if(!committed)
            {
              // 書き込みが競合して書き込まれなかった。
              // 最新より前のログインとみなしてログアウトなり編集不能にするなりする
              console.log("L: Write transaction was aborted.");

              var login_date_local:number = parseInt(localStorage.getItem(local_login_date_key));
              this._common_login_error_handler(login_date_local, ss, r);
            }
            else
            {
              console.log("A");

              //var login_date_local:number = parseInt(localStorage.getItem(local_login_date_key));
              //if(this._common_login_handler(login_date_local, ss, r))
              //{
              r.on('value', (snapshot) => {
                var login_date_local:number = parseInt(localStorage.getItem(local_login_date_key));
                this._common_login_handler(login_date_local, snapshot, r);
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

          this.ui_db.database.ref(this.key_prefix + "_LAST_LOGIN").off('value');

          this.my_login_uid = "";
          this.key_prefix = "";
          this.my_login_date = "";
        }
      });
  }
}
