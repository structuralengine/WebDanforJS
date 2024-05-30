import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { DataHelperModule } from "./data-helper.module";
import { ElectronService } from "./electron.service";

@Injectable({
  providedIn: "root",
})
export class LanguagesService {
  public browserLang: string;
  public languageIndex = {
    ja: "日本語",
    en: "English",
  };

  // private readonly default_lang: string = "en";

  constructor(
    public translate: TranslateService,
    public helper: DataHelperModule,
    public electronService: ElectronService,
  ) {

    if(translate.getBrowserLang() in this.languageIndex)
      this.browserLang = translate.getBrowserLang();
    else
      this.browserLang = this.translate.currentLang;

    // console.log("BROWSER LANG: ", this.browserLang);
    // translate.use(this.browserLang);
    // if (this.electronService.isElectron) {
    //   this.electronService.ipcRenderer.send('change-lang', this.browserLang);
    // }
  }

  public trans(key: string) {
    this.browserLang = key;
    this.translate.use(this.browserLang);
    if (this.electronService.isElectron) {
      this.electronService.ipcRenderer.send('change-lang', this.browserLang);
    }
  }
}
