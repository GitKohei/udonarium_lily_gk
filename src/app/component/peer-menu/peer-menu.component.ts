import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';

import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { PeerContext } from '@udonarium/core/system/network/peer-context';
import { EventSystem, Network } from '@udonarium/core/system';
import { PeerCursor } from '@udonarium/peer-cursor';
import { Define } from '@udonarium/define';

import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { LobbyComponent } from 'component/lobby/lobby.component';
import { AppConfigService } from 'service/app-config.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'peer-menu',
  templateUrl: './peer-menu.component.html',
  styleUrls: ['./peer-menu.component.css']
})
export class PeerMenuComponent implements OnInit, OnDestroy, AfterViewInit {

  targetUserId = '';
  networkService = Network;
  gameRoomService = ObjectStore.instance;
  help = '';

  disptimer = null;
  dispDetailFlag = false;

  get myPeer(): PeerCursor { return PeerCursor.myCursor; }

  constructor(
    private ngZone: NgZone,
    private modalService: ModalService,
    private panelService: PanelService,
    public appConfigService: AppConfigService,
    private cookieService: CookieService,
  ) {
    panelService.componentTyep = 'PeerMenuComponent';

    if(!this.cookieService.check('Nickname'))
      this.cookieService.set('Nickname', 'プレイヤー', Define.EXPIRE());
    this.myPeer.name = this.cookieService.get('Nickname');
  }

  myPeerNameHasChanged(e) {
    this.cookieService.set('Nickname', this.myPeer.name, Define.EXPIRE());
  }

  ngOnInit() {
    Promise.resolve().then(() => this.panelService.title = '接続情報');
  }

  ngAfterViewInit() {
    EventSystem.register(this)
      .on('OPEN_NETWORK', event => {
        this.ngZone.run(() => { });
      });

    this.disptimer = setInterval(() => {
      this.dispInfo();
    }, 1000 );
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    this.disptimer = null;
  }

  changeIcon() {
    this.modalService.open<string>(FileSelecterComponent).then(value => {
      if (!this.myPeer || !value) return;
      this.myPeer.imageIdentifier = value;
    });
  }

  private resetPeerIfNeeded() {
    if (Network.peerContexts.length < 1) {
      Network.open();
      PeerCursor.myCursor.peerId = Network.peerId;
    }
  }

  connectPeer() {
    this.help = '';
    let context = PeerContext.create(this.targetUserId);
    if (context.isRoom) return;
    ObjectStore.instance.clearDeleteHistory();
    Network.connect(context.peerId);
  }

  async connectPeerHistory() {
    this.help = '';
    let conectPeers: PeerContext[] = [];
    let roomId = '';

    for (let peerId of this.appConfigService.peerHistory) {
      let context = PeerContext.parse(peerId);
      if (context.isRoom) {
        if (roomId !== context.roomId) conectPeers = [];
        roomId = context.roomId;
        conectPeers.push(context);
      } else {
        if (roomId !== context.roomId) conectPeers = [];
        conectPeers.push(context);
      }
    }

    if (roomId.length) {
      console.warn('connectPeerRoom <' + roomId + '>');
      let conectPeers: PeerContext[] = [];
      let peerIds = await Network.listAllPeers();
      for (let peerId of peerIds) {
        console.log(peerId);
        let context = PeerContext.parse(peerId);
        if (context.roomId === roomId) {
          conectPeers.push(context);
        }
      }
      if (conectPeers.length < 1) {
        this.help = '前回接続していたルームが見つかりませんでした。既に解散しているかもしれません。';
        console.warn('Room is already closed...');
        return;
      }
      Network.open(PeerContext.generateId(), conectPeers[0].roomId, conectPeers[0].roomName, conectPeers[0].password);
    } else {
      console.warn('connectPeers ' + conectPeers.length);
      Network.open();
    }

    PeerCursor.myCursor.peerId = Network.peerId;

    let listener = EventSystem.register(this);
    listener.on('OPEN_NETWORK', event => {
      console.log('OPEN_NETWORK', event.data.peerId);
      EventSystem.unregisterListener(listener);
      ObjectStore.instance.clearDeleteHistory();
      for (let context of conectPeers) {
        Network.connect(context.peerId);
      }
    });
  }

  showLobby() {
    this.modalService.open(LobbyComponent, { width: 700, height: 400, left: 0, top: 400 });
  }

  findUserId(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.userId : '';
  }

  findPeerName(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.name : '';
  }

  findPeerTimeSend(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.timestampSend : 0 ;
  }

  findPeerTimeReceive(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.timestampReceive : 0 ;
  }

  findPeerTimeDiffUp(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.timeDiffUp : 0 ;
  }

  findPeerTimeDiffDown(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.timeDiffDown : 0 ;
  }

  findPeerTimeLatency(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    if ( !peerCursor ) return '--';

    return peerCursor ? peerCursor.timeLatency / 1000 : 99999 ;
  }

  findPeerDegreeOfSuccess(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    if (!peerCursor) return '0/0';
    if (peerCursor.firstTimeSignNo < 0) return '0/0';
    const degree = (peerCursor.totalTimeSignNum) + '/' + (peerCursor.lastTimeSignNo - peerCursor.firstTimeSignNo + 1);
    return degree ;
  }


  myTime = 0;
  dispInfo(){
    this.myTime = Date.now();
  }

}
