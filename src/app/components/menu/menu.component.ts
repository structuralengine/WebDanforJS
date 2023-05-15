import { Component, ViewChild } from "@angular/core";
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

import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputMembersService } from "../members/members.service";
import { InputDesignPointsService } from "../design-points/design-points.service";
import { Auth, getAuth } from "@angular/fire/auth";
//import { AngularFireAuth } from '@angular/fire/compat/auth';

import { LanguagesService } from "../../providers/languages.service";

@Component({
  selector: "app-menu",
  templateUrl: "./menu.component.html",
  styleUrls: ["./menu.component.scss"],
})
export class MenuComponent {
  constructor(
    private modalService: NgbModal,
    public app: AppComponent,
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private helper: DataHelperModule,
    private router: Router,
    private config: ConfigService,
    //public auth: AngularFireAuth,
    public auth: Auth,
    public language: LanguagesService,
  ) {
    this.auth = getAuth();
  }

  // ログイン関係
  logIn(): void {
    this.modalService.open(LoginDialogComponent, {backdrop: false}).result.then((result) => {});
  }

  logOut(): void {
    // this.user.clear();
    this.auth.signOut();
  }

  public goToLink() {
    window.open(
      "https://liberating-rodent-f3f.notion.site/697a045460394d03a8dc859f15bf97ea",
      "_blank"
    );
  }
}
