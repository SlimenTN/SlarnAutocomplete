import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SlarnAutocompleteComponent, SlarnAutocompleteSuggestionComponent } from './autocomplete/slarn-autocomplete.component';
import { ACService } from './autocomplete/slarn-autocomplete.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [
    CommonModule, HttpClientModule
  ],
  declarations: [
    SlarnAutocompleteComponent, SlarnAutocompleteSuggestionComponent
  ],
  providers: [ACService],
  exports: [
    SlarnAutocompleteComponent
  ]
})
export class SlarnAutocompleteModule { }
