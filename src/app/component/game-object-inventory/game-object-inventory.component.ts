import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';

import { GameObject } from '@udonarium/core/synchronize-object/game-object';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { DataElement } from '@udonarium/data-element';
import { SortOrder } from '@udonarium/data-summary-setting';
import { GameCharacter } from '@udonarium/game-character';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TabletopObject } from '@udonarium/tabletop-object';

import { ChatPaletteComponent } from 'component/chat-palette/chat-palette.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { ContextMenuAction, ContextMenuService, ContextMenuSeparator } from 'service/context-menu.service';
import { GameObjectInventoryService } from 'service/game-object-inventory.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

import { RemoteControllerComponent } from 'component/remote-controller/remote-controller.component';

@Component({
  selector: 'game-object-inventory',
  templateUrl: './game-object-inventory.component.html',
  styleUrls: ['./game-object-inventory.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameObjectInventoryComponent implements OnInit, AfterViewInit, OnDestroy {
  inventoryTypes: string[] = ['table', 'common', 'graveyard'];

  selectTab: string = 'table';
  selectedIdentifier: string = '';
  multiMoveTargets: Set<string> = new Set();

  isEdit: boolean = false;
  isMultiMove: boolean = false;
  disptimer = null;

  get sortTag(): string { return this.inventoryService.sortTag; }
  set sortTag(sortTag: string) { this.inventoryService.sortTag = sortTag; }
  get sortOrder(): SortOrder { return this.inventoryService.sortOrder; }
  set sortOrder(sortOrder: SortOrder) { this.inventoryService.sortOrder = sortOrder; }
  get dataTag(): string { return this.inventoryService.dataTag; }
  set dataTag(dataTag: string) { this.inventoryService.dataTag = dataTag; }
  get dataTags(): string[] { return this.inventoryService.dataTags; }

  get sortOrderName(): string { return this.sortOrder === SortOrder.ASC ? '??????' : '??????'; }

  get newLineString(): string { return this.inventoryService.newLineString; }

  constructor(
    private changeDetector: ChangeDetectorRef,
    private panelService: PanelService,
    private inventoryService: GameObjectInventoryService,
    private contextMenuService: ContextMenuService,
    private pointerDeviceService: PointerDeviceService
  ) {
    panelService.componentTyep = 'GameObjectInventoryComponent';
  }

  ngOnInit() {
    Promise.resolve().then(() => this.panelService.title = '??????????????????');
    EventSystem.register(this)
      .on('SELECT_TABLETOP_OBJECT', -1000, event => {
        if (ObjectStore.instance.get(event.data.identifier) instanceof TabletopObject) {
          this.selectedIdentifier = event.data.identifier;
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        if (event.isSendFromSelf) this.changeDetector.markForCheck();
      })
      .on('UPDATE_INVENTORY', event => {
        if (event.isSendFromSelf) this.changeDetector.markForCheck();
      })
      .on('OPEN_NETWORK', event => {
        this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];
        if (!this.inventoryTypes.includes(this.selectTab)) {
          this.selectTab = Network.peerId;
        }
      });
    this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];

  }

  ngAfterViewInit() {
    this.disptimer = setInterval(() => {
      this.changeDetector.detectChanges();
    }, 200 );
    //????????????????????????????????????????????????????????????????????????????????????????????????????????????
    
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    this.disptimer = null;
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
        
        let tableCharacterList_dest = [] ;
        let tableCharacterList_scr = this.inventoryService.tableInventory.tabletopObjects;
        for (let character of tableCharacterList_scr) {
          let character_ : GameCharacter = <GameCharacter>character;
          if( !character_.hideInventory ) tableCharacterList_dest.push( <TabletopObject>character );
        }
        return tableCharacterList_dest;

      default:
        return this.getInventory(inventoryType).tabletopObjects;
    }
  }

  getInventoryTags(gameObject: GameCharacter): DataElement[] {
    return this.getInventory(gameObject.location.name).dataElementMap.get(gameObject.identifier);
  }

  onContextMenu(e: Event, gameObject: GameCharacter) {
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.getAttribute('type') !== 'range') return;
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    this.selectGameObject(gameObject);

    let position = this.pointerDeviceService.pointers[0];

    let actions: ContextMenuAction[] = [];

    actions.push({ name: '???????????????', action: () => { this.showDetail(gameObject); } });
    if (gameObject.location.name !== 'graveyard') {
      actions.push({ name: '?????????????????????????????????', action: () => { this.showChatPalette(gameObject) } });
      actions.push({ name: '?????????????????????', action: () => { this.showRemoteController(gameObject) } });
    }
    actions.push(ContextMenuSeparator);
    let locations = [
      { name: 'table', alias: '?????????????????????' },
      { name: 'common', alias: '??????????????????????????????' },
      { name: Network.peerId, alias: '??????????????????????????????' },
      { name: 'graveyard', alias: '???????????????' }
    ];
    for (let location of locations) {
      if (gameObject.location.name === location.name) continue;
      actions.push({
        name: location.alias, action: () => {
          gameObject.setLocation(location.name);
          SoundEffect.play(PresetSound.piecePut);
        }
      });
    }

    if (gameObject.location.name === 'graveyard') {
      actions.push({
        name: '????????????', action: () => {
          this.deleteGameObject(gameObject);
          SoundEffect.play(PresetSound.sweep);
        }
      });
    }
    actions.push(ContextMenuSeparator);
    actions.push({
      name: '??????????????????', action: () => {
        this.cloneGameObject(gameObject);
        SoundEffect.play(PresetSound.piecePut);
      }
    });

    this.contextMenuService.open(position, actions, gameObject.name);
  }

  toggleEdit() {
    this.isEdit = !this.isEdit;
  }

  toggleMultiMove() {
    if (this.isMultiMove) {
      this.multiMoveTargets.clear();
    }
    this.isMultiMove = !this.isMultiMove;
  }

  cleanInventory() {
    let tabTitle = this.getTabTitle(this.selectTab);
    let gameObjects = this.getGameObjects(this.selectTab);
    if (!confirm(`${tabTitle}???????????????${gameObjects.length}?????????????????????????????????????????????`)) return;
    for (const gameObject of gameObjects) {
      this.deleteGameObject(gameObject);
    }
    SoundEffect.play(PresetSound.sweep);
  }

  existsMultiMoveSelectedInTab(): boolean {
    return this.getGameObjects(this.selectTab).some(x => this.multiMoveTargets.has(x.identifier))
  }

  toggleMultiMoveTarget(e: Event, gameObject: GameCharacter) {
    if (!(e.target instanceof HTMLInputElement)) { return; }
    if (e.target.checked) {
      this.multiMoveTargets.add(gameObject.identifier);
    } else {
      this.multiMoveTargets.delete(gameObject.identifier);
    }
    console.log(`multimove selected ${[...this.multiMoveTargets]}`);
  }

  allTabBoxCheck() {
    if (this.existsMultiMoveSelectedInTab()) {
      this.getGameObjects(this.selectTab).forEach(x => this.multiMoveTargets.delete(x.identifier));
    } else {
      this.getGameObjects(this.selectTab).forEach(x => this.multiMoveTargets.add(x.identifier));
    }
  }

  onMultiMoveContextMenu() {
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    let position = this.pointerDeviceService.pointers[0];
    let actions: ContextMenuAction[] = [];
    let locations = [
      { name: 'table', alias: '?????????????????????' },
      { name: 'common', alias: '??????????????????????????????' },
      { name: Network.peerId, alias: '??????????????????????????????' },
      { name: 'graveyard', alias: '???????????????' }
    ];
    for (let location of locations) {
      if (this.selectTab === location.name) continue;
      actions.push({
        name: location.alias, action: () => {
          this.multiMove(location.name);
          this.toggleMultiMove();
          SoundEffect.play(PresetSound.piecePut);
        }
      });
    }
    if (this.selectTab == 'graveyard') {
      actions.push({
        name: '??????????????????', action: () => {
          this.multiDelete();
          this.toggleMultiMove();
          SoundEffect.play(PresetSound.sweep);
        }
      })
    }

    this.contextMenuService.open(position, actions, "????????????");
  }

  multiMove(location: string) {
    for (const gameObjectIdentifier of this.multiMoveTargets) {
      let gameObject = ObjectStore.instance.get(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter) {
        gameObject.setLocation(location);
      }
    }
  }

  multiDelete() {
    let inGraveyard: Set<GameCharacter> = new Set();
    for (const gameObjectIdentifier of this.multiMoveTargets) {
      let gameObject: GameCharacter = ObjectStore.instance.get(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter && gameObject.location.name == 'graveyard') {
        inGraveyard.add(gameObject);
      }
    }
    if (inGraveyard.size < 1) return;

    if (!confirm(`????????????????????????????????????????????????${inGraveyard.size}?????????????????????????????????????????????`)) return;
    for (const gameObject of inGraveyard) {
      this.deleteGameObject(gameObject);
    }
  }

  private cloneGameObject(gameObject: TabletopObject) {
    gameObject.clone();
  }

  private showDetail(gameObject: GameCharacter) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = '???????????????????????????';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 800, top: coordinate.y - 300, width: 800, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private showChatPalette(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let option: PanelOption = { left: coordinate.x - 250, top: coordinate.y - 175, width: 615, height: 350 };
    let component = this.panelService.open<ChatPaletteComponent>(ChatPaletteComponent, option);
    component.character = gameObject;
  }

  private showRemoteController(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let option: PanelOption = { left: coordinate.x - 250, top: coordinate.y - 175, width: 700, height: 600 };
    let component = this.panelService.open<RemoteControllerComponent>(RemoteControllerComponent, option);
    component.character = gameObject;

  }

  private focusToObject(e: Event, gameObject: GameCharacter) {
    if (!(e.target instanceof HTMLElement)) { return; }
    if (new Set(["input", "button"]).has(e.target.tagName.toLowerCase())) { return; }
    if (gameObject.location.name != "table") { return; }
    EventSystem.trigger('FOCUS_TO_TABLETOP_COORDINATE', { x: gameObject.location.x, y: gameObject.location.y });
  }

  selectGameObject(gameObject: GameObject) {
    if (this.isMultiMove) {
      if (this.multiMoveTargets.has(gameObject.identifier)) {
        this.multiMoveTargets.delete(gameObject.identifier);
      } else {
        this.multiMoveTargets.add(gameObject.identifier);
      }
      console.log(`multimove selected ${[...this.multiMoveTargets]}`);
    }
    let aliasName: string = gameObject.aliasName;
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    EventSystem.trigger('HIGHTLIGHT_TABLETOP_OBJECT', { identifier: gameObject.identifier });
  }

  private deleteGameObject(gameObject: GameObject) {
    gameObject.destroy();
    this.changeDetector.markForCheck();
  }

  trackByGameObject(index: number, gameObject: GameObject) {
    return gameObject ? gameObject.identifier : index;
  }
}
