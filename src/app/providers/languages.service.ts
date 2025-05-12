import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { DataHelperModule } from "./data-helper.module";
import { ElectronService } from "./electron.service";
const SELECTED_LANGUAGE = 'lang';
@Injectable({
  providedIn: "root",
})
export class LanguagesService {
  public browserLang: string;
  public languageIndex = {
    ja: "日本語",
    en: "English",
  };
  constructor(
    public translate: TranslateService,
    public helper: DataHelperModule,
    public electronService: ElectronService,
  ) {
    let savedLang: string | null = null;
    if(localStorage) savedLang = localStorage.getItem(SELECTED_LANGUAGE);
    const getValidLang = (lang: string | null): string | null => {
      return lang && lang in this.languageIndex ? lang : null;
    };
    let browserLang = getValidLang(savedLang) ||
      getValidLang(this.translate.getBrowserLang()) ||
      getValidLang(this.translate.currentLang) ||
      'ja';
    this.browserLang = browserLang;
    this.updateLanguage();
  }

  public trans(key: string) {
    this.browserLang = key;
    this.translate.use(this.browserLang);
    this.updateLanguage();
  }

  public updateLanguage(): void {
    localStorage.setItem(SELECTED_LANGUAGE, this.browserLang);
    if (this.electronService.isElectron) this.electronService.ipcRenderer.send("change-lang", this.browserLang);
  }
}
