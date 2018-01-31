import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AppFetchProvider, CommonResponseData } from "../app-fetch/app-fetch";
import { TranslateService } from "@ngx-translate/core";
import { Storage } from "@ionic/storage";
import { Observable, BehaviorSubject } from "rxjs";
// import { PromisePro } from "../../bnqkl-framework/RxExtends";
import { AsyncBehaviorSubject } from "../../bnqkl-framework/RxExtends";
import {
  AppSettingProvider,
  TB_AB_Generator,
  HEIGHT_AB_Generator,
} from "../app-setting/app-setting";
import { TransactionServiceProvider } from "../transaction-service/transaction-service";
import * as IFM from "ifmchain-ibt";
import * as TYPE from "./block.types";
import { TransactionModel } from "../transaction-service/transaction.types";

export * from "./block.types";

@Injectable()
export class BlockServiceProvider {
  ifmJs: any;
  block: any;
  blockArray: any;

  constructor(
    public http: HttpClient,
    public appSetting: AppSettingProvider,
    public fetch: AppFetchProvider,
    public storage: Storage,
    public translateService: TranslateService,
    public transactionService: TransactionServiceProvider,
  ) {
    this.ifmJs = AppSettingProvider.IFMJS;
    this.block = this.ifmJs.Api(AppSettingProvider.HTTP_PROVIDER).block;
  }
  readonly GET_LAST_BLOCK_URL = this.appSetting.APP_URL(
    "/api/blocks/getLastBlock",
  );
  readonly GET_BLOCK_BY_QUERY = this.appSetting.APP_URL("/api/blocks/");
  readonly GET_BLOCK_BY_ID = this.appSetting.APP_URL("/api/blocks/get");

  /**
   * 获取当前区块链的块高度
   * @returns {Promise<any>}
   */
  async getLastBlock(): Promise<TYPE.SingleBlockModel> {
    let data = await this.fetch.get<any>(this.GET_LAST_BLOCK_URL);

    return data.block;
  }

  /**
   * 根据块ID获取块信息，返回一个对象
   * @param {string} blockId
   * @returns {Promise<any>}
   */
  async getBlockById(blockId: string): Promise<TYPE.SingleBlockModel> {
    let data = await this.fetch.get<any>(this.GET_BLOCK_BY_ID, {
      search: {
        id: blockId,
      },
    });

    return data.blocks;
  }

  /**
   * 返回根据高度搜索到的块，返回一个对象
   * @param {number} height
   * @returns {Promise<any>}
   */
  async getBlockByHeight(height: number): Promise<TYPE.BlockModel[]> {
    let data = await this.fetch.get<any>(this.GET_BLOCK_BY_QUERY, {
      search: {
        height: height,
      },
    });

    return data.blocks;
  }

  /**
   * 返回根据地址搜索的块，返回一个数组
   * @param {string} address
   * @returns {Promise<any>}
   */
  async getBlocksByAddress(address: string): Promise<TYPE.BlockModel[]> {
    let data = await this.fetch.get<any>(this.GET_BLOCK_BY_QUERY, {
      search: {
        generatorId: address,
      },
    });

    return data.blocks;
  }

  /**
   * 搜索块，可以搜索高度、地址和ID任一
   * @param {string} query
   * @returns {Promise<any>}
   */
  async searchBlocks(query: string): Promise<any[]> {
    //如果是纯数字且不是以0开头就查高度
    if (/[1-9][0-9]*/.test(query)) {
      const query_num = parseFloat(query) * 1;
      let data = await this.getBlockByHeight(query_num);
      if (data.length > 0) {
        return data;
      }
    } else {
      //首先查创块人
      let data1 = await this.getBlocksByAddress(query);
      if (data1.length > 0) {
        return data1;
      }

      //不是创块人则搜索ID
      let data2 = await this.getBlockById(query);
      if (data2.id) {
        return [data2];
      }

      return [];
    }
  }

  /**
   * 获取区块信息
   * @param {{}} query  查询的条件，对象存在
   * @returns {Promise<{}>}
   */
  async getBlocks(query): Promise<TYPE.BlockResModel> {
    let data = await this.fetch.get<TYPE.BlockResModel>(
      this.GET_BLOCK_BY_QUERY,
      {
        search: query,
      },
    );

    return data;
  }

  /**
   * 增量更新块信息
   * @param {number} amount  更新数量，空时默认10个
   * @param {boolean} increment  是否增量更新
   * @returns {Promise<void>}
   */
  async getTopBlocks(
    increment: boolean,
    amount = 10,
  ): Promise<TYPE.BlockModel[]> {
    //增量查询
    if (increment) {
      let currentBlock = await this.getLastBlock();
      let currentHeight = currentBlock.height;

      //有缓存时
      if (
        this.blockArray &&
        this.blockArray.length > 0 &&
        this.blockArray.length >= amount
      ) {
        //如果缓存高度和当前高度一致返回缓存
        if (currentHeight === this.blockArray[0].height) {
          return this.blockArray.slice(0, amount - 1);
        } else {
          //如果缓存高度不一致
          let heightBetween = currentHeight - this.blockArray[0].height;
          //缓存高度和当前高度相差太大则重新获取，否则只获取相差的块
          if (heightBetween > amount) {
            return await this.getTopBlocks(false, amount);
          } else {
            //增量的加入缓存
            let data = await this.getBlocks({
              limit: heightBetween,
              orderBy: "height:desc",
            });
            //把数组插入原数组前面
            //Array.prototype.splice然后把指针指向
            debugger;
            if (data.success) {
              let temp: any;
              temp = data;
              temp.blocks.unshift(temp.length, 0);
              Array.prototype.splice.apply(this.blockArray, temp);
              this.blockArray = temp;
              return this.blockArray.slice(0, amount - 1);
            } else {
              return this.blockArray.slice(0, amount - 1);
            }
          }
        }
      } else {
        return await this.getTopBlocks(false, amount);
      }
    } else {
      let data = await this.getBlocks({
        limit: amount,
        orderBy: "height:desc",
      });
      this.blockArray = data.blocks;
      return this.blockArray;
    }
  }

  /**
   * 获取最新的块
   */
  latestBlock: AsyncBehaviorSubject<TYPE.BlockModel[]>;
  @HEIGHT_AB_Generator("lastBlock")
  lastBlock_Executor(promise_pro) {
    return promise_pro(this.getTopBlocks(true));
  }

  /**
   * 判断当前的块是否延迟，返回块数组
   * @param list
   */
  blockListHandle(list: TYPE.BlockModel[]): TYPE.BlockModel[] {
    for (let i = 0; i < list.length - 1; i++) {
      if (list[i].timestamp > list[i + 1].timestamp + 128) {
        list[i].delay = true;
      } else {
        list[i].delay = false;
      }
    }
    return list;
  }

  /**
   * 分页查询块数据，页数从1开始
   * @param {number} page 从1开始
   * @param {number} limit
   * @returns {Promise<any>}
   */
  async getBlocksByPage(
    page: number,
    limit = 10,
    sort = true,
  ): Promise<TYPE.BlockModel[]> {
    if (page === 1 && this.blockArray && this.blockArray.length > limit) {
      await this.getTopBlocks(true, limit);
    } else {
      let query = {
        offset: (page - 1) * limit,
        limit: limit,
        orderBy: sort ? "height:asc" : "height:desc",
      };

      let data = await this.getBlocks(query);

      return data.blocks;
    }
  }

  /**
   * 获取块中的交易，分页
   * @param blockId
   * @param page
   * @param limit
   * TODO:前端判断如果没有交易量则不要调用该接口
   */
  async getTransactionsInBlock(
    blockId,
    page = 1,
    limit = 10,
  ): Promise<TransactionModel[]> {
    let query = {
      blockId: blockId,
      offset: (page - 1) * limit,
      limit: limit,
      orderBy: "t_timestamp:desc",
    };
    let data = await this.transactionService.getTransactions(query);

    return data.transactions;
  }
}
