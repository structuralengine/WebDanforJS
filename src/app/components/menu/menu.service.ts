import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputDesignPointsService } from "../design-points/design-points.service";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class MenuService {

  public selectedRoad: boolean = false;
  public isReview: boolean = false;
  public data: any
  // 部材情報
  constructor() {

  }
  selectApply(i:number){
    this.selectedRoad = false;
    if(i === 2) this.selectedRoad = true;
  }
  reloadTranslate(selectedRoad:boolean){
    this.selectedRoad = !selectedRoad;
    this.selectedRoad = selectedRoad;
  }
}
