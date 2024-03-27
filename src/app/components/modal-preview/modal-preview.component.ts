import { Component, EventEmitter, HostListener, Input, OnInit, Output, SimpleChanges, } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-modal-preview',
  templateUrl: './modal-preview.component.html',
  styleUrls: ['./modal-preview.component.scss']
})
export class ModalPreview implements OnInit {
  @Input() element: any ;
  @Output() closeModal = new EventEmitter<any>()
  public dataDropDown=[
    {      
      title:"modal_preview.Rectangle", 
      image: "Rectangle"
    },
    {
      title:"modal_preview.TShape",
      image:"TShape"
    },
    {
      title:"modal_preview.Circle",
      image:"Circle"
    },
    {
      title:"modal_preview.Ring",
      image:"Ring"
    },
    {
      title:"modal_preview.HorizontalOval",
      image:"HorizontalOval"
    },
    {
      title:"modal_preview.VerticalOval",
      image:"VerticalOval"
    },
  ]
  public select:string = "modal_preview.Rectangle";
  public checkShowDropDown:boolean= false
  public imgLink: string;
  public nameImage: string ="Rectangle";
  public currentLang: string;
  public folder: string = "member-guide"
  constructor(
    private helper: DataHelperModule,
    private translate: TranslateService,
  ) { 
    this.translate.onLangChange.subscribe(() => {
      this.getSelect(this.dataDropDown);
    });
  }
  @HostListener("document:click", ["$event"])
  public mouseClick(event: any){
    if(event.target?.id!=="text-b" && event.target?.id!=="icon-b" && event.target?.id!=="button-show"){
      this.checkShowDropDown=false
    }
  }
  ngOnInit() {
    this.getLink(this.nameImage);
    document.getElementById("text-b").innerHTML = this.translate.instant(this.select);
  }
  ngOnChanges(changes: SimpleChanges): void {
      if('element' in changes && changes["element"]?.currentValue?.iconId !== changes["element"]?.previousValue?.iconId){
        let modal = document.getElementById("body-container-id")
        modal.style.top="179px"
        modal.style.left="492px"
        switch(changes['element'].currentValue.iconId){
          case "#member-dev-question-ax":{
            this.folder = "reinforcing-bar/axial-bar";
            this.dataDropDown=[
              {
                title:"modal_preview.Rectangle", 
                image: "Rectangle"
              },
              {
                title:"modal_preview.TShape",
                image:"TShape"
              },
              {
                title:"modal_preview.CircleRing",
                image:"Circle-Ring"
              },              
              {
                title:"modal_preview.HorizontalOval",
                image:"HorizontalOval"
              },
              {
                title:"modal_preview.VerticalOval",
                image:"VerticalOval"
              },
            ]
            modal.style.top="250px"
            modal.style.left="850px"
            break;
          }
          case "#member-dev-question-la":{
            this.folder = "reinforcing-bar/lateral-bar";
            this.dataDropDown=[
              {
                title:"modal_preview.Rectangle", 
                image: "Rectangle"
              },
              {
                title:"modal_preview.TShape",
                image:"TShape"
              },                      
              {
                title:"modal_preview.HorizontalOval",
                image:"HorizontalOval"
              },
              {
                title:"modal_preview.VerticalOval",
                image:"VerticalOval"
              },
            ]
            modal.style.top="250px"
            modal.style.left="850px"
            break;
          }
          default:{
            this.folder = "member-guide"
            break;
          }
        }
        this.nameImage="Rectangle"
        this.getSelect(this.dataDropDown);
        this.getLink(this.nameImage)
      }
  }
  closePreview(){
    const member_dev = window.document.querySelector(this.element.iconId);
    member_dev.classList.remove("activeQ")
    this.closeModal.emit(true)
  }
  handleSelectItem(data:any){
    this.select=this.translate.instant(data.title);
    document.getElementById("text-b").innerHTML = this.select;
    this.checkShowDropDown=false;
    this.getLink(data.image);
    this.nameImage=data.image
  }
  showDropDown(){
    this.checkShowDropDown=!this.checkShowDropDown
  }
  getLink(name: string){
    this.currentLang = this.translate.currentLang;
    this.imgLink = `assets/img/${this.folder}/${this.currentLang}/${name}.svg`;
  }
  getSelect(dataDrop: any []){
     let index = dataDrop.findIndex(data => data.image === this.nameImage);
     this.select = this.translate.instant(dataDrop[index].title);
     document.getElementById("text-b").innerHTML = this.select;
  }
}