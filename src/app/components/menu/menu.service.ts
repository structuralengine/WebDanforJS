import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputDesignPointsService } from "../design-points/design-points.service";
import { Subject } from "rxjs";
@Injectable({
  providedIn: "root",
})
export class MenuService {
  public checkedRadioSubject = new Subject<number>();
  public checkedRadio$ = this.checkedRadioSubject.asObservable();
  public selectedRoad: boolean = false;
  checkedRadio: any;
  // 部材情報
  constructor() {

  }
  setCheckedRadio(value: number) {
    this.checkedRadio = value;
    this.checkedRadioSubject.next(value);
  }

  getCheckedRadio(): number {
    return this.checkedRadio;
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
