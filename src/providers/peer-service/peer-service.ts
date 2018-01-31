import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AppFetchProvider } from "../app-fetch/app-fetch";
import { TranslateService } from "@ngx-translate/core";
import { Storage } from "@ionic/storage";
import { Observable, BehaviorSubject } from "rxjs";
import { AppSettingProvider } from "../app-setting/app-setting";
import { BlockServiceProvider } from "../block-service/block-service";
import * as IFM from "ifmchain-ibt";
import { EventEmitter } from "eventemitter3";
import { PeerModel } from "./peer.types";
export * from "./peer.types";
const PEERS = ["http://mainnet.ifmchain.org"];
/*
  Generated class for the PeerServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class PeerServiceProvider extends EventEmitter {
  static DEFAULT_TIMEOUT = 2000;
  ifmJs: any;
  peer: any;
  peerList: any[];
  constructor(
    public http: HttpClient,
    public storage: Storage,
    public appSetting: AppSettingProvider,
    public fetch: AppFetchProvider,
    public blockService: BlockServiceProvider,
  ) {
    super();
    this.ifmJs = AppSettingProvider.IFMJS;
    this.peer = this.ifmJs.Api(AppSettingProvider.HTTP_PROVIDER).peer;
    // this.peerList = [
    //   "http://mainnet.ifmchain.org",
    //   "http://test1.ifmchain.org",
    // ];
  }

  readonly PEER_SYNC = this.appSetting.APP_URL("/api/loader/status/sync");
  readonly PING_URL = this.appSetting.APP_URL("/api/blocks/getHeight");
  readonly PEERS_URL = "/api/peers/";
  readonly PEERS_QUERY_URL = this.appSetting.APP_URL("/api/peers/get");

  /**
   * 获取节点信息
   * @param ipStr
   * @param port
   * @returns {Promise<any>}
   * ip port height health state os sharePort version
   */
  async getPeer(ipStr, port) {
    let data = await this.fetch.get<any>(this.PEERS_QUERY_URL, {
      search: {
        ip_str: ipStr,
        port: port,
      },
    });

    return data.peer;
  }

  /**
   * 获取正在工作的节点列表
   * @param {{}} params
   * @returns {Promise<any>}
   */
  async getPeers(params = {}) {
    let data = await this.fetch.get<any>(this.PEERS_QUERY_URL, {
      search: params,
    });

    return data.peers;
  }

  /**
   * 获取节点高度最高的可用节点排序
   * step1 - 根据本地节点获取节点列表，读取本地的
   * step2 - 按照高度进行排序，节点状态不好的进行排除
   * step3 - ping所有节点获得从上至下的所有毫秒
   * step4 - 搜索中，超时的节点进行排除，块高度不一致的进行排除
   * step5 - 一定时间内选择高度最高的最快的节点，当不存在时选择高度第二高的最快的
   * step6 - 保存节点列表至本地，节点列表首先选择已筛选的，没有再选择配置文件中的
   */
  async sortPeers() {
    let peers = await this.getAllPeers();
    let peersArray: any[];

    //获取保存的节点列表中的每一个节点的连接时间和高度
    //TODO:当TIMEOUT秒时放弃连接
    await Promise.all(
      peers.map(async peer => {
        let startTimestamp = new Date().getTime();
        try {
          this.emit("peer-ping-start", peer);
          let data = await this.fetch
            .get<{ height: number }>(peer + this.PING_URL)
            .catch();
          // let data = await this.appFetch.timeout(PeerServiceProvider.DEFAULT_TIMEOUT).get<{ height: number }>(peer + PING_URL);
          let endTimestamp = new Date().getTime();
          let during = endTimestamp - startTimestamp;
          const peer_info = {
            peer: peer,
            height: data.height,
            during: during,
          };
          peersArray.push(peer_info);
          this.emit("peer-ping-success", peer_info);
          this.emit("peer-ping-success:" + peer, peer_info);
        } catch (err) {
          this.emit("peer-ping-error", err, peer);
          this.emit("peer-ping-error:" + peer, err);
        }
      }),
    );

    //对列表进行排序，根据高度进行排序，再根据速度进行筛选
    peersArray = peersArray.sort((a, b) => {
      if (a.height === b.height) {
        return a.during < b.during ? -1 : 1;
      } else {
        return a.height < b.height ? 1 : -1;
      }
    });

    await this.savePeersLocal(peersArray);

    return peersArray;
  }

  /**
   * 获取所有节点（未进行统计排序）
   * 其中可用节点才被加入
   * 状态为2（未发生过错误）的节点置于头部
   * deep为搜索的深度，默认只搜索一次
   */
  async getAllPeers(deep = 1): Promise<string[]> {
    // debugger
    let peers: any[];
    peers = await this.getPeersLocal();
    //当不存在本地已保存的节点IP时
    //根据配置文件获取节点，再获取每一个节点的所有节点列表
    if (!peers || peers.length === 0) {
      let configPeers: Array<string> = await this.getPeersConfig();
      //异步执行异步的循环
      await Promise.all(
        configPeers.map(async peer => {
          let data = await this.fetch.get<{ peers: any[] }>(
            peer + this.PEERS_URL,
          );
          // let allPeers = await this.getAllPeersFromPeerList(data.peers);
          // if(!allPeers || allPeers.length == 0) {
          for (let i of data.peers) {
            if (i.state == 2) {
              peers.unshift(i.ip + ":" + i.port);
            } else if (i.state == 1) {
              peers.push(i.ip + ":" + i.port);
            }
          }
          // }
          // if(deep > 1) {
          //   peers = await this.getAllPeersFromPeerList(peers);
          // }
        }),
      );
    }

    return peers;
  }

  /**
   * 根据节点数组进行遍历搜索
   * @param peerList
   */
  async getAllPeersFromPeerList(peerList) {
    let peers: any[];
    await Promise.all(
      peerList.map(async peer => {
        let data: any;
        if (peer.hasOwnProperty("ip")) {
          await this.fetch
            .get<{ peers: any[] }>(
              "http://" + peer.ip + ":" + peer.port + this.PEERS_URL,
            )
            .then(res => {
              if (res.peers) {
                for (let i of res.peers) {
                  if (i.state == 2) {
                    peers.unshift(i.ip + ":" + i.port);
                  } else if (i.state == 1) {
                    peers.push(i.ip + ":" + i.port);
                  }
                }
              }
            })
            .catch();
        }
        if (typeof peer == "string") {
          await this.fetch
            .get<{ peers: any[] }>(peer + this.PEERS_URL)
            .then(res => {
              if (res.peers) {
                for (let i of res.peers) {
                  if (i.state == 2) {
                    peers.unshift(i.ip + ":" + i.port);
                  } else if (i.state == 1) {
                    peers.push(i.ip + ":" + i.port);
                  }
                }
              }
            })
            .catch();
        }

        // debugger
        // if(data.peers) {
        //   for (let i of data.peers) {
        //     if(i.state == 2) {
        //       peers.unshift(i.ip + ':' + i.port);
        //     }else if(i.state == 1) {
        //       peers.push( i.ip + ':' + i.port);
        //     }
        //   }
        // }
      }),
    );

    return peers;
  }

  /**
   * 保存可用节点列表
   * @param peers
   */
  async savePeersLocal(peers: Array<string>) {
    await this.storage.set("peers", peers);
  }

  /**
   * 获取节点的同步状态
   * return 1 -- 未同步，最新
   * return number--同步状态，小数返回两位
   * return -1 -- 同步错误
   */
  async getPeerSync(host?: string) {
    let peerSyncUrl = host
      ? host + this.PEER_SYNC
      : AppSettingProvider.SERVER_URL + this.PEER_SYNC;

    let data = await this.fetch.get<any>(peerSyncUrl);
    if (data.success) {
      if (data.sync == false) {
        return 1;
      } else {
        return (1 - data.blocks / data.height).toFixed(2);
      }
    } else {
      console.log("get peer sync error");
      return -1;
    }
  }

  /**
   * 获取可用节点
   * 从未保存过时返回空数组
   */
  async getPeersLocal(): Promise<PeerModel[]> {
    let peers: any[] = await this.storage.get("peers");

    if (peers && peers.length > 0) {
      return peers;
    } else {
      return [];
    }
  }

  /**
   * 返回配置的节点数组
   * 目前在顶部设置
   */
  async getPeersConfig() {
    return PEERS;
  }

  /**
   * 设置连接的
   * @param peer
   */
  setPeer(peer) {
    AppSettingProvider.SERVER_URL = peer;
  }
}
