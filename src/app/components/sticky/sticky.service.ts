import { EventEmitter, Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputBarsService } from "../bars/bars.service";
// import { InputBarsService } from "../bars/bars.service";
// import { InputDesignPointsService } from "../design-points/design-points.service";

@Injectable({
  providedIn: "root",
})
export class StickyService  {
 
  public id: string;
  public text: string;
  public x: number;
  public y: number;
  // 疲労情報
  public notes: { id: string, title: string, description: string }[] = [];
  public dataEvent: EventEmitter<any> = new EventEmitter();
  constructor(
    // private helper: DataHelperModule,
    // private points: InputDesignPointsService,
    // private bars: InputBarsService
  ) {
    this.clear();
  }
  public clear(): void {
   
  }

  public getSaveData(): { id: string, title: string, description: string }[] {
    return this.notes;

  }
  public setSaveData(id: string, title?: string, description?: string) {
    this.notes.push({ id, title, description });
  }
  public getData(data:any){
    if (data) {
      this.dataEvent.emit(data);
    }
    return data;
  }
  public ipnutNote(id: string, text: string, x: number, y: number) {
    this.id = id;
    this.text = text;
    this.x = x;
    this.y = y;
  }
}
