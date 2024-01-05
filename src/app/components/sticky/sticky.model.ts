export class Notes{
    public title:string;
    public description:string;
    public top:number=0;
    public left:number=0;
  
    constructor(title:string,description:string, top:number, left:number){
      this.title=title;
      this.description=description;
      this.top=top;
      this.left=left;
    } 
  }