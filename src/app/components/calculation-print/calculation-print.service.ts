import { Injectable } from '@angular/core';
import { InputMembersService } from '../members/members.service';
import { forEach } from 'jszip';

@Injectable({
  providedIn: 'root'
})
export class InputCalclationPrintService {

  public print_selected: any;
  public calc_checked: boolean[];

  constructor(private members: InputMembersService) {
    this.clear();
  }

  private default_print_selected(): any  {
    return {
      print_calculate_checked: false,
      print_section_force_checked: false,
      print_safety_ratio_checked: false,
      print_summary_table_checked: false,
      calculate_moment_checked: false,
      calculate_shear_force: false,
      calculate_torsional_moment: false,
      member_group_selection : []
    }
  }

  public clear(): void {
    this.print_selected = this.default_print_selected()
    this.calc_checked = new Array();
  }

  public getColumnData(): any[] {
    const result: any[] = new Array();

    const groups: any[] = this.members.getGroupeList();
    for ( let i = 0; i < groups.length; i++) {
      let checked = true;
      if ( i < this.calc_checked.length ) {
        checked = this.calc_checked[i];
      }
      result.push({
        'checked': checked,
        'g_name': groups[i][0].g_name
      });
    }
    return result;
  }

  public setColumnData(ColumnData: any[] ): void {
    this.calc_checked = new Array();
    for ( const data of ColumnData ){
      this.calc_checked.push(data.calc_checked);
    }
  }

  public getSaveData(): any {
    return this.print_selected
  }

  public setSaveData(calc: any): void {
    this.clear();

    // this.print_selected = this.default_print_selected()
    for(const key of Object.keys(this.print_selected)){
      if(key in calc){
        this.print_selected[key] = calc[key];
      }
    }

    //Check if "calc" don't have member_group_selection
    if(this.print_selected.member_group_selection.length === 0)
    {
      const groups =  this.getColumnData();
      for (var i = 0; groups.length > i; i++)
      this.print_selected.member_group_selection.push({
        GroupName: groups[i].g_name,
        Checked: groups[i].checked
      });
    }
  }
}
