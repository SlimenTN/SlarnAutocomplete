import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SlarnAutocompleteComponent, SlarnAutocompleteSuggestionComponent } from './autocomplete/slarn-autocomplete.component';
import { ACService } from './autocomplete/slarn-autocomplete.service';
import { HttpClientModule } from '@angular/common/http';
import {AutoGrowDirective} from "./autocomplete/auto-grow.directive";
import {FocusedDirective} from "./autocomplete/focus.directive";
import {SafeHtmlPipe} from "./autocomplete/safe-html.pipe";

@NgModule({
  imports: [
    CommonModule, HttpClientModule
  ],
  declarations: [
    SlarnAutocompleteComponent, SlarnAutocompleteSuggestionComponent, AutoGrowDirective, FocusedDirective, SafeHtmlPipe
  ],
  providers: [ACService],
  exports: [
    SlarnAutocompleteComponent
  ]
})
export class SlarnAutocompleteModule { }
