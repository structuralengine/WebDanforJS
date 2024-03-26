import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, } from '@angular/core';
import { ThreeMemberService } from '../three/geometry/three-member.service';

@Component({
  selector: 'app-modal-preview',
  templateUrl: './modal-preview.component.html',
  styleUrls: ['./modal-preview.component.scss']
})
export class ModalPreview implements OnInit {
  constructor(
    private node: ThreeMemberService
  ) { }
  @Input() show: boolean = false;
  @Input() element: any ;
  @Output() closeModal = new EventEmitter<any>()
  ngOnInit() {
  }
  ngOnChanges(changes: SimpleChanges): void {
      if('show' in changes && changes["show"].currentValue){
        this.node.drawingRetangle();
      }
  }
  closePreview(){
    this.show = false;
    const member_dev = window.document.querySelector(this.element.iconId);
    member_dev.classList.remove("activeQ")
    this.closeModal.emit(true)
  }
}
