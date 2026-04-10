import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class MenuService {
  setSpecification1Subject = new Subject<number>();
  setSpecification1$ = this.setSpecification1Subject.asObservable();

  setSpecification2Subject = new Subject<number>();
  setSpecification2$ = this.setSpecification2Subject.asObservable();
}
