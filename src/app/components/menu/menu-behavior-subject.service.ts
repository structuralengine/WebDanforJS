import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MenuBehaviorSubject {
  public menuBehaviorSubject$ = new BehaviorSubject<string>("1");

  constructor() { }

  setValue(value: string) {
    this.menuBehaviorSubject$.next(value);
  }

  getValue() {
    return this.menuBehaviorSubject$.asObservable();
  }
}