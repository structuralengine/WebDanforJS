import { Injectable } from '@angular/core';
import { InputMembersService } from '../members/members.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { TranslateService } from '@ngx-translate/core';
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { constants } from 'buffer';

@Injectable({
  providedIn: 'root'
})

export class InputMaterialStrengthVerificationConditionService { 
  private material_bar: any; 
  private material_concrete: any;  
  private component: any;
  private verification: any;
  private other: any;
  public groupe_name: any[]
  constructor(
    private members: InputMembersService,
    private helper: DataHelperModule,
    private translate: TranslateService,
    private basic: InputBasicInformationService,
  ) { 
    this.clear();
  }
  public getTableColumns(): any {
    
    const material_bar = {};  
    const material_concrete = {};
    const component = {};
    const verification = {};
    const other = {};
    // グリッド用データの作成
    const groupe_list = this.members.getGroupeList();
    for (const groupe of groupe_list) {
      const first = groupe[0];
      const id = first.g_id;

      // 空のデータを1行追加する
      
      const tmp_material_bar = this.default_material_bar();      
      const tmp_material_concrete = this.default_material_concrete();     
      const tmp_component = this.default_component();
      const tmp_verification = this.default_verification();
      const tmp_other = this.default_other()     
      if (id in this.material_bar) {
        const old_material_bar = this.material_bar[id];
        for (let i = 0; i < tmp_material_bar.length; i++) {
          const tmp = tmp_material_bar[i];
          const old = old_material_bar[i];
          for (const key of Object.keys(tmp)) {
            if (key in old) {
              tmp[key] = old[key];
            }
          }
        }
      }     

      if (id in this.material_concrete) {
        const old_material_concrete = this.material_concrete[id];
        for (const key of Object.keys(tmp_material_concrete)) {
          if (key in old_material_concrete) {
            tmp_material_concrete[key] = old_material_concrete[key];
          }
        }
      }
     
      if(id in this.component){
        const old_component = this.component[id];
        for(let i = 0; i< tmp_component.length; i++){
          const tmp = tmp_component[i];
          const old = old_component[i];
          for(const key of Object.keys(tmp)){
            if(key === 'title')
              continue;
            if(key in old){
              tmp[key] = old[key]
            }
          }
        }
      }  
      if(id in this.verification){
        const old_verification = this.verification[id];
        for(let i = 0; i< tmp_verification.length; i++){
          const tmp = tmp_verification[i];
          const old = old_verification[i];
          for(const key of Object.keys(tmp)){
            if(key === 'title')
              continue;
            if(key in old){
              tmp[key] = old[key]
            }
          }
        }
      }
      if(id in this.other){
        const old_other= this.other[id];
        for(let i = 0; i< tmp_other.length; i++){
          const tmp = tmp_other[i];
          const old = old_other[i];
          for(const key of Object.keys(tmp)){
            if(key === 'title')
              continue;
            if(key in old){
              tmp[key] = old[key]
            }
          }
        }
      }
   
      material_bar[id] = tmp_material_bar
      material_concrete[id] = tmp_material_concrete;     
      component[id]= tmp_component
      verification[id] = tmp_verification
      other[id] = tmp_other
    }
  
    return {   
      groupe_list,
      material_bar,   
      material_concrete,      
      component,
      verification,
      other
    };

  }
  
  public default_material_bar(): any {
    const sp1 = this.basic.get_specification1();
    let result: any = [
      {
        separate: 25,
        tensionBar: { fsy: 345, fsu: 490 },
        sidebar: { fsy: 345, fsu: 490 },
        stirrup: { fsy: 345, fsu: 490 },
        bend: { fsy: 345, fsu: 490 }
      },
      {
        separate: 29,
        tensionBar: { fsy: 390, fsu: 560 },
        sidebar: { fsy: 390, fsu: 560 },
        stirrup: { fsy: 390, fsu: 560 },
        bend: { fsy: 390, fsu: 560 }
      }
    ]
    if (sp1 === 1) {
      result = [
        {
          tensionBar: { fsy: 415, fsu: 550 },
          sidebar: { fsy: 415, fsu: 550 },
          stirrup: { fsy: 415, fsu: 550 },
          bend: { fsy: 415, fsu: 550 }
        }
      ]
    }

    return result;
  }
  public default_material_concrete(): any {
    const result = {
      fck: 24,
      dmax: 25
    };
    return result;
  } 
  public default_verification(): any{
    const result = [
      {
        id: 0,
        title: this.translate.instant("material-strength-verifiaction-condition.var_st"),
        selected: false,
        type: null
      },
      {
        id: 1,
        title: this.translate.instant("material-strength-verifiaction-condition.acc_st"),
        selected: false,
        type: null
      },
    ];
    return result;
  }

  public default_component(): any{
    const result =  [
      {
        id: 0,
        title: this.translate.instant("material-strength-verifiaction-condition.ge_pa"),
        selected: false           
      },
      {
        id: 1,
        title: this.translate.instant("material-strength-verifiaction-condition.fla_for_flo_sla"),
        selected: false            
      },
      {
        id: 2,
        title: this.translate.instant("material-strength-verifiaction-condition.sub"),
        selected: true           
      },
      {
        id: 11,
        title: this.translate.instant("material-strength-verifiaction-condition.co"),
        selected: true           
      },
    ];
    return result;
  }
  public default_other(): any{
    let result =  [
      {
        id: 0,
        title: this.translate.instant("material-strength-verifiaction-condition.sep"),
        selected: false           
      },
      {
        id: 1,
        title: this.translate.instant("material-strength-verifiaction-condition.do_not"),
        selected: false           
      }            
    ];
    return result;
  }

  public setSaveData(material: any) {  
    this.material_bar = material.material_bar,  
    this.material_concrete = material.material_concrete 
    this.component = material.component ?? {}
    this.verification = material.verification ?? {}
    this.other = material.other??{}
  }
  public clear(): void {
    this.material_bar = {}; 
    this.material_concrete = {};   
    this.component = {};
    this.verification = {};
    this.other = {};
  }


  public setTableColumns(material: any): void {
    this.clear();

    for (const id of Object.keys(material.material_concrete)) {

    
      const tmp_material_bar = this.default_material_bar(); 
      const tmp_material_concrete = this.default_material_concrete()
      const tmp_component = this.default_component();
      const tmp_verification = this.default_verification();
      const tmp_other = this.default_other();

      if (id in material.material_bar) {
        const new_material_bar = material.material_bar[id];
        for (let i = 0; i < tmp_material_bar.length; i++) {
          const tmp = tmp_material_bar[i];
          const org = new_material_bar[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) { tmp[key] = org[key]; }
          }
        }
      }
      if (id in material.material_concrete) {
        const new_material_concrete = material.material_concrete[id];
        for (const key of Object.keys(tmp_material_concrete)) {
          if (key in new_material_concrete) {
            tmp_material_concrete[key] = new_material_concrete[key];
          }
        }
      }
      if (id in material.component) {
        const new_component = material.component[id];
        for (let i = 0; i < tmp_component.length; i++) {
          const tmp = tmp_component[i];
          const org = new_component[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) { tmp[key] = org[key]; }
          }
        }
      }
      if (id in material.verification) {
        const new_verification = material.verification[id];
        for (let i = 0; i < tmp_verification.length; i++) {
          const tmp = tmp_verification[i];
          const org = new_verification[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) { tmp[key] = org[key]; }
          }
        }
      }
      if (id in material.other) {
        const new_other = material.other[id];
        for (let i = 0; i < tmp_other.length; i++) {
          const tmp = tmp_other[i];
          const org = new_other[i];
          for (const key of Object.keys(tmp)) {
            if (key in org) { tmp[key] = org[key]; }
          }
        }
      }
      this.material_bar[id] = tmp_material_bar;   
      this.component[id] = tmp_component;
      this.other[id] = tmp_other;
      this.verification[id] = tmp_verification;
      this.material_concrete[id] = tmp_material_concrete;
    }

  }
  public getSaveData(): any {
    return {      
      material_bar: this.material_bar,   
      material_concrete: this.material_concrete,
      component: this.component,
      verification: this.verification,
      other: this.other
    }
  }
}
