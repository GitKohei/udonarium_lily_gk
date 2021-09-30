import { Injectable } from '@angular/core';
import { Card } from '@udonarium/card';
import { CardStack } from '@udonarium/card-stack';
import { ImageContext, ImageFile } from '@udonarium/core/file-storage/image-file';
import { ImageStorage } from '@udonarium/core/file-storage/image-storage';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem } from '@udonarium/core/system';
import { AudioStorage } from '@udonarium/core/file-storage/audio-storage';
import { DiceSymbol, DiceType } from '@udonarium/dice-symbol';
import { GameCharacter } from '@udonarium/game-character';
import { GameTable } from '@udonarium/game-table';
import { GameTableMask } from '@udonarium/game-table-mask';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TableSelecter } from '@udonarium/table-selecter';
import { Terrain } from '@udonarium/terrain';
import { TextNote } from '@udonarium/text-note';
import { CutIn } from '@udonarium/cut-in';

import { ImageTag } from '@udonarium/image-tag';
import { DataElement } from '@udonarium/data-element';


import { ContextMenuAction } from './context-menu.service';
import { PointerCoordinate } from './pointer-device.service';
import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { CutInBgmComponent } from 'component/cut-in-bgm/cut-in-bgm.component';

@Injectable({
  providedIn: 'root'
})
export class TabletopActionService {

  constructor() { }

  createGameCharacter(position: PointerCoordinate): GameCharacter {
    let character = GameCharacter.create('新しいキャラクター', 1, '');
    character.location.x = position.x - 25;
    character.location.y = position.y - 25;
    character.posZ = position.z;
    return character;
  }

  createGameTableMask(position: PointerCoordinate): GameTableMask {
    let viewTable = this.getViewTable();
    if (!viewTable) return;

    let tableMask = GameTableMask.create('マップマスク', 5, 5, 100);
    tableMask.location.x = position.x - 25;
    tableMask.location.y = position.y - 25;
    tableMask.posZ = position.z;

    viewTable.appendChild(tableMask);
    return tableMask;
  }


  createTerrain(position: PointerCoordinate): Terrain {
    let url: string = './assets/images/tex.jpg';
    let image: ImageFile = ImageStorage.instance.get(url)
    //本家PR #92より
    //    if (!image) image = ImageStorage.instance.add(url);
    if (!image) {
      image = ImageStorage.instance.add(url);
      ImageTag.create(image.identifier).tag = '地形';
    }
    //
    let viewTable = this.getViewTable();
    if (!viewTable) return;

    let terrain = Terrain.create('地形', 2, 2, 2, image.identifier, image.identifier);
    terrain.location.x = position.x - 50;
    terrain.location.y = position.y - 50;
    terrain.posZ = position.z;

    viewTable.appendChild(terrain);
    return terrain;
  }

  createTextNote(position: PointerCoordinate): TextNote {
    let textNote = TextNote.create('共有メモ', 'テキストを入力してください', 5, 4, 3);
    textNote.location.x = position.x;
    textNote.location.y = position.y;
    textNote.posZ = position.z;
    return textNote;
  }

  createDiceSymbol(position: PointerCoordinate, name: string, diceType: DiceType, imagePathPrefix: string): DiceSymbol {
    let diceSymbol = DiceSymbol.create(name, diceType, 1);
    let image: ImageFile = null;

    diceSymbol.faces.forEach(face => {
      let url: string = `./assets/images/dice/${imagePathPrefix}/${imagePathPrefix}[${face}].png`;
      image = ImageStorage.instance.get(url);
      if (!image) { image = ImageStorage.instance.add(url); }
      diceSymbol.imageDataElement.getFirstElementByName(face).value = image.identifier;
    });

    diceSymbol.location.x = position.x - 25;
    diceSymbol.location.y = position.y - 25;
    diceSymbol.posZ = position.z;
    return diceSymbol;
  }


  createTrump(position: PointerCoordinate): CardStack {
    let cardStack = CardStack.create('トランプ山札');
    cardStack.location.x = position.x - 25;
    cardStack.location.y = position.y - 25;
    cardStack.posZ = position.z;

    let back: string = './assets/images/trump/z02.gif';
    //本家PR #92より
    //    if (!ImageStorage.instance.get(back)) {
    //      ImageStorage.instance.add(back);
    //    }
    if (!ImageStorage.instance.get(back)) {
      const image = ImageStorage.instance.add(back);
      ImageTag.create(image.identifier).tag = 'トランプ';
    }
    //
    let suits: string[] = ['c', 'd', 'h', 's'];
    let trumps: string[] = [];

    for (let suit of suits) {
      for (let i = 1; i <= 13; i++) {
        trumps.push(suit + (('00' + i).slice(-2)));
      }
    }

    trumps.push('x01');
    trumps.push('x02');

    for (let trump of trumps) {
      let url: string = './assets/images/trump/' + trump + '.gif';
      if (!ImageStorage.instance.get(url)) {
        //本家PR #92より
        //          ImageStorage.instance.add(url);
        const image = ImageStorage.instance.add(url);
        ImageTag.create(image.identifier).tag = 'トランプ';
        //

      }
      let card = Card.create('カード', url, back);
      cardStack.putOnBottom(card);
    }
    return cardStack;
  }


  makeDefaultTable() {
    let tableSelecter = new TableSelecter('tableSelecter');
    tableSelecter.initialize();

    let gameTable = new GameTable('gameTable');
    let testBgFile: ImageFile = null;
    let bgFileContext = ImageFile.createEmpty('testTableBackgroundImage_image').toContext();
    bgFileContext.url = './assets/images/BG10a_80.jpg';
    testBgFile = ImageStorage.instance.add(bgFileContext);
    //本家PR #92より
    ImageTag.create(testBgFile.identifier).tag = '背景';
    //
    //entyu_2 #92
    //ImageTag.create(testBgFile.identifier).tag = 'default テーブル';
    //

    gameTable.name = '最初のテーブル';
    gameTable.imageIdentifier = testBgFile.identifier;
    gameTable.width = 20;
    gameTable.height = 15;
    gameTable.initialize();

    tableSelecter.viewTableIdentifier = gameTable.identifier;
  }

  // バフ追加identifierを固定にするため初期キャラのバフはGameCharacterでやらずにここでやる
  addBuffRound(character: GameCharacter, name: string, subcom: string, round: number) {
    if (character.buffDataElement.children) {
      for (let dataElm of character.buffDataElement.children) {
        dataElm.appendChild(DataElement.create(name, round, { 'type': 'numberResource', 'currentValue': subcom }, name + '_' + character.identifier));
        return;
      }
    }
  }

  initAprilDiceImage() {
    let file: ImageFile = null;
    let fileContext: ImageContext = null;

    fileContext = ImageFile.createEmpty('1d4_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d4_dice[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d4_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d4_dice[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d4_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d4_dice[02].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d4_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d4_dice[03].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d6_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d6_dice[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d6_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d6_dice[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d6_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d6_dice[02].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d6_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d6_dice[03].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('2d6_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/2d6_dice[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('2d6_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/2d6_dice[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('2d6_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/2d6_dice[02].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('2d6_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/2d6_dice[03].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d8_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d8_dice[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d8_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d8_dice[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d8_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d8_dice[02].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d8_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d8_dice[03].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d10_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d10_dice[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d10_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d10_dice[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d10_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d10_dice[02].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d10_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d10_dice[03].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d12_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d12_dice[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d12_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d12_dice[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d12_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d12_dice[02].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d12_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d12_dice[03].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d20_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d20_dice[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d20_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d20_dice[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d20_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d20_dice[02].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d20_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d20_dice[03].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d100_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d100_dice[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d100_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d100_dice[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d100_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d100_dice[02].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d100_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d100_dice[03].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('april[00]').toContext();
    fileContext.url = './assets/images/april/april[00].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('april[01]').toContext();
    fileContext.url = './assets/images/april/april[01].png';
    file = ImageStorage.instance.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';
  }

  makeDefaultTabletopObjects() {
    let testCharacter: GameCharacter = null;
    let testFile: ImageFile = null;
    let fileContext: ImageContext = null;

    //-------------------------
    testCharacter = new GameCharacter('testCharacter_1');
    fileContext = ImageFile.createEmpty('testCharacter_1_image').toContext();
    fileContext.url = './assets/images/mon_052.gif';
    testFile = ImageStorage.instance.add(fileContext);
    testCharacter.location.x = 5 * 50;
    testCharacter.location.y = 9 * 50;
    testCharacter.initialize();
    ImageTag.create(testFile.identifier).tag = 'モンスター';    //本家PR #92より

    testCharacter.createTestGameDataElement('モンスターA', 1, testFile.identifier);
    this.addBuffRound(testCharacter, 'テストバフ1', '防+1', 3);
    //-------------------------
    testCharacter = new GameCharacter('testCharacter_2');
    testCharacter.location.x = 8 * 50;
    testCharacter.location.y = 8 * 50;
    testCharacter.initialize();
    testCharacter.createTestGameDataElement('モンスターB', 1, testFile.identifier);

    //-------------------------
    testCharacter = new GameCharacter('testCharacter_3');
    fileContext = ImageFile.createEmpty('testCharacter_3_image').toContext();
    fileContext.url = './assets/images/mon_128.gif';
    testFile = ImageStorage.instance.add(fileContext);
    testCharacter.location.x = 4 * 50;
    testCharacter.location.y = 2 * 50;
    testCharacter.initialize();

    testFile = ImageStorage.instance.add(fileContext);
    ImageTag.create(testFile.identifier).tag = 'モンスター'; //本家PR #92より
    testCharacter.createTestGameDataElement('モンスターC', 3, testFile.identifier);
    //-------------------------

    testCharacter = new GameCharacter('testCharacter_4');
    fileContext = ImageFile.createEmpty('testCharacter_4_image').toContext();
    fileContext.url = './assets/images/mon_150.gif';
    //本家PR #92より
    //    fileContext.tag = 'テスト01';

    testFile = ImageStorage.instance.add(fileContext);

    ImageTag.create(testFile.identifier).tag = '';//本家PR #92より
    testCharacter.location.x = 6 * 50;
    testCharacter.location.y = 11 * 50;
    testCharacter.initialize();
    testCharacter.createTestGameDataElement('キャラクターA', 1, testFile.identifier);
    this.addBuffRound(testCharacter, 'テストバフ2', '攻撃+10', 1);
    //-------------------------
    testCharacter = new GameCharacter('testCharacter_5');
    fileContext = ImageFile.createEmpty('testCharacter_5_image').toContext();
    fileContext.url = './assets/images/mon_211.gif';
    testFile = ImageStorage.instance.add(fileContext);
    testCharacter.location.x = 12 * 50;
    testCharacter.location.y = 12 * 50;
    testCharacter.initialize();
    testCharacter.createTestGameDataElement('キャラクターB', 1, testFile.identifier);
    this.addBuffRound(testCharacter, 'テストバフ2', '攻撃+10', 1);

    //-------------------------

    testCharacter = new GameCharacter('testCharacter_6');
    fileContext = ImageFile.createEmpty('testCharacter_6_image').toContext();
    fileContext.url = './assets/images/mon_135.gif';
    testFile = ImageStorage.instance.add(fileContext);

    ImageTag.create(testFile.identifier).tag = '';//本家PR #92より

    testCharacter.initialize();
    testCharacter.location.x = 5 * 50;
    testCharacter.location.y = 13 * 50;
    testCharacter.createTestGameDataElement('キャラクターC', 1, testFile.identifier);
    this.addBuffRound(testCharacter, 'テストバフ3', '', 3);

  }

  makeDefaultSEObjects() {
    // ここでデフォルトカットインに使うSEをロード
    let ses: string[][] = [
      ['NextR', './assets/sounds/se/next.ogg'],
      ['MPreOpe', '/assets/sounds/se/skill.ogg'],
      ['MAttack', './assets/sounds/se/attackmagic.ogg'],
      ['MBuff', './assets/sounds/se/buff.ogg'],
      ['MDebuff', './assets/sounds/se/debuff.ogg'],
      ['MUtil', './assets/sounds/se/other.ogg'],
      ['MHeal', './assets/sounds/se/heal.ogg'],
      ['MSummon', './assets/sounds/se/summon.ogg'],
      ['MCast', './assets/sounds/se/castmagic.ogg'],
      ['MHit', './assets/sounds/se/hitmagic.ogg'],
      ['PAttack', './assets/sounds/se/attackphysic.ogg'],
      ['PHit', './assets/sounds/se/hitphysic.ogg'],
      //      ['NextR','./assets/sounds/se/next.ogg'],            // ラウンド進行 *重複読み込みテスト用*
    ];
    for (let node of ses) {
      let alreadyCreated = false;
      let objects = ObjectStore.instance.getObjects(CutIn);
      for (let i = 0; i < objects.length; ++i) {
        if (objects[i].name == node[0]) {
          alreadyCreated = true; break;
        }
      }
      if (!alreadyCreated) { // 重複チェック: room.zipで保存してると次回読み込み時に絶対重複するのでチェック
        let cutIn = new CutIn();
        cutIn.name = node[0];
        cutIn.imageIdentifier = '';
        cutIn.initialize();
        cutIn.width = 0;
        cutIn.height = 0;
        cutIn.originalSize = true;
        cutIn.x_pos = 0;
        cutIn.y_pos = 0;

        let id = AudioStorage.instance.add(node[1]).identifier;
        AudioStorage.instance.get(id).isHidden = false;

        cutIn.audioIdentifier = id;
        cutIn.audioName = node[0];
        cutIn.startTime = 0;
        cutIn.tagName = 'round';
        cutIn.selected = false;
        cutIn.isLoop = false;
        cutIn.chatActivate = true;

        cutIn.outTime = 10;

        cutIn.useOutUrl = false;
        cutIn.outUrl = '';
        cutIn.isPlaying = false;
      }
    }
  }

  makeDefaultContextMenuActions(position: PointerCoordinate): ContextMenuAction[] {
    return [
      this.getCreateCharacterMenu(position),
      this.getCreateTableMaskMenu(position),
      this.getCreateTerrainMenu(position),
      this.getCreateTextNoteMenu(position),
      this.getCreateTrumpMenu(position),
      this.getCreateDiceSymbolMenu(position),
    ];
  }

  private getCreateCharacterMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: 'キャラクターを作成', action: () => {
        let character = this.createGameCharacter(position);
        EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: character.identifier, className: character.aliasName });
        SoundEffect.play(PresetSound.piecePut);
      }
    }
  }

  private getCreateTableMaskMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: 'マップマスクを作成', action: () => {
        this.createGameTableMask(position);
        SoundEffect.play(PresetSound.cardPut);
      }
    }
  }

  private getCreateTerrainMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: '地形を作成', action: () => {
        this.createTerrain(position);
        SoundEffect.play(PresetSound.blockPut);
      }
    }
  }

  private getCreateTextNoteMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: '共有メモを作成', action: () => {
        this.createTextNote(position);
        SoundEffect.play(PresetSound.cardPut);
      }
    }
  }

  private getCreateTrumpMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: 'トランプの山札を作成', action: () => {
        this.createTrump(position);
        SoundEffect.play(PresetSound.cardPut);
      }
    }
  }

  private getCreateDiceSymbolMenu(position: PointerCoordinate): ContextMenuAction {
    let dices: { menuName: string, diceName: string, type: DiceType, imagePathPrefix: string }[] = [
      { menuName: 'D4', diceName: 'D4', type: DiceType.D4, imagePathPrefix: '4_dice' },
      { menuName: 'D6', diceName: 'D6', type: DiceType.D6, imagePathPrefix: '6_dice' },
      { menuName: 'D8', diceName: 'D8', type: DiceType.D8, imagePathPrefix: '8_dice' },
      { menuName: 'D10', diceName: 'D10', type: DiceType.D10, imagePathPrefix: '10_dice' },
      { menuName: 'D10 (00-90)', diceName: 'D10', type: DiceType.D10_10TIMES, imagePathPrefix: '100_dice' },
      { menuName: 'D12', diceName: 'D12', type: DiceType.D12, imagePathPrefix: '12_dice' },
      { menuName: 'D20', diceName: 'D20', type: DiceType.D20, imagePathPrefix: '20_dice' },
    ];
    let subMenus: ContextMenuAction[] = [];

    dices.forEach(item => {
      subMenus.push({
        name: item.menuName, action: () => {
          this.createDiceSymbol(position, item.diceName, item.type, item.imagePathPrefix);
          SoundEffect.play(PresetSound.dicePut);
        }
      });
    });
    return { name: 'ダイスを作成', action: null, subActions: subMenus };
  }

  private getViewTable(): GameTable {
    let tableSelecter = ObjectStore.instance.get<TableSelecter>('tableSelecter');
    return tableSelecter ? tableSelecter.viewTable : null;
  }
}
