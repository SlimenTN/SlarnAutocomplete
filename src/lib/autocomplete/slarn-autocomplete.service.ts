import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable()
export class ACService {

    constructor(
        private _http: HttpClient
    ) { }

    search(word: string, url: string): Observable<any>{
        let _url = new URL(url);
        _url.searchParams.append('ac-reg', word);
        return this._http.get(_url.toString());
    }
}
