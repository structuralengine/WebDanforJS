import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {Notes} from '../sticky/sticky.model';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { SaveDataService } from "src/app/providers/save-data.service";
import { StickyService  } from './sticky.service';
import { MenuService } from '../menu/menu.service';
// import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-sticky',
  templateUrl: './sticky.component.html',
  styleUrls: ['./sticky.component.scss']
})
export class StickyComponent implements OnInit {

  @Output() noteAdded = new EventEmitter<{title:string,description:string}>();
  @Input() note:Notes[];
  @Input() index:number;
  title = '';
  description = '';
   @Output() removeNote =new EventEmitter();
   @Output() addnote =new EventEmitter();
   public note_datas: { id: string, text: string, x: number, y: number }[] = [];

  constructor(
    private translate: TranslateService,
    private save: SaveDataService,
    private stickynote: StickyService ,
    private menuService: MenuService,
  ) { }

  ngOnInit() {
    // this.onInitData();

    if (this.menuService.saveSticky && this.menuService.saveSticky.length > 0) {
      this.title = this.menuService.saveSticky[this.index].title;
      this.description = this.menuService.saveSticky[this.index].description;
    }
  }
  public saveData(): void {
    
  }
  onRemoveNote(){
    this.removeNote.emit(this.index);
  }
  minimized:boolean = false;

  //hiding info box
  onMinimizeNote(){
    this.minimized = !this.minimized;
  }
  addNote(){
    // Generate a unique ID for the new note
    const id = this.generateUniqueId();
    this.addnote.emit(this.index);
    this.stickynote.setSaveData(id, this.title, this.description);
  }

  onAddNote(){
    this.noteAdded.emit({title : this.title,description:this.description});
  }

  addTitle(){
  }
  addDes(){
    

  }
  dragEnd(e){
   this.note[this.index].top=e.y;        
  
  }

  set(e)
  {
  
  }
  // Function to generate a unique ID
  private generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 16);
  }
}