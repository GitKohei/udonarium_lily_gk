import { ComponentFactoryResolver, ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
import { ChatTab } from '@udonarium/chat-tab';

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