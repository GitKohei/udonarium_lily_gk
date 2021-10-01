import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { CookieService } from 'ngx-cookie-service';
//
import { EventSystem, Network } from '@udonarium/core/system';
import { ChatTachieImageComponent } from 'component/chat-tachie-img/chat-tachie-img.component';
//
import { Define } from '@udonarium/define';

@Component({
  selector: 'ui-panel',
  templateUrl: './ui-panel.component.html',
  styleUrls: ['./ui-panel.component.css'],
  providers: [
    PanelService,
  ],
  animations: [
    trigger('flyInOut', [
      transition('void => *', [
        animate('100ms ease-out', keyframes([
          style({ transform: 'scale(0.8, 0.8)', opacity: '0', offset: 0 }),
          style({ transform: 'scale(1.0, 1.0)', opacity: '1', offset: 1.0 })
        ]))
      ]),
      transition('* => void', [
        animate(100, style({ transform: 'scale(0, 0)' }))
      ])
    ])
  ]
})
export class UIPanelComponent implements OnInit {
  @ViewChild('draggablePanel', { static: true }) draggablePanel: ElementRef<HTMLElement>;
  @ViewChild('scrollablePanel', { static: true }) scrollablePanel: ElementRef<HTMLDivElement>;
  @ViewChild('titleBar', { static: true }) titleBar: ElementRef<HTMLDivElement>;
  @ViewChild('content', { read: ViewContainerRef, static: true }) content: ViewContainerRef;

  @Input() set title(title: string) { this.panelService.title = title; }
  @Input() set left(left: number) { this.panelService.left = left; }
  @Input() set top(top: number) { this.panelService.top = top; }
  @Input() set width(width: number) { this.panelService.width = width; }
  @Input() set height(height: number) { this.panelService.height = height; }

  get title(): string { return this.panelService.title; }
  get left() { return this.panelService.left; }
  get top() { return this.panelService.top; }
  get width() { return this.panelService.width; }
  get height() { return this.panelService.height; }

  private preLeft: number = 0
  private preTop: number = 0;
  private preWidth: number = 100;
  private preHeight: number = 100;

  isFullScreen: boolean = false;
  isMinimized: boolean = false;

  get isPointerDragging(): boolean { return this.pointerDeviceService.isDragging; }

  constructor(
    public panelService: PanelService,
    private pointerDeviceService: PointerDeviceService,
    private cookieService: CookieService,
    private elementRef: ElementRef,
    ) { }
  
  
  private tachieDispByMouse: boolean = true;
  
  showTachie(flag:boolean){
    
    this.tachieDispByMouse = flag;
  }
  
  
  
  ngOnInit() {
    this.panelService.scrollablePanel = this.scrollablePanel.nativeElement;
/*
    EventSystem.register(this)
      .on('CUT_IN_PANEL_POS_CHANGE', event => { 
//        console.log('EVENT:CUT_IN_PANEL_POS_CHANGE :' + this.title);
        if( this.isCutIn ){
          if( event.data.cutInIdentifier == this.panelService.cutInIdentifier && ( this.panelService.cutInIdentifier.length > 0 ) ){
            
            console.log('EVENT:CUT_IN_PANEL_POS_CHANGE >movePanel()');
            console.log( 'left:' + event.data.left + ' top:' + event.data.top + ' width:'+ event.data.width + ' height:'+ event.data.height);
            this.movePanel( event.data.left , event.data.top , event.data.width , event.data.height );
          }
        }
      });
*/
  }
  
/*
  movePanel( left : number , top : number , width : number , height : number){
      let panel = this.draggablePanel.nativeElement;

      this.left = left;
      this.top = top;
      this.width = width;
      this.height = height;

      panel.style.left = this.left + 'px';
      panel.style.top = this.top + 'px';
      panel.style.width = this.width + 'px';
      panel.style.height = this.height + 'px';

  }
*/
  panelStyleToCookieString(css: CSSStyleDeclaration): string {
    return ''+
    ((css.left)?('$left$'+css.left.replace('px','')):'')+
    ((css.top)?('$top$'+css.top.replace('px','')):'')+
    ((css.width)?('$width$'+css.width.replace('px','')):'')+
    ((css.height)?('$height$'+css.height.replace('px','')):'');
  }

  ngOnDestroy() {
    let panel = this.draggablePanel.nativeElement;
    this.cookieService.set('AppComponent_'+this.panelService.componentTyep, this.panelStyleToCookieString(panel.style), Define.EXPIRE());
  }

  toggleMinimize() {
    if (this.isFullScreen) return;

    let body  = this.scrollablePanel.nativeElement;
    let panel = this.draggablePanel.nativeElement;
    if (this.isMinimized) {
      this.isMinimized = false;
      body.style.display = null;
      this.height = this.preHeight;
    } else {
      this.preHeight = panel.offsetHeight;

      this.isMinimized = true;
      body.style.display = 'none';
      this.height = this.titleBar.nativeElement.offsetHeight;
    }
  }

  toggleFullScreen() {
    if (this.isMinimized) return;

    let panel = this.draggablePanel.nativeElement;
    if (panel.offsetLeft <= 0
      && panel.offsetTop <= 0
      && panel.offsetWidth >= window.innerWidth
      && panel.offsetHeight >= window.innerHeight) {
      this.isFullScreen = false;
    } else {
      this.isFullScreen = true;
    }

    if (this.isFullScreen) {
      this.preLeft = panel.offsetLeft;
      this.preTop = panel.offsetTop;
      this.preWidth = panel.offsetWidth;
      this.preHeight = panel.offsetHeight;

      this.left = 0;
      this.top = 0;
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      panel.style.left = this.left + 'px';
      panel.style.top = this.top + 'px';
      panel.style.width = this.width + 'px';
      panel.style.height = this.height + 'px';
    } else {
      this.left = this.preLeft;
      this.top = this.preTop;
      this.width = this.preWidth;
      this.height = this.preHeight;
    }
  }
  
  get padding_(): string {
    if( this.panelService.isCutIn )return '0px';
    else return '8px';
  }
    
  get isCutIn(): boolean {
    return this.panelService.isCutIn ;
  }
  
  close() {
    if (this.panelService) this.panelService.close();
  }
  
  backGroundSetting( isWhiteLog :boolean ): string{
    
//    if( isWhiteLog )
    if( 0 )
      return "background: linear-gradient(-30deg, rgba(255,255,255, 1.0), rgba(255, 255, 255, 1.0)); "
//      return "background: linear-gradient(-30deg, rgba(240,240,240, 0.9), rgba(240, 240, 240, 0.9));"
    else
      return "background: linear-gradient(-30deg, rgba(240,218,189, 0.9), rgba(255, 244, 232, 0.9));"
  }
  
}
