import { DurabilityDataComponent } from './components/durability-data/durability-data.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BlankPageComponent } from './components/blank-page/blank-page.component';
import { BasicInformationComponent } from './components/basic-information/basic-information.component';
import { MembersComponent } from './components/members/members.component';
import { DesignPointsComponent } from './components/design-points/design-points.component';
import { BarsComponent } from './components/bars/bars.component';
import { SteelsComponent } from './components/steels/steels.component';
import { FatiguesComponent } from './components/fatigues/fatigues.component';
import { SafetyFactorsMaterialStrengthsComponent } from './components/safety-factors-material-strengths/safety-factors-material-strengths.component';
import { SectionForcesComponent } from './components/section-forces/section-forces.component';
import { CalculationPrintComponent } from './components/calculation-print/calculation-print.component';
//import { ResultViewerComponent } from './calculation/result-viewer/result-viewer.component';
import { CrackSettingsComponent } from './components/crack/crack-settings.component';
import { ShearComponent } from './components/shear/shear.component';
import { MaterialStrengthVerificationConditionComponent } from './components/material-strength-verification-conditions/material-strength-verification-conditions.component';
import { BasicInformationStressMethodComponent } from './components/basic-information-stress-method/basic-information-stress-method.component';
import { FatiguesStressMethodComponent } from './components/fatigues-stress-method/fatigues-stress-method.component';
import { SectionForcesStressMethodComponent } from './components/section-forces-stress-method/section-forces-stress-method.component';
import { SafetyFactorsMaterialStrengthsStressMethodComponent } from './components/safety-factors-material-strengths-stress-method/safety-factors-material-strengths-stress-method.component';


const routes: Routes = [
    { path:"",  component: BlankPageComponent},
    { path: 'basic-information', component: BasicInformationComponent },
    { path: 'basic-information-stress-method', component: BasicInformationStressMethodComponent },
    { path: 'members', component: MembersComponent },
    { path: 'design-points', component: DesignPointsComponent },
    { path: 'bars', component: BarsComponent },
    { path: 'steels', component: SteelsComponent },
    { path: 'shear', component: ShearComponent },
    { path: 'crack', component: CrackSettingsComponent },
    { path: 'fatigues', component: FatiguesComponent },
    { path: 'fatigues-stress-method', component: FatiguesStressMethodComponent },
    { path: 'safety-factors-material-strengths', component: SafetyFactorsMaterialStrengthsComponent },
    { path: 'safety-factors-material-strengths-stress-method', component: SafetyFactorsMaterialStrengthsStressMethodComponent},
    { path: 'section-forces', component: SectionForcesComponent },
    { path: 'section-forces-stress-method', component: SectionForcesStressMethodComponent },
    { path: 'durability_data', component: DurabilityDataComponent },
    { path: 'calculation-print', component: CalculationPrintComponent },
//    { path: 'result-viewer', component: ResultViewerComponent },
    { path: 'blank-page', component: BlankPageComponent },
    {path: 'material-strength-verification-conditions', component: MaterialStrengthVerificationConditionComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    useHash: false,
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled'
})],
  exports: [RouterModule]
})
export class AppRoutingModule {


}
