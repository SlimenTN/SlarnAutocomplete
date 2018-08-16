import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  AfterViewInit,
  Output,
  ViewChild,
  forwardRef, ViewChildren, QueryList
} from '@angular/core';
import {ACService} from './slarn-autocomplete.service';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {ACTranslator, dynamic_translation, translator} from "./translation";

@Component({
  selector: 'slarn-autocomplete',
  templateUrl: './slarn-autocomplete.component.html',
  styleUrls: ['./slarn-autocomplete.component.css'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SlarnAutocompleteComponent),
    multi: true
  }],
  // encapsulation: ViewEncapsulation.Emulated,
})
export class SlarnAutocompleteComponent implements OnInit, AfterViewInit, ControlValueAccessor {
  private _templateVariables: RegExpMatchArray;
  private _selectedId: number | string | Array<number | string>;
  _selectedItem: any | Array<SelectedItem>;

  /**
   * list contains code of keys that will trigger the search function
   * and the keys that represent navigation action
   * @link https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
   */
  private _keys = {
    searchTriggerKeys: [46, 222, 8, 32],
    navigationKeys: [38, 40, 13]// up, down, enter
  };
  private propagateChange: any = null;
  private typingTimer = null;
  private doneTypingInterval = 250;
  private _selectedIndexFromNavigation: number = -1;
  // private _isLocalConfig: boolean;

  displaySuggestions: boolean = false;
  loadingData: boolean = false;
  filteredItems: Array<any> = [];
  groups: Array<string> = null;
  filteredGroupedItems: any;
  translator = translator;

  @ViewChild('autocompleteInput') autocompleteInput: ElementRef;
  @ViewChild('displayAllBtn') displayAllBtn: ElementRef;
  @ViewChild('container') container: ElementRef;
  @ViewChild('spanX') spanX: ElementRef;
  @ViewChildren('acsuggestion') suggestions: QueryList<SlarnAutocompleteSuggestionComponent>;

  @Input('configuration') configuration: any;
  @Output('onItemSelected') onItemSelected: EventEmitter<any> = new EventEmitter();

  constructor(private _service: ACService) {
    // require('style-loader!./../../themes/default.css');
  }

  @Input()
  set selectedId(value: number | string | Array<number | string>) {
    this.filterSelectedValue(value);
    this.searchAndSelectItemFromKey();
  }

  /**
   * Filter given value and make sure that the autocomplete gets the correct data
   * to work as expected
   * @param value
   */
  private filterSelectedValue(value) {
    this._selectedId = value;
    // after setting key value we search for the related item
    if (this.configuration.multiple && !Array.isArray(value)) {
      // console.log('multiple autocomplete and value not an array, converting _selectedId to array and push the value');
      this._selectedId = [];
      this._selectedId.push(value);
    }

    if (!this.configuration.multiple && Array.isArray(value))
      throw new Error(this.translator.dictionary.errors.passingArrayValueWithNoMultipleOption[this.configuration.language]);

    if ((Array.isArray(value) && this.arrayHasObject(value))
      || (!Array.isArray(value) && typeof value === 'object'))
      throw new Error(this.translator.dictionary.errors.unknownType[this.configuration.language]);
  }

  /**
   * Check array contain one or many objects
   * @param value
   */
  private arrayHasObject(value: Array<any>) {
    let hasObject = false;
    value.forEach(e => {
      if (typeof e === 'object') hasObject = true;
    });
    return hasObject;
  }

  /**
   * Return the selected key(s)
   */
  get selectedId(): number | string | Array<number | string> {
    return this._selectedId;
  }

  /**
   * Return the selected item(s)
   */
  get selectedItem(): any {
    return (Array.isArray(this._selectedItem)) ? this.extractSelectedItems() : this._selectedItem;
  }

  ngOnInit() {
    this.initConfiguration();
  }

  ngAfterViewInit() {
    this.extractTemplateVariables();

    // I called this listener in ngAfterViewInit because I don't want the listener
    // to be set one time
    // ngOnInit is fired after ngOnChanges which is called after any change in the view
    document.addEventListener('click', this.checkIfClickedInside, true);
  }

  /**
   * Listener to check if user clicked outside of the autocomplete
   * If he did then we should hide the suggestion list
   * So we make sure that the autocomplete acts like any other list
   */
  checkIfClickedInside = (event: Event) => {
    let isClickInside = this.container.nativeElement.contains(event.target);
    if (!isClickInside) this.displaySuggestions = false;
    else this.autocompleteInput.nativeElement.focus();
  };

  /**
   * Clear autocomplete selection
   */
  clearAutocomplete() {
    this._selectedItem = null;
    this._selectedId = null;
    this.filteredItems = [];
  }

  /**
   * Hide or display suggestions list
   */
  toggleDisplaySuggestions() {
    if (!this.displaySuggestions) {
      this.openSuggestions();
    } else {
      this.closeSuggestions();
    }
  }

  /**
   * Init default configuration
   */
  private initConfiguration() {
    if (!this.configuration.rtl) this.configuration.rtl = false;
    this.prepareUsedLanguage();
    if (!this.configuration.multiple) this.configuration.multiple = false;
    if (!this.configuration.template) this.configuration.template = '<div>#' + this.configuration.value + '#</div>';
    if (!(<ACRemoteConfiguration> this.configuration).minCharacters) (<ACRemoteConfiguration> this.configuration).minCharacters = 1;
    if (!(<ACRemoteConfiguration> this.configuration).loadingView)
      (<ACRemoteConfiguration> this.configuration).loadingView = translator.dictionary.loadingText[this.configuration.language];
  }

  private prepareUsedLanguage(){
    if(!this.configuration.language) this.configuration.language = ACTranslator.EN;
    if(this.configuration.language && translator.availableLanguages.indexOf(this.configuration.language) == -1){
      let translation = dynamic_translation(
        this.translator.dictionary.errors.unknownLanguage[ACTranslator.EN],
        [this.configuration.language, JSON.stringify(translator.availableLanguages)]
      );
      throw new Error(translation);
    }

  }

  /**
   * Search and select item by key value
   */
  private searchAndSelectItemFromKey() {
    if ((<ACLocalConfiguration> this.configuration).data) {// if it's local configuration

      this.selectItemFromData((<ACLocalConfiguration> this.configuration).data);

    } else if ((<ACRemoteConfiguration> this.configuration).url) {// if it's remote configuration

      this.searchRemotely('', (<ACRemoteConfiguration> this.configuration).url, true);

    }
  }

  /**
   * Search and select item from data by the value of the key
   * @param data: any[]
   */
  private selectItemFromData(data: Array<any>) {

    if (this.configuration.multiple) {
      this._selectedItem = [];
      let counter = 0;
      data.forEach(item => {
        if ((<Array<number | string>> this._selectedId).includes(item[this.configuration.key])) {
          let si: SelectedItem = {elem: item, indexInFilteredItems: counter};
          this._selectedItem.push(si);
        }
        counter++;
      });
    } else {
      this._selectedItem = null;
      data.forEach(item => {
        if (item[this.configuration.key] == this._selectedId) {
          this._selectedItem = item;
        }
      });
    }
  }

  /**
   * Extract available keys from template
   * will be used to dislay data in the suggestions panel
   */
  private extractTemplateVariables() {
    // Regex to find the words between to #
    // may contain numbers and dots
    const regx = /\#(?:[a-zA-Z0-9_\.]+)\#/g;

    // get matched result
    this._templateVariables = this.configuration.template.match(regx);
  }

  /**
   * fired each time a user press a key
   * @param $event
   */
  onKeyup($event) {

    if (this.fireSearchKey($event)) {
      const reg = $event.target.value;
      if (reg == '') {
        this.displaySuggestions = false;
        if (!this.configuration.multiple) {

          this.clearAutocomplete();
          this.dispatchData();
        }
      } else {

        if ((<ACLocalConfiguration> this.configuration).data) {// if it's local configuration
          this.displaySuggestions = true;
          this.searchLocally(reg, (<ACLocalConfiguration> this.configuration).data);

        } else if ((<ACRemoteConfiguration> this.configuration).url) {// if it's remote configuration
          // when working remotely and for better user experience
          // the searchRemotely function will be fired when user finish typing
          // and we assume that finishing typing means not pressing key for like 250ms
          if((<ACRemoteConfiguration> this.configuration).minCharacters == reg.length){// make sure to call api after typing the need number of characters
            this.displaySuggestions = true;
            this.loadingData = true;
            this.filteredItems = [];
            if (this.typingTimer != null) clearTimeout(this.typingTimer);
            this.typingTimer = setTimeout(() => {
              this.searchRemotely(reg, (<ACRemoteConfiguration> this.configuration).url);
            }, this.doneTypingInterval);
          }
        }
      }
    } else if (this.navigationKey($event)) {
      $event.preventDefault();
      this.navigate($event.which);
    }
  }

  private navigate(key){
    this.clearAllSelections();
    switch(key){
      case 38:// up key pressed
        if(this._selectedIndexFromNavigation > 0) this._selectedIndexFromNavigation--;
        this.enableSelectionForSelectedSuggestion(this._selectedIndexFromNavigation);
        break;
      case 40:// down key pressed
        if(this._selectedIndexFromNavigation < this.filteredItems.length - 1) this._selectedIndexFromNavigation++;
        this.enableSelectionForSelectedSuggestion(this._selectedIndexFromNavigation);
        break;
      case 13:// enter key pressed
        let item: any = (this.configuration.group == null) ?
          this.filteredItems[this._selectedIndexFromNavigation] :
          // in case of using group _selectedIndexFromNavigation does not map with the correct index of filteredItems
          // that's why we do an extra work to get the correct item from the available index
          this.getItemFromGroup(this._selectedIndexFromNavigation);

        this.performSelection(item);
        break;
    }
  }

  /**
   * Get the right selected item when pressing enter key
   * @param i
   * @returns right item
   */
  private getItemFromGroup(i: number){
    let counter = 0;
    let selectedItem = null;
    console.log('groups', this.groups);
    for(let grp of this.groups){
      console.log('grp', grp);
      let _a: Array<any> = this.filteredGroupedItems[grp];
      for(let item of _a){
        if(i == counter) selectedItem = item;
        counter++;
      }
    }
    return selectedItem;
  }

  private enableSelectionForSelectedSuggestion(index: number){
    let sg: SlarnAutocompleteSuggestionComponent = this.suggestions.find((e, i, array) => {
      return (i == index);
    });
    sg.focusSuggestion = true;
  }

  /**
   *
   */
  private clearAllSelections(){
    this.suggestions.forEach((sg: SlarnAutocompleteSuggestionComponent, index: number, array) => {
        sg.focusSuggestion = false;
    });
  }

  /**
   * Delete item from selected list and dispatch changes
   * @param indexInSelectedItems
   * @param si
   */
  deleteFromSelectedItems(indexInSelectedItems: number, si: SelectedItem) {
    this._selectedItem.splice(indexInSelectedItems, 1);
    this.filteredItems.splice(si.indexInFilteredItems, 0, si.elem);
    this.buildGroupsIfNeeded();
    (<Array<number | string>> this._selectedId).splice(indexInSelectedItems, 1);

    if (this._selectedItem.length == 0) {
      this._selectedItem = null;
      this._selectedId = null;
    }

    this.dispatchData();
  }

  /**
   * After key down clear used timer to calculate
   * when user finished typing
   */
  onKeyDown($event) {
    if (this.typingTimer != null) clearTimeout(this.typingTimer);
  }

  /**
   * Check if this an alphabet or number key
   * @param $event keyup event
   * @return fireKeySearch
   */
  private fireSearchKey($event): boolean {
    return (
      ($event.which <= 105 && $event.which >= 48) ||
      (this._keys.searchTriggerKeys.indexOf($event.which) > -1)
    );
  }

  /**
   * Check if pressed key is a navigation key
   * @param $event
   * @returns
   */
  private navigationKey($event): boolean {
    return (this._keys.navigationKeys.indexOf($event.which) > -1)
  }

  /**
   * If it's a local configuration then we will search inside the configuration.data object
   * @param word word to search
   * @param data filtered data
   */
  private searchLocally(word: string, data: Array<any>) {
    this.filteredItems = [];
    data.forEach((item) => {
      let _str = JSON.stringify(item);
      if (
        _str.toLowerCase().indexOf(word.toLowerCase()) != -1 // if word exist in item
        && !this.existInSelectedItems(item) // and does not exist in selected items
      ) this.filteredItems.push(item);// then add it to filteredItems to be displayed in suggestions list

      this.buildGroupsIfNeeded();
    });
  }

  /**
   * Check if given item exist in _selectedItem array ot not
   * @param item
   */
  private existInSelectedItems(item: any): boolean {
    let exist: boolean;
    if (!Array.isArray(this._selectedItem)) {
      exist = false;
    } else {
      exist = (this._selectedItem.find(si =>
        si.elem[this.configuration.key] === item[this.configuration.key]
      ) != undefined);
    }
    return exist;
  }

  /**
   * If it's a remote configuration then we get the word and add it to the url
   * before sending the request to the api
   * @param word word to search
   * @param url api url
   * @param selectItemAfterSearch
   */
  private searchRemotely(word: string, url: string, selectItemAfterSearch?: boolean) {
    this.loadingData = true;
    this.filteredItems = [];
    this._service.search(word, url).subscribe(res => {
      // only push items who are not in _selectedItems list
      res.forEach((item) => {
        if (!this.existInSelectedItems(item)) this.filteredItems.push(item);
      });
      if (selectItemAfterSearch) this.selectItemFromData(this.filteredItems);
      this.buildGroupsIfNeeded();
      this.loadingData = false;
    });
  }

  /**
   * If grouping is requested by the user then we need to prepare it
   */
  private buildGroupsIfNeeded(){
    if(this.configuration.group != null){
      // console.log('before grouping', this.filteredItems);
      this.groups = [];
      this.filteredGroupedItems = {};

      let groupedData = this.group(this.filteredItems, this.configuration.group.field);
      let self = this;
      Object.keys(groupedData).sort().forEach(function(key) {
        self.filteredGroupedItems[key] = groupedData[key];
      });
      this.groups = Object.keys(this.filteredGroupedItems);
      // console.log('filteredGroupedItems', this.filteredGroupedItems);
      // console.log('groups', this.groups);
    }
  }

  /**
   * Pares array of items and return grouped object by the given field
   * @param list
   * @param keyGetter
   * @returns Grouped object
   */
  private group(list, keyGetter) {
    if(typeof keyGetter === 'undefined')
      throw new Error(this.translator.dictionary.errors.unknownFieldForGroupOption[this.configuration.language]);
    const map = {};
    list.forEach((item) => {
      const key = keyGetter(item);
      if (!(key in map)) map[key] = [];
      map[key].push(item);
    });
    return map;
  }

  /**
   * Build view with data based on the given template
   * @param object
   * @return string built view
   */
  buildSuggestionView(object: any): string {
    // console.log('object.toString()', object.toString());
    let view: string = this.configuration.template;
    this._templateVariables.forEach((res: string) => {
      let key = res.replace(/\#/g, '');// remove # from the string
      let value: string = this.extractValue(key, object);
      view = view.replace(res, value);// replace words with object value
    });
    return view;
  }

  /**
   * Build the view of the group based on giving template
   * @param {string} group
   * @returns {string | any | void}
   */
  buildGroupView(group: string){
    let template: string;
    if(!this.configuration.group.template || this.configuration.group.template == '')
      template = '<div style="background: #a7a3a3;padding: 5px;font-weight: bold;color: #fff;">#__group__#</div>';
    else
      template = this.configuration.group.template;
    return template.replace('#__group__#', group);
  }

  /**
   * Extract the correct value from the multidimensional object
   * @param keysString: string with keys separated by dots
   * @param object
   * @returns correct value
   */
  private extractValue(keysString: string, object: any): string {
    let result: string = null;
    let keys: Array<string> = keysString.split('.');
    let size = keys.length;
    let counter = 1;
    let _currentObject = object;

    keys.forEach(key => {
      if (!(key in _currentObject)){
        let translation = dynamic_translation(
          this.translator.dictionary.errors.unknownKeyValue[this.configuration.language],
          [key, JSON.stringify(_currentObject)]
        );
        throw new Error(translation);
      }

      if (counter < size) {
        _currentObject = _currentObject[key];
      } else {
        result = _currentObject[key];
      }
      counter++;
    });
    return result;
  }

  /**
   * Triggered after a user select a suggestion
   * @param item selected item from the list
   */
  performSelection(item: any) {
    // console.log('selected item', item);
    if (this.configuration.multiple) {

      let index = this.filteredItems.findIndex(e => e[this.configuration.key] == item[this.configuration.key]);
      console.log('index', index);
      if (this._selectedItem == null) this._selectedItem = [];
      let o: SelectedItem = {elem: item, indexInFilteredItems: index};
      // console.log('o', o);
      this._selectedItem.push(o);
      this.filteredItems.splice(index, 1);
      if (this.filteredItems.length == 0) this.displaySuggestions = false;// if filteredItems list is empty then hide suggestions list
      this.buildGroupsIfNeeded();

      if (this._selectedId == null) this._selectedId = [];
      (<Array<number | string>> this._selectedId).push(item[this.configuration.key]);
      this.autocompleteInput.nativeElement.value = '';
    } else {
      this._selectedItem = item;
      this._selectedId = item[this.configuration.key];
      this.autocompleteInput.nativeElement.value = this._selectedItem[this.configuration.value];
      this.displaySuggestions = false;
    }
    this._selectedIndexFromNavigation = -1;
    this.dispatchData();
  }

  /**
   * Dispatch data to external components
   */
  private dispatchData() {
    // emit the whole object when item selected
    if (Array.isArray(this._selectedItem))
      this.onItemSelected.emit(this.extractSelectedItems());
    else
      this.onItemSelected.emit(this._selectedItem);

    // propagate only the key to the form
    // console.log('propagation _selectedId: ' + this._selectedId);
    if (this.propagateChange != null) this.propagateChange(this._selectedId);
  }

  /**
   * Extract items from _selectedItems
   */
  private extractSelectedItems() {
    let items = [];
    (<Array<SelectedItem>> this._selectedItem).forEach(si => {
      items.push(si.elem);
    });
    return items;
  }

  registerOnChange(fn) {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any) {
  }

  writeValue(value) {
    // after setting key value we search for the related item
    if (value != '' && value != null && value != undefined) {
      this.filterSelectedValue(value);
      this.searchAndSelectItemFromKey();
    }
  }

  //======================================================================
  //        FUNCTIONS FOR EXTERNAL USAGE
  //======================================================================
  /**
   * Open suggestions list
   */
  openSuggestions(){
    if(!this.displaySuggestions){
      this.displaySuggestions = true;
      if ((<ACLocalConfiguration> this.configuration).data) {// if it's local configuration

        this.searchLocally('', (<ACLocalConfiguration> this.configuration).data);

      } else if ((<ACRemoteConfiguration> this.configuration).url) {// if it's remote configuration

        this.searchRemotely('', (<ACRemoteConfiguration> this.configuration).url);

      }
    }
  }

  /**
   * Close suggestions list
   */
  closeSuggestions(){
    this.displaySuggestions = false;
  }

  /**
   * Add new item to data
   * If there is another item with the same "key" value then the it will not be added
   * @param item
   * @param selectIt boolean: select the item after adding if true (false by default)
   */
  appendItem(item: any, selectIt: boolean){
    if ((<ACLocalConfiguration> this.configuration).data) {
      selectIt = (typeof selectIt === 'undefined') ? false : selectIt;
      let i =this.findItem((<ACLocalConfiguration> this.configuration).data, item);
      if(i == undefined){
        (<ACLocalConfiguration> this.configuration).data.push(item);
        if(selectIt) this.performSelection(item);
      }else{
        let translation = dynamic_translation(
          this.translator.dictionary.errors.duplicateItemDetected[this.configuration.language],
          [JSON.stringify(i), JSON.stringify(item)]
        );
        throw new Error(translation);
      }

    }else{
      throw new Error(this.translator.dictionary.errors.appendItemWorkOnlyLocally[this.configuration.language]);
    }
  }

  /**
   * Find if item already exist in data
   * @param data
   * @param item
   * @returns
   */
  private findItem(data: Array<any>, item: any){
    return data.find(elem => {
      return (elem[this.configuration.key] == item[this.configuration.key]);
    });
  }
}


/**
 * Suggestion component for Autocomplete
 */
@Component({
  selector: 'slarn-ac-suggestion',
  template: `
    <div class="sg" (click)="selectItem()" [focused]="focusSuggestion">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .sg {
      padding: 5px;
      cursor: default;
    }
    .sg:hover {
      background: #ececec;
    }
  `],
})
export class SlarnAutocompleteSuggestionComponent implements OnInit {
  @Input('item') item: any;
  @Output('onSuggestionClicked') onSuggestionClicked: EventEmitter<any> = new EventEmitter();
  focusSuggestion: boolean = false;

  constructor() { }

  ngOnInit() { }

  selectItem() {
    this.onSuggestionClicked.emit(this.item);
  }
}

/**
 * AutoComplete configuration
 */
export interface Configuration {
  /**
   * key will be stored in the input
   * must be the unique value of the object (ex: id)
   * will be used to search item and when sending form
   */
  key: string;

  /**
   * value will be displayed to the user in the input
   */
  value: string;

  /**
   * template that will be displayed in the suggestions list
   * if this attribute is not defined then the autocomplete will
   * use the default template and display only the value
   */
  template?: string;

  /**
   * The language that will be used to display default texts and errors
   */
  language?: string;

  /**
   * RTL Support (false by default)
   */
  rtl?: boolean;

  /**
   * name will be giving to the input
   */
  name?: string

  /**
   * allow multiple selection (default: false)
   */
  multiple?: boolean;

  /**
   * allow to group items by a specific field
   */
  group?: Group;
}

/**
 * Remote configuration used when you want to work remotely with an api
 */
export interface ACRemoteConfiguration extends Configuration {
  /**
   * URL to the API
   */
  url: string;

  /**
   * number of characters needed before calling api
   */
  minCharacters?: number;

  /**
   * text or html will be rendered when loading data remotely
   */
  loadingView?: string;
}

/**
 * Local configuration: used if you want to pass data explicitly to the AutoComplete
 */
export interface ACLocalConfiguration extends Configuration {
  data: Array<any>;
}

/**
 * Group items
 */
export interface Group{
  /**
   * Arrow function to specify the group field
   * Used arrow function instead of a simple field cuz the group field can be a field of another complex object
   */
  field: any;

  /**
   * Block that will be rendered for the group
   */
  template?: string;
}

/**
 * We will use this object to store selected items
 */
export interface SelectedItem {
  elem: any;// selected object
  indexInFilteredItems: number;// keep track of it's index in filteredItems so we can return it to it's exact place
}
