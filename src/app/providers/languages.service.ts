import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { DataHelperModule } from "./data-helper.module";

@Injectable({
  providedIn: "root",
})
export class LanguagesService {
  public browserLang: string;
  public languageIndex = {
    ja: "日本語",
    en: "English",
  };

  private readonly default_lang: string = "en";

  constructor(
    public translate: TranslateService,
    public helper: DataHelperModule
  ) {

    if(translate.getBrowserLang() in this.languageIndex)
      this.browserLang = translate.getBrowserLang();
    else
      this.browserLang = this.default_lang;

    //console.log("BROWSER LANG: ", this.browserLang);
    translate.use(this.browserLang);
  }

  public trans(key: string) {
    this.browserLang = key;
    this.translate.use(this.browserLang);
  }
}
