import {Directive, Input, Renderer, ElementRef} from '@angular/core'

@Directive({
  selector: '[focused]'
})
export class FocusedDirective {
  @Input()
  set focused(value: boolean){
    if(value){
      this.renderer.invokeElementMethod(this.elementRef.nativeElement, 'scrollIntoViewIfNeeded');
      this.elementRef.nativeElement.style.background = '#ececec';
    }else{
      this.elementRef.nativeElement.style.background = null;
    }
  }

  constructor(private elementRef: ElementRef, private renderer: Renderer){}
}
