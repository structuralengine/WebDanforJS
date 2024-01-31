import { Injectable } from "@angular/core";
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
  private notes: { id: string, title: string, description: string }[] = [];

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
    // You can implement your saving logic here, for example, saving to local storage or making an HTTP request to save the data on the server
    // For demonstration purposes, let's say we are saving the data to local storage
    return this.notes;
  }
  public setSaveData(id: string, title: string, description: string) {
    this.notes.push({ id, title, description });
  }
  public ipnutNote(id: string, text: string, x: number, y: number) {
    this.id = id;
    this.text = text;
    this.x = x;
    this.y = y;
  }
}
