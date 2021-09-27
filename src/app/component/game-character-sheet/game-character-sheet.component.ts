import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';

import { EventSystem, Network } from '@udonarium/core/system';
import { DataElement } from '@udonarium/data-element';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TabletopObject } from '@udonarium/tabletop-object';

import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { SaveDataService } from 'service/save-data.service';

import { GameCharacter } from '@udonarium/game-character'; //

@Component({
  selector: 'game-character-sheet',
  templateUrl: './game-character-sheet.component.html',
  styleUrls: ['./game-character-sheet.component.css']
})
export class GameCharacterSheetComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() tabletopObject: TabletopObject = null;
  isEdit: boolean = false;

  networkService = Network;

  isSaveing: boolean = false;
  progresPercent: number = 0;

  constructor(
    private saveDataService: SaveDataService,
    private panelService: PanelService,
    private modalService: ModalService
  ) { }

  ngOnInit() {
    EventSystem.register(this)
      .on('DELETE_GAME_OBJECT', -1000, event => {
        if (this.tabletopObject && this.tabletopObject.identifier === event.data.identifier) {
          this.panelService.close();
        }
      });
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
  }

  addDataElement() {
    if (this.tabletopObject.detailDataElement) {
      let title = DataElement.create('見出し', '', {});
      let tag = DataElement.create('タグ', '', {});
      title.appendChild(tag);
      this.tabletopObject.detailDataElement.appendChild(title);
    }
  }

  clone() {
    let cloneObject = this.tabletopObject.clone();
    cloneObject.location.x += 50;
    cloneObject.location.y += 50;
    if (this.tabletopObject.parent) this.tabletopObject.parent.appendChild(cloneObject);
    cloneObject.update();
    switch (this.tabletopObject.aliasName) {
      case 'terrain':
        SoundEffect.play(PresetSound.blockPut);
        (cloneObject as any).isLocked = false;
        break;
      case 'card':
      case 'card-stack':
        (cloneObject as any).owner = '';
        (cloneObject as any).toTopmost();
      case 'table-mask':
        (cloneObject as any).isLock = false;
        SoundEffect.play(PresetSound.cardPut);
        break;
      case 'text-note':
        (cloneObject as any).toTopmost();
        SoundEffect.play(PresetSound.cardPut);
        break;
      case 'dice-symbol':
        SoundEffect.play(PresetSound.dicePut);
      default:
        SoundEffect.play(PresetSound.piecePut);
        break;
    }
  }
  
  clickHide(){
    //処理なし
  }

  clickNoTalk(){
    //処理なし    
  }

  clickLimitHeight(){
    //高さが更新されない場合があるので雑だがこの方法で処理する
    setTimeout(() => { 
      EventSystem.trigger('RESIZE_NOTE_OBJECT', {identifier :this.tabletopObject.identifier })
    }, 100);
  }

  chkPopWidth( width ){
    let character = <GameCharacter>this.tabletopObject;
    if( width < 270 )
      width = 270 ;
    if( width > 800 )
      width = 800 ;
    character.overViewWidth = width;
  }

  chkPopMaxHeight( maxHeight ){
    let character = <GameCharacter>this.tabletopObject;
    if( maxHeight < 250 )
      maxHeight = 250 ;
    if( maxHeight > 1000 )
      maxHeight = 1000 ;
    character.overViewMaxHeight = maxHeight;
  }  async saveToXML() {
    if (!this.tabletopObject || this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;
    let element = this.tabletopObject.detailDataElement.getFirstElementByName('FileName');
    let objectName: string = '';
    if(element) {
      objectName += element ? <string>element.value : '';
    } else {
      objectName += 'xml_';
      let nameProtocol: string[] = ['種族','レベル','ロール','生息地','name'];
      nameProtocol.forEach(protocol => {
        let element = this.tabletopObject.commonDataElement.getFirstElementByName(protocol);
        if(!element) element = this.tabletopObject.detailDataElement.getFirstElementByName(protocol);
        objectName += element ? <string>element.value+'_' : '';
      });
    }

    await this.saveDataService.saveGameObjectAsync(this.tabletopObject, objectName, percent => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  setLocation(locationName: string) {
    this.tabletopObject.setLocation(locationName);
  }

  openModal(name: string = '', isAllowedEmpty: boolean = false) {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: isAllowedEmpty }).then(value => {
      if (!this.tabletopObject || !this.tabletopObject.imageDataElement || !value) return;
      let element = this.tabletopObject.imageDataElement.getFirstElementByName(name);
      if (!element) return;
      element.value = value;
    });
  }
}
