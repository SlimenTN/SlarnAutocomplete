
import {Directive, ElementRef, HostListener, Input} from "@angular/core";

@Directive({
  selector: '[autoGrow]',

})
export class AutoGrowDirective{
  @Input('activated') activated: boolean = true;
  constructor(private elem: ElementRef){}

  @HostListener('keyup')
  @HostListener('keydown')
  @HostListener('keypress ')
  autoGrow(){
    if(this.activated){
      let input = this.elem.nativeElement;
      this.fireAutoGrow(input);
    }
  }

  private fireAutoGrow(input){
    let pad_right = 5;
    let tmp = document.createElement('div');
    tmp.style.padding = '0';
    if(getComputedStyle)
      tmp.style.cssText = getComputedStyle(input, null).cssText;
    if(input.currentStyle)
      tmp.style.cssText = input.currentStyle.cssText;
    tmp.style.width = '';
    tmp.style.position = 'absolute';
    tmp.innerHTML = input.value.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/ /g, '&nbsp;');
    input.parentNode.appendChild(tmp);
    let width = tmp.clientWidth+pad_right+1;
    tmp.parentNode.removeChild(tmp);
    input.style.width = width+'px';
  }
}
