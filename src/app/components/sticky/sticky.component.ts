import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {Notes} from '../sticky/sticky.model';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { SaveDataService } from "src/app/providers/save-data.service";
import { StickyService  } from './sticky.service';
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
    private stickynote: StickyService 
  ) { }

  ngOnInit() {
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.saveData();
      // this.onInitData();
    });
    // this.onInitData();
  }
  public saveData(): void {
    // const a = [];
    // console.log(this.note_datas, "note_datas");
    // for (const g of this.note_datas) {
    //   for (const e of g) {
    //     a.push(e);
    //   }
    // }
    // this.saveNotes.saveData(this.note_datas);
  }
  onRemoveNote(){
    this.removeNote.emit(this.index);
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