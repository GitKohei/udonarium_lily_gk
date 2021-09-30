import { ComponentFactoryResolver, ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
import { ChatTab } from '@udonarium/chat-tab';
import { parse } from 'path';
import { stringify } from 'querystring';

declare var Type: FunctionConstructor;
interface Type<T> extends Function {
  new(...args: any[]): T;
}

export interface PanelOption {
  title?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  
  isCutIn?: boolean; //この方式でよいか検討のこと
  cutInIdentifier?: string;

  componentType?: string;
}

export function parseCookieStringToPanelOption(cookiePanelOption: string): PanelOption {
  if(!cookiePanelOption) return null;
  let _title: string = null;
  let _left: number = null;
  let _top: number = null;
  let _width: number = null;
  let _height: number = null;
  let _isCutIn: boolean = null;
  let _cutInIdentifier: string = null;
  let _componentType: string = null;
  let argText: string[] = cookiePanelOption.split('$');
  for(let i=0; i<argText.length; ++i) {
    if(argText[i]=='title') _title = argText[i+1];
    if(argText[i]=='left')  _left =+ argText[i+1];
    if(argText[i]=='top')   _top =+ argText[i+1];
    if(argText[i]=='width') _width =+ argText[i+1];
    if(argText[i]=='height') _height =+ argText[i+1];
    if(argText[i]=='isCutIn') _isCutIn = (argText[i+1]=='true');
    if(argText[i]=='cutInIdentifier') _cutInIdentifier = argText[i+1];
    if(argText[i]=='componentTyep') _componentType = argText[i+1];
  }

  return { title:_title, left:_left, top:_top, width:_width, height:_height, isCutIn:_isCutIn, cutInIdentifier:_cutInIdentifier, componentType:_componentType };
}

@Injectable()
export class PanelService {
  /* Todo */
  static defaultParentViewContainerRef: ViewContainerRef;
  static UIPanelComponentClass: { new(...args: any[]): any } = null;

  private panelComponentRef: ComponentRef<any>
  title: string = '無名のパネル';
  left: number = 0;
  top: number = 0;
  width: number = 100;
  height: number = 100;
  isCutIn: boolean = false ; //この方式でよいか検討のこと
  cutInIdentifier: string = '';
  chatTab: ChatTab = null;
  componentTyep: string = null;

  scrollablePanel: HTMLDivElement = null;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver
  ) { }

  get isShow(): boolean {
    return this.panelComponentRef ? true : false;
  }

  open<T>(childComponent: Type<T>, option?: PanelOption, parentViewContainerRef?: ViewContainerRef): T {
    if (!parentViewContainerRef) {
      parentViewContainerRef = PanelService.defaultParentViewContainerRef;
    }
    let panelComponentRef: ComponentRef<any>;

    const injector = parentViewContainerRef.injector;

    const panelComponentFactory = this.componentFactoryResolver.resolveComponentFactory(PanelService.UIPanelComponentClass);
    const bodyComponentFactory = this.componentFactoryResolver.resolveComponentFactory(childComponent);

    panelComponentRef = parentViewContainerRef.createComponent(panelComponentFactory, parentViewContainerRef.length, injector);
    let bodyComponentRef: ComponentRef<any> = panelComponentRef.instance.content.createComponent(bodyComponentFactory);

    const childPanelService: PanelService = panelComponentRef.injector.get(PanelService);

    childPanelService.panelComponentRef = panelComponentRef;
    if (option) {
      if (option.title) childPanelService.title = option.title;
      if (option.top) childPanelService.top = option.top;
      if (option.left) childPanelService.left = option.left;
      if (option.width) childPanelService.width = option.width;
      if (option.height) childPanelService.height = option.height;
      if (option.isCutIn){
         childPanelService.isCutIn = option.isCutIn;  //この方式でよいか検討のこと
      }
      if (option.cutInIdentifier){
         childPanelService.cutInIdentifier = option.cutInIdentifier;  //この方式でよいか検討のこと
      }
      if (option.componentType) childPanelService.componentTyep = option.componentType;
      
//      if (option.chatTab){
//         childPanelService.chatTab = option.chatTab;  //この方式でよいか検討のこと
//      }
      
    }
    panelComponentRef.onDestroy(() => {
      childPanelService.panelComponentRef = null;
    });

    return <T>bodyComponentRef.instance;
  }

  close() {
    if (this.panelComponentRef) {
      this.panelComponentRef.destroy();
      this.panelComponentRef = null;
    }

  }
}