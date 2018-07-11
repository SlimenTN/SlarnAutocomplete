import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    AfterViewInit,
    Output,
    ViewChild,
    forwardRef
} from '@angular/core';
import {ACService} from './slarn-autocomplete.service';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

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
    _selectedItem: any | Array<any>;

    /**
     * list contains code of keys that will trigger the search function
     * and the keys that represent navigation action
     * @link https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
     */
    private _keys = {
        searchTriggerKeys: [46, 222, 8, 32],
        navigationKeys: [38, 40]// up & down keys
    };
    private propagateChange: any = null;
    private typingTimer = null;
    private doneTypingInterval = 250;

    displaySuggestions: boolean = false;
    loadingData: boolean = false;
    filteredItems: Array<any> = [];

    @ViewChild('autocompleteInput') autocompleteInput: ElementRef;
    @ViewChild('displayAllBtn') displayAllBtn: ElementRef;
    @ViewChild('container') container: ElementRef;
    @ViewChild('spanX') spanX: ElementRef;

    @Input('configuration') configuration: ACLocalConfiguration | ACRemoteConfiguration;
    @Output('onItemSelected') onItemSelected: EventEmitter<any> = new EventEmitter();

    constructor(private _service: ACService) { }

    @Input()
    set selectedId(value: number | string | Array<number | string>) {
        this._selectedId = value;
        // after setting key value we search for the related item
        if(this.configuration.multiple && !Array.isArray(value)){
          console.log('multiple autocomplete and value not an array, converting _selectedId to array and push the value');
          this._selectedId = [];
          this._selectedId.push(value);

        }

        if(!this.configuration.multiple && Array.isArray(value))
          throw new Error('You have passed an array value to be selected\n either change the value or set the "multiple" option to true in the configuration.');

        this.searchAndSelectItemFromKey();
    }

    get selectedId(): number | string | Array<number | string> {
        return this._selectedId;
    }

    ngOnInit() {
        this.initConfiguration();
    }

    ngAfterViewInit(){
        this.extractTemplateVariables();

        // I called this listener in ngAfterViewInit because I cant the listener
        // to be set one time
        // ngOnInit is fired after ngOnChanges which is called eafter any change in the view
        document.addEventListener('click', this.checkIfClickedInside, true);
    }

    /**
     * Listener to check if user clicked outside of the autocomplete
     * If he did then we should hide the suggestion list
     * So we make sure that the autocomplete acts like any other list
     */
    checkIfClickedInside = (event: Event) => {
        let isClickInside = this.container.nativeElement.contains(event.target);
        if(!isClickInside) this.displaySuggestions = false;
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

    toggleDisplaySuggestions($event) {
        if(!this.displaySuggestions){
            this.displaySuggestions = true;
            if ((<ACLocalConfiguration> this.configuration).data) {// if it's local configuration

                this.searchLocally('', (<ACLocalConfiguration> this.configuration).data);

            } else if ((<ACRemoteConfiguration> this.configuration).url) {// if it's remote configuration

                this.searchRemotely('', (<ACRemoteConfiguration> this.configuration).url);

            }
        }else{
            this.displaySuggestions = false;
        }
    }

    /**
     * Init default configuration
     */
    private initConfiguration() {
        if (!this.configuration.emptyListText) this.configuration.emptyListText = 'No match found!';
        if (!this.configuration.loadingText) this.configuration.loadingText = 'Loading data...';
        if (!this.configuration.multiple) this.configuration.multiple = false;
    }

    /**
     * Search and select item by key value
     */
    private searchAndSelectItemFromKey() {
        console.log('searchAndSelectItemFromKey');
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

        if(this.configuration.multiple){
          this._selectedItem = [];
          data.forEach(item => {
            // console.log('item[this.configuration.key]: ' + item[this.configuration.key]);
            if ((<Array<number | string>> this._selectedId).includes(item[this.configuration.key])) {
              this._selectedItem.push(item);
            }
          });
        }else{
          this._selectedItem = null;
          data.forEach(item => {
            // console.log('item[this.configuration.key]: ' + item[this.configuration.key]);
            if (item[this.configuration.key] == this._selectedId) {
              console.log('found', item);
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
        if (this.configuration.template == '' || this.configuration.template == null)
            throw new Error('You have forgot to specify the template of your autocomplete');

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
              if(!this.configuration.multiple){
                this.displaySuggestions = false;
                this.clearAutocomplete();
                this.dispatchData();
              }
            } else {
                this.displaySuggestions = true;
                if ((<ACLocalConfiguration> this.configuration).data) {// if it's local configuration

                    this.searchLocally(reg, (<ACLocalConfiguration> this.configuration).data);

                } else if ((<ACRemoteConfiguration> this.configuration).url) {// if it's remote configuration
                    // when working remotely and for better user experience
                    // the searchRemotely function will be fired when user finish typing
                    // and we assume that finishing typing means not pressing key for like 250ms
                    this.loadingData = true;
                    this.filteredItems = [];
                    if (this.typingTimer != null) clearTimeout(this.typingTimer);
                    this.typingTimer = setTimeout(() => {
                        this.searchRemotely(reg, (<ACRemoteConfiguration> this.configuration).url);
                    }, this.doneTypingInterval);

                }
            }
        }
    }

  /**
   * Delete item from selected list
   * And dispatch data
   * @param index
   */
  deleteFromSelectedItems(index: number){
      this._selectedItem.splice(index, 1);
      this._selectedId.splice(index, 1);

      if(this._selectedItem.length == 0){
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
     * If it's a local configuration then we will search inside the configuration.data object
     * @param word word to search
     * @param data filtered data
     */
    private searchLocally(word: string, data: Array<any>) {
        this.filteredItems = [];
        data.forEach((item) => {
            let _str = JSON.stringify(item);
            if (_str.toLowerCase().indexOf(word.toLowerCase()) != -1) this.filteredItems.push(item);
        });
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
            this.filteredItems = res;
            if (selectItemAfterSearch) this.selectItemFromData(this.filteredItems);
            this.loadingData = false;
        });
    }

    /**
     * Build view with data based on the given template
     * @param object
     * @return string built view
     */
    buildView(object: any): string {
        // console.log('object.toString()', object.toString());
        let view: string = this.configuration.template;
        this._templateVariables.forEach((res: string) => {
            let key = res.replace(/\#/g, '');// remove # from the string
            let value: string = (key.indexOf('.') == -1) ? object[key] : this.extractValue(key, object);
            view = view.replace(res, value);// replace words with object value
        });
        return view;
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
            if (!(key in _currentObject)) throw new Error('Can\'t find the key "' + key + '" in the object "' + JSON.stringify(_currentObject) + '"!');

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
    performSelection(item) {
        // console.log('selected item', item);
        if(this.configuration.multiple){
            if(this._selectedItem == null) this._selectedItem = [];
            this._selectedItem.push(item);
            if(this._selectedId == null) this._selectedId = [];
            (<Array<number | string>> this._selectedId).push(item[this.configuration.key]);
            this.autocompleteInput.nativeElement.value = '';
        }else{
            this._selectedItem = item;
            this._selectedId = item[this.configuration.key];
            this.autocompleteInput.nativeElement.value = this._selectedItem[this.configuration.value];
            this.displaySuggestions = false;
        }

        this.dispatchData();
    }

    /**
     * Dispatch data to external components
     */
    private dispatchData() {
        // emit the whole object when item selected
        this.onItemSelected.emit(this._selectedItem);

        // propagate only the key to the form
        // console.log('propagation _selectedId: ' + this._selectedId);
        if(this.propagateChange != null) this.propagateChange(this._selectedId);
    }

    registerOnChange(fn) {
        this.propagateChange = fn;
    }

    registerOnTouched(fn: any) { }

    writeValue(value: any) {
        this._selectedId = value;
        // after setting key value we search for the related item
        if (value != '' && value != null && value != undefined)
            this.searchAndSelectItemFromKey();
    }
}


/**
 * Suggestion component for Autocomplete
 */
@Component({
    selector: 'slarn-ac-suggestion',
    template: `
        <div class="sg" (click)="selectItem()">
            <ng-content></ng-content>
        </div>
    `,
    styles: [`
        .sg {
            padding: 5px;
            cursor: default;
            border-bottom: solid 1px #f1eeee
        }

        .sg:hover {
            background: #ececec;
        }
    `],
})
export class SlarnAutocompleteSuggestionComponent implements OnInit {
    @Input('item') item: any;
    @Output('onSuggestionClicked') onSuggestionClicked: EventEmitter<any> = new EventEmitter();

    constructor() { }

    ngOnInit() { }

    selectItem() { this.onSuggestionClicked.emit(this.item); }
}

/**
 * AutoComplete configuration
 */
export interface Configuration {
    // template that will be displayed in the suggestions list
    template: string;

    /**
     * key will be stored in the input
     * must be the unique value of the object (ex: id)
     * will be used to search item and when sending form
     */
    key: string;

    // value will be displayed to the user in the input
    value: string;

    // name will be giving to the input
    name?: string

    // placeholder of the input
    placeHolder?: string;

    // allow multiple selection (default: false)
    multiple?: boolean;

    // text will be displayed when loadign data remotly
    loadingText?: string;

    // text will be displayed when no match found
    emptyListText?: string;
}

/**
 * Remote configuration used when you want to work remotely with an api
 */
export interface ACRemoteConfiguration extends Configuration {
    // URL of the API
    url: string;
}

/**
 * Local configuration: used if you want to pass data explicitly to the AutoComplete
 */
export interface ACLocalConfiguration extends Configuration {
    data: Array<any>;
}
