import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SlarnAutocompleteComponent, SlarnAutocompleteSuggestionComponent } from './autocomplete/slarn-autocomplete.component';
import { ACService } from './autocomplete/slarn-autocomplete.service';
import { HttpClientModule } from '@angular/common/http';
import {AutoGrowDirective} from "./autocomplete/auto-grow.directive";

@NgModule({
  imports: [
    CommonModule, HttpClientModule
  ],
  declarations: [
    SlarnAutocompleteComponent, SlarnAutocompleteSuggestionComponent, AutoGrowDirective
  ],
  providers: [ACService],
  exports: [
    SlarnAutocompleteComponent
  ]
})
export class SlarnAutocompleteModule { }
