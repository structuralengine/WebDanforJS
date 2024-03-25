import { Component, EventEmitter, Input, OnInit, Output, } from '@angular/core';

@Component({
  selector: 'app-modal-preview',
  templateUrl: './modal-preview.component.html',
  styleUrls: ['./modal-preview.component.scss']
})
export class ModalPreview implements OnInit {
  constructor() { }
  @Input() show: boolean = false;
  @Input() element: any ;
  @Output() closeModal = new EventEmitter<any>()
  ngOnInit() {

  }
  closePreview(){
    this.show = false;
    const member_dev = window.document.querySelector(this.element.iconId);
    member_dev.classList.remove("activeQ")
    this.closeModal.emit(true)
  }
}
