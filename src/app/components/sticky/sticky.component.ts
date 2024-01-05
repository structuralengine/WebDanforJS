import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {Notes} from '../sticky/sticky.model';
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

  constructor() { }

  ngOnInit() {
  }

  onRemoveNote(){
    this.removeNote.emit(this.index);
  }

  addNote(){
    this.addnote.emit(this.index);
  }

  onAddNote(){
    this.noteAdded.emit({title : this.title,description:this.description});
  }

  
  dragEnd(e){
   this.note[this.index].top=e.y;
    
    
  console.log(e);
  }

  set(e)
  {
    console.log(e);
  }

}