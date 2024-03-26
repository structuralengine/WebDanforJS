import { Component, EventEmitter, HostListener, Input, OnInit, Output, SimpleChanges, } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { TranslateService } from '@ngx-translate/core';



@Component({
  selector: 'app-modal-preview',
  templateUrl: './modal-preview.component.html',
  styleUrls: ['./modal-preview.component.scss']
})
export class ModalPreview implements OnInit {
  @Input() show: boolean = false;
  @Input() element: any ;
  @Output() closeModal = new EventEmitter<any>()
  public dataDropDown=[
    {
      id:1,
      title:"modal_preview.Rectangle"
    },
    {
      id:2,
      title:"modal_preview.TShape"
    },
    {
      id:3,
      title:"modal_preview.Circle"
    },
    {
      id:4,
      title:"modal_preview.Ring"
    },
    {
      id:5,
      title:"modal_preview.HorizontalOval"
    },
    {
      id:6,
      title:"modal_preview.VerticalOval"
    },
  ]
  public select:string = "modal_preview.Rectangle";
  public checkShowDropDown:boolean= false
  constructor(
    private helper: DataHelperModule,
    private translate: TranslateService,
  ) { }
  @HostListener("document:click", ["$event"])
  public mouseClick(event: any){
    if(event.target?.id!=="text-b" && event.target?.id!=="icon-b" && event.target?.id!=="button-show"){
      this.checkShowDropDown=false
    }
  }
  ngOnInit() {
  }
  ngOnChanges(changes: SimpleChanges): void {
      if('show' in changes && changes["show"].currentValue){        
      }
  }
  closePreview(){
    this.show = false;
    const member_dev = window.document.querySelector(this.element.iconId);
    member_dev.classList.remove("activeQ")
    this.closeModal.emit(true)
  }
  handleSelectItem(data:any){
    this.select=this.translate.instant(data.title);
    this.checkShowDropDown=false
  }
  showDropDown(){
    this.checkShowDropDown=!this.checkShowDropDown
  }
}