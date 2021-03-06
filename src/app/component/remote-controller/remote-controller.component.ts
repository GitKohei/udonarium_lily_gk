import { ElementRef, Input, ViewChild } from '@angular/core';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import GameSystemClass from 'bcdice/lib/game_system';

import { ChatPalette } from '@udonarium/chat-palette';
import { ChatTab } from '@udonarium/chat-tab';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { DiceBot } from '@udonarium/dice-bot';
import { GameCharacter } from '@udonarium/game-character';
import { PeerCursor } from '@udonarium/peer-cursor';
import { ControllerInputComponent } from 'component/controller-input/controller-input.component';
import { ChatMessageService } from 'service/chat-message.service';
import { PanelOption, PanelService } from 'service/panel.service';

import { GameObject } from '@udonarium/core/synchronize-object/game-object';
import { DataElement } from '@udonarium/data-element';
import { SortOrder } from '@udonarium/data-summary-setting';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TabletopObject } from '@udonarium/tabletop-object';
import { ChatPaletteComponent } from 'component/chat-palette/chat-palette.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { ContextMenuAction, ContextMenuService, ContextMenuSeparator } from 'service/context-menu.service';
import { GameObjectInventoryService } from 'service/game-object-inventory.service';
import { PointerDeviceService } from 'service/pointer-device.service';

import { GameDataElementBuffComponent } from 'component/game-data-element-buff/game-data-element-buff.component';
import { GameCharacterBuffViewComponent } from 'component/game-character-buff-view/game-character-buff-view.component';

class RemotControllerSelect {
  identifier: string;
  type: string;
  name: string;
}

@Component({
  selector: 'remote-controller',
  templateUrl: './remote-controller.component.html',
  styleUrls: ['./remote-controller.component.css']

})
export class RemoteControllerComponent implements OnInit, OnDestroy {

  get palette(): ChatPalette { return this.character.remoteController; }

  private _gameSystem: GameSystemClass;

  get gameType(): string { return this._gameSystem == null ? '' : this._gameSystem.ID };
  set gameType(gameType: string) {
    DiceBot.loadGameSystemAsync(gameType).then((gameSystem) => {
      this._gameSystem = gameSystem;
      if (this.character.remoteController) this.character.remoteController.dicebot = gameSystem.ID;
    });
  };

  get sendFrom(): string { return this.character.identifier; }
  set sendFrom(sendFrom: string) {
    this.onSelectedCharacter(sendFrom);
  }

  get diceBotInfos() { return DiceBot.diceBotInfos; }

  get chatTab(): ChatTab { return ObjectStore.instance.get<ChatTab>(this.chatTabidentifier); }
  get myPeer(): PeerCursor { return PeerCursor.myCursor; }
  get otherPeers(): PeerCursor[] { return ObjectStore.instance.getObjects(PeerCursor); }

  constructor(
    public chatMessageService: ChatMessageService,
    private panelService: PanelService,

    private changeDetector: ChangeDetectorRef,
    private inventoryService: GameObjectInventoryService,
    private contextMenuService: ContextMenuService,
    private pointerDeviceService: PointerDeviceService

  ) {
    this.initTimestamp = Date.now();
    console.log('constructor this.initTimestamp ' + this.initTimestamp);
  }

  get sortTag(): string { return this.inventoryService.sortTag; }
  set sortTag(sortTag: string) { this.inventoryService.sortTag = sortTag; }
  get sortOrder(): SortOrder { return this.inventoryService.sortOrder; }
  set sortOrder(sortOrder: SortOrder) { this.inventoryService.sortOrder = sortOrder; }
  get dataTag(): string { return this.inventoryService.dataTag; }
  set dataTag(dataTag: string) { this.inventoryService.dataTag = dataTag; }
  get dataTags(): string[] { return this.inventoryService.dataTags; }

  get sortOrderName(): string { return this.sortOrder === SortOrder.ASC ? '??????' : '??????'; }

  get newLineString(): string { return this.inventoryService.newLineString; }
  @ViewChild('controllerInput', { static: true }) controllerInputComponent: ControllerInputComponent;
  @ViewChild('chatPalette') chatPaletteElementRef: ElementRef<HTMLSelectElement>;
  @Input() character: GameCharacter = null;
  errorMessageBuff = '';
  errorMessageController = '';

  private _gameType = '';
  private initTimestamp = 0;

  public buffAreaIsHide = false;
  public controllerAreaIsHide = false;

  chatTabidentifier = '';

  remoteNumber = 0;
  numOfBlockingTimes = 0;

  recoveryLimitFlag = true;
  get includeBlockFlag(): boolean { return this.numOfBlockingTimes != 0; }
  instantShowFlag = true;

  disptimer = null;

  selectCharacter = null;

  remoteControllerSelect: RemotControllerSelect = {
    identifier: '',
    type: '',
    name: ''
  };
  remotControllerRadio = '';

  remotControlleridentifier: string[] = ['test01', 'test02'];
  testTag = '0001';

  _text = '';
  sendTo = '';

  isEdit = false;
  editPalette = '';

  private doubleClickTimer: NodeJS.Timer = null;

  charList: string[] = [];


  inventoryTypes: string[] = ['table', 'common', 'graveyard'];
  selectTab = 'table';
  selectedIdentifier = '';

  hideChkBoxEvent(eventValue: boolean) {
    this.buffAreaIsHide = eventValue;
  }
  controllerHideChkChange(eventValue: boolean) {
    this.controllerAreaIsHide = eventValue;
  }
  recoveryLimitFlagChange(value) {
    // ?????????????????????????????????????????????????????????????????????????????????
  }
  includeBlockFlagChange(value) {
    // same.
  }
  instantShowFlagChange(value) {
    // same.
  }


  reverseValue() {
    this.remoteNumber = -1 * this.remoteNumber;
  }


  remoteSelect(identifier: string, type: string, name: string) {
    this.remoteControllerSelect.identifier = identifier;
    this.remoteControllerSelect.type = type;
    this.remoteControllerSelect.name = name;
    console.log(this.remoteControllerSelect);
  }

  charListChange(charName: string, checked: boolean) {

    if (checked) {
      if (this.charList.indexOf(charName) < 0) {
        this.charList.push(charName);
      }
    } else {
      if (this.charList.indexOf(charName) > -1) {
        this.charList.splice(this.charList.indexOf(charName), 1);
      }
    }
  }


  ngOnInit() {
    Promise.resolve().then(() => this.updatePanelTitle());
    this.chatTabidentifier = this.chatMessageService.chatTabs ? this.chatMessageService.chatTabs[0].identifier : '';
    this.gameType = this.character.remoteController ? this.character.remoteController.dicebot : '';
    EventSystem.register(this)
      .on('DELETE_GAME_OBJECT', -1000, event => {
        if (this.character && this.character.identifier === event.data.identifier) {
          this.panelService.close();
        }
        if (this.chatTabidentifier === event.data.identifier) {
          this.chatTabidentifier = this.chatMessageService.chatTabs ? this.chatMessageService.chatTabs[0].identifier : '';
        }
      });

    EventSystem.register(this)
      .on('SELECT_TABLETOP_OBJECT', -1000, event => {
        if (ObjectStore.instance.get(event.data.identifier) instanceof TabletopObject) {
          this.selectedIdentifier = event.data.identifier;
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        if (event.isSendFromSelf) { this.changeDetector.markForCheck(); }
      })
      .on('UPDATE_INVENTORY', event => {
        if (event.isSendFromSelf) { this.changeDetector.markForCheck(); }
      })
      .on('OPEN_NETWORK', event => {
        this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];
        if (!this.inventoryTypes.includes(this.selectTab)) {
          this.selectTab = Network.peerId;
        }
      });
    this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];

    this.disptimer = setInterval(() => {
      this.changeDetector.detectChanges();
    }, 200);
    //    console.log('ngOnInit this.initTimestamp ' + this.initTimestamp);
    this.remoteSelect('HP', 'currentValue', 'HP?????????');

  }


  ngOnDestroy() {
    EventSystem.unregister(this);
    this.disptimer = null;
    if (this.isEdit) { this.toggleEditMode(); }
  }

  updatePanelTitle() {
    this.panelService.title = this.character.name + ' ???????????????';
  }

  onSelectedCharacter(identifier: string) {
    if (this.isEdit) { this.toggleEditMode(); }
    const object = ObjectStore.instance.get(identifier);
    if (object instanceof GameCharacter) {
      this.character = object;
      const gameType = this.character.remoteController ? this.character.remoteController.dicebot : '';
      if (0 < gameType.length) { this.gameType = gameType; }
    }
    this.updatePanelTitle();
  }

  selectPalette(line: string) {
    this._text = line;
  }

  clickPalette(line: string) {
    if (this.doubleClickTimer && this._text === line) {
      clearTimeout(this.doubleClickTimer);
      this.doubleClickTimer = null;
      this.controllerInputComponent.sendChat(null);
    } else {
      this._text = line;
      this.doubleClickTimer = setTimeout(() => { this.doubleClickTimer = null; }, 400);
    }
  }


  resetPaletteSelect() {
    if (!this.chatPaletteElementRef.nativeElement) { return; }
    this.chatPaletteElementRef.nativeElement.selectedIndex = -1;
  }

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
    if (this.isEdit) {
      this.editPalette = this.palette.value + '';
    } else {
      this.palette.setPalette(this.editPalette);
    }
  }

  ngAfterViewInit() {
  }

  getTabTitle(inventoryType: string) {
    switch (inventoryType) {
      case 'table':
        return '????????????';
      case Network.peerId:
        return '??????';
      case 'graveyard':
        return '??????';
      default:
        return '??????';
    }
  }

  getInventory(inventoryType: string) {
    switch (inventoryType) {
      case 'table':
        return this.inventoryService.tableInventory;
      case Network.peerId:
        return this.inventoryService.privateInventory;
      case 'graveyard':
        return this.inventoryService.graveyardInventory;
      default:
        return this.inventoryService.commonInventory;
    }
  }

  getGameObjects(inventoryType: string): TabletopObject[] {
    switch (inventoryType) {
      case 'table':
        const tableCharacterList_dest = [];
        const tableCharacterList_scr = this.inventoryService.tableInventory.tabletopObjects;
        for (const character of tableCharacterList_scr) {
          const character_: GameCharacter = character as GameCharacter;
          if (!character_.hideInventory) { tableCharacterList_dest.push(character as TabletopObject); }
        }
        return tableCharacterList_dest;
    }
  }

  getInventoryTags(gameObject: GameCharacter): DataElement[] {
    return this.getInventory(gameObject.location.name).dataElementMap.get(gameObject.identifier);
  }

  toggleEdit() {
    this.isEdit = !this.isEdit;
  }
  selectGameObject(gameObject: GameObject) {
    const aliasName: string = gameObject.aliasName;
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });

    this.selectCharacter = gameObject;
  }

  getTargetCharacters(checkedOnly: boolean): GameCharacter[] {
    const gameCharacters = new Array();
    const objectList = this.getGameObjects(this.selectTab);
    for (const object of objectList) {
      if (object instanceof GameCharacter) {
        if (object.hideInventory) { continue; } // ?????????????????????????????????

        const box = document.getElementById(object.identifier + '_' + this.initTimestamp) as HTMLInputElement;
        if (box) {
          if (box.checked || (!checkedOnly)) {
            gameCharacters.push(object);
          }
        }
      }
    }
    return gameCharacters;
  }

  remotBuffRoundDo(gameCharacters: GameCharacter[]) {
    if (gameCharacters.length <= 0) { return; }

    for (const character of gameCharacters) {

      if (character.buffDataElement.children) {
        for (const dataElm of character.buffDataElement.children) {
          for (const data of dataElm.children) {
            let oldNumS = '';
            let sum: number;

            oldNumS = (data.value as string);
            sum = parseInt(oldNumS);
            sum = sum - 1;
            data.value = sum;
          }
        }
      }
    }
  }

  remotBuffRound(checkedOnly: boolean) {
    let text = '';
    const gameCharacters = this.getTargetCharacters(checkedOnly);
    if (gameCharacters.length <= 0) { return; }
    if (!this.chatTab) { return; }

    const mess = '';
    if (gameCharacters.length > 0) {
      for (const object of gameCharacters) {
        text = text + '[' + object.name + ']';
      }
      this.remotBuffRoundDo(gameCharacters);
      let mess = '?????????R????????? ' + text;
      //      this.chatMessageService.sendMessage(this.chatTab, mess, this._gameSystem, this.sendFrom, this.sendTo ,this.controllerInputComponent.tachieNum);
    }
  }

  remotBuffRoundSelect() {
    this.remotBuffRound(true);
  }

  remotBuffRoundALL() {
    this.remotBuffRound(false);
  }
  /*
  remotBuffDeleteZeroRoundDo(gameCharacters: GameCharacter[]){
    if ( gameCharacters.length <= 0 ) { return; }
    for (const character of gameCharacters){

      if (character.buffDataElement.children){
        for (const dataElm of character.buffDataElement.children){
          for (const data  of dataElm.children){
            let oldNumS = '';
            let num: number;

            oldNumS = (data.value as string);
            num = parseInt(oldNumS);
            if ( num <= 0){
              data.destroy();
            }
          }
        }
      }
    }
  }
  */
  remotBuffDeleteZeroRoundDo(gameCharacters: GameCharacter[]): string {
    let retmess = '';
    if (gameCharacters.length > 0) {
      for (const character of gameCharacters) {
        if (character.buffDataElement.children) {
          for (const dataElm of character.buffDataElement.children) {
            for (const data of dataElm.children) {
              let oldNumS = '';
              let num: number;

              oldNumS = (data.value as string);
              num = parseInt(oldNumS);
              if (num <= 0) {
                retmess += '\r\n[remove]' + character.name + ':' + data.getAttribute("name");
                data.destroy();
              }
            }
          }
        }
      }
    }
    return retmess;
  }

  private reactiveTimer: NodeJS.Timer;

  remotBuffDeleteZeroRound(checkedOnly: boolean) {
    let text = '';
    const gameCharacters = this.getTargetCharacters(checkedOnly);

    const mess = '';
    if (gameCharacters.length > 0) {
      for (const object of gameCharacters) {
        text = text + '[' + object.name + ']';
//        object.activable = false;
      }
      this.reactiveTimer = setTimeout(() => {
        this.reactiveTimer = null;
        const gChars = this.getTargetCharacters(false);
        if (gChars.length > 0)
          for (const obj of gChars){
 //           obj.activable = (obj.location.name == "table");
          }
      }, 2020);
      let mess = '??????????????????:' + this.remotBuffDeleteZeroRoundDo(gameCharacters) + ' NextR'; // cutin????????????
      this.chatMessageService.sendMessage(this.chatTab, mess, this._gameSystem, this.sendFrom, this.sendTo, this.controllerInputComponent.tachieNum);
    }
  }

  remotBuffDeleteZeroRoundSelect() {
    this.remotBuffDeleteZeroRound(true);
  }
  remotBuffDeleteZeroRoundALL() {
    this.remotBuffDeleteZeroRound(false);
  }
  goBuffRoundALL() {
    this.remotBuffRoundALL();
    this.remotBuffDeleteZeroRoundALL();
  }

  remoteAddBuffRound(gameCharacters: GameCharacter[], name: string, subcom: string, round: number) {

    const text = '';
    if (gameCharacters.length <= 0) { return; }
    for (const character of gameCharacters) {
      if (character.buffDataElement.children) {
        for (const dataElm of character.buffDataElement.children) {
          const data = character.buffDataElement.getFirstElementByName(name);
          if (data) {
            data.value = round;
            data.currentValue = subcom;
          } else {
            dataElm.appendChild(DataElement.create(name, round, { type: 'numberResource', currentValue: subcom },));
          }

        }
      }
    }
  }

  sendChat(value: { text: string, gameSystem: GameSystemClass, sendFrom: string, sendTo: string, tachieNum: number, messColor: string }) {

    let text = '';
    const gameCharacters = this.getTargetCharacters(true);

    const splittext: string[] = value.text.split(/\s+/);
    let round = 3;
    let sub = '';
    let buffname = '';
    let bufftext = '';

    if (splittext.length == 0) {
      return;
    }
    if (splittext[0] == '') {
      return;
    }

    buffname = splittext[0];
    bufftext = splittext[0];
    if (splittext.length > 1) { sub = splittext[1]; bufftext = bufftext + '/' + splittext[1]; }
    if (splittext.length > 2) { round = parseInt(splittext[2]); bufftext = bufftext + '/' + round + 'R'; }

    if (gameCharacters.length > 0) {
      for (const object of gameCharacters) {
        text = text + '[' + object.name + ']';
      }
      this.remoteAddBuffRound(gameCharacters, buffname, sub, round);
      let mess = bufftext + '\r\n > ' + text;
      this.chatMessageService.sendMessage(this.chatTab, mess, this._gameSystem, this.sendFrom, this.sendTo, value.tachieNum, value.messColor);
      this.errorMessageBuff = '';
    } else {
      this.errorMessageBuff = '????????????????????????';
    }
  }

  remoteChangeValue() {
    let text = '';
    const gameCharacters = this.getTargetCharacters(true);

    if (this.remoteControllerSelect.identifier == '') {
      this.errorMessageController = '??????????????????????????????';
      return;
    }

    for (const object of gameCharacters) {

      const data = object.detailDataElement.getFirstElementByName(this.remoteControllerSelect.identifier);
      if (data) {
        let oldNumS = '';
        let newNum: number;
        let sum: number;

        if (this.remoteControllerSelect.type == 'value') {
          oldNumS = (data.value as string);
          sum = parseInt(oldNumS);
          sum = sum + this.remoteNumber;
          data.value = sum;
          newNum = (data.value as number);
        }

        let maxRecoveryMess = '';
        if (this.remoteControllerSelect.type == 'currentValue') {
          let bt = object.detailDataElement.getFirstElementByName('?????????');
          let b = object.detailDataElement.getFirstElementByName('??????');
          let gb = object.detailDataElement.getFirstElementByName('????????????');
          let blockpoint: number = (bt) ? parseInt(bt.value as string) : (b) ? parseInt(b.value as string) : 0;
          blockpoint += (gb) ? parseInt(gb.currentValue as string) : 0;
          if (this.includeBlockFlag && data.name == 'HP' && blockpoint > 0 && this.remoteNumber < 0) {
            //           for(const buff of object.buff)
            //             blockpoint += (object.buff as number); // ??????????????????????????????
            oldNumS = (data.currentValue as string);
            sum = parseInt(oldNumS);
            sum = sum + this.remoteNumber + (((this.remoteNumber + blockpoint * this.numOfBlockingTimes) > 0) ? -this.remoteNumber : blockpoint * this.numOfBlockingTimes);
            data.currentValue = sum;
            maxRecoveryMess += ' :???-' + blockpoint.toString() + (this.numOfBlockingTimes > 0 ? ('x' + this.numOfBlockingTimes) : '');
          } else {
            oldNumS = (data.currentValue as string);
            sum = parseInt(oldNumS);
            sum = sum + this.remoteNumber;
            data.currentValue = sum;
          }
          if (this.recoveryLimitFlag && data.currentValue >= data.value) {
            maxRecoveryMess += '(max)';
            data.currentValue = data.value;
          }
          if (data.currentValue < 1) {
            maxRecoveryMess += '(??????/??????)'
          }
          newNum = (data.currentValue as number);
        }
        if (object.hideInformation) {
          text = text + '[' + object.name + ' ?? > ??' + maxRecoveryMess + '] \r\n';
        } else {
          text = text + '[' + object.name + ' ' + oldNumS + ' > ' + newNum + maxRecoveryMess + '] \r\n';
        }
      }
    }

    if (text != '') {
      let hugou = '+';
      if (this.remoteNumber < 0) hugou = ''
      let mess = '[' + this.remoteControllerSelect.name + ']??????[' + hugou + this.remoteNumber + ']???\r\n' + text;
      this.chatMessageService.sendMessage(this.chatTab, mess, this._gameSystem, this.sendFrom, this.sendTo, this.controllerInputComponent.tachieNum, this.controllerInputComponent.selectChatColor);
      this.errorMessageController = '';
    } else {
      this.errorMessageController = '??????????????????????????????????????????';
    }
  }


  trackByGameObject(index: number, gameObject: GameObject) {
    return gameObject ? gameObject.identifier : index;
  }

  buffEdit(gameCharacter: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x, top: coordinate.y, width: 420, height: 300 };
    option.title = gameCharacter.name + '???????????????';
    const component = this.panelService.open(GameCharacterBuffViewComponent, option);
    component.character = gameCharacter;

  }

  allBoxCheck(value: { check: boolean }) {

    const objectList = this.getGameObjects(this.selectTab);
    for (const object of objectList) {
      if (object instanceof GameCharacter) {
        const box = document.getElementById(object.identifier + '_' + this.initTimestamp) as HTMLInputElement;
        if (box) {
          box.checked = value.check;
        }
      }
    }
  }

  targetBlockClick(identifier) {
    console.log('identifier:' + identifier + ' initTimestamp:' + this.initTimestamp);
    const box = document.getElementById(identifier + '_' + this.initTimestamp) as HTMLInputElement;
    box.checked = !box.checked;
  }

  onChange(identifier) {
    this.targetBlockClick(identifier);
  }

}
