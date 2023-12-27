import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputDesignPointsService } from "../design-points/design-points.service";

@Injectable({
  providedIn: "root",
})
export class MenuService {

  public selectedRoad: boolean = false;
  public selectedStressMethod: boolean = false;

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
  setStressMethod(check:boolean){
    this.selectedStressMethod=check
  }
}
