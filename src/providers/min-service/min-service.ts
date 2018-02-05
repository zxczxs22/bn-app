import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AppFetchProvider } from "../app-fetch/app-fetch";
import { TranslateService } from "@ngx-translate/core";
import { Storage } from "@ionic/storage";
import { Observable, BehaviorSubject } from "rxjs";
import {
  AppSettingProvider,
  ROUND_AB_Generator,
  AsyncBehaviorSubject,
} from "../app-setting/app-setting";
import { BlockServiceProvider } from "../block-service/block-service";
import { AccountServiceProvider } from "../account-service/account-service";
import { TransactionServiceProvider } from "../transaction-service/transaction-service";
import { UserInfoProvider } from "../user-info/user-info";
import * as IFM from "ifmchain-ibt";
import { FLP_Form } from "../../../src/bnqkl-framework/FLP_Form";
import * as TYPE from "./min.types";
export * from "./min.types";

/*
  Generated class for the MinServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class MinServiceProvider {
  ifmJs: any;
  transactionTypes: any;
  allVoters?: TYPE.RankModel[];
  allMinersInfo?: {
    list: TYPE.DelegateModel[],
    round: number
  }

  constructor(
    public http: HttpClient,
    public fetch: AppFetchProvider,
    public translateService: TranslateService,
    public storage: Storage,
    public appSetting: AppSettingProvider,
    public accountService: AccountServiceProvider,
    public transactionService: TransactionServiceProvider,
    public blockService: BlockServiceProvider,
    public user: UserInfoProvider,
  ) {
    this.ifmJs = AppSettingProvider.IFMJS;
    this.transactionTypes = this.ifmJs.transactionTypes;
    this.appSetting.round.subscribe(r => {
      this.autoVote(r);
    });
  }

  readonly ROUND_TIME = this.appSetting.APP_URL("/api/delegates/roundTime");
  readonly VOTE_URL = this.appSetting.APP_URL(
    "/api/accounts/randomAccessDelegates",
  );
  readonly VOTE_FOR_ME = this.appSetting.APP_URL(
    "/api/accounts/voteForDelegate",
  );
  readonly FORGE_STATUS = this.appSetting.APP_URL(
    "/api/delegates/forging/status",
  );
  readonly MINERS = this.appSetting.APP_URL("/api/delegates");
  readonly MY_VOTES = this.appSetting.APP_URL("/api/accounts/delegates");
  readonly MY_RANK = this.appSetting.APP_URL("/api/accounts/profitRanking");

  /**
   * 获取本轮剩余时间
   * @returns {Promise<void>}
   */
  async getRoundRemainTime() {
    let roundTimeUrl = this.ROUND_TIME;
    let roundTimeReq = {
      publicKey: this.user.userInfo.publicKey,
    };
    let roundProgress: any;

    let data = await this.fetch.get<{
      success: boolean;
      nextRoundTime: number;
      error?: any;
    }>(roundTimeUrl);
    let roundTime = data.nextRoundTime;
    let blockTimeRes = await this.transactionService.getTimestamp();
    if (blockTimeRes.success) {
      let blockTime = blockTimeRes.timestamp;
      roundProgress = ((1 - roundTime / (57 * blockTime / 1000)) * 100).toFixed(
        2,
      );
      return roundProgress;
    }

    return roundProgress;
  }

  /**
   * 投票
   * @param secret 主密码
   * @param secondSecret 支付密码
   */
  async vote(secret: string, secondSecret?: string) {
    //首先获取时间戳
    let voteTimestamp = await this.transactionService.getTimestamp();
    if (voteTimestamp.success) {
      //获取投票的人
      const resp = await this.fetch.get<any>(this.VOTE_URL, {
        search: { address: this.user.address },
      });
      //如果没有可投票的人，一般都是已经投了57票
      if (resp.delegate.length === 0) {
        throw "you have already voted";
      } else {
        let delegateArr: string[] = resp.delegate;
        let voteList: string[] = [];
        //票投给所有获取回来的人
        for (let delegate of delegateArr) {
          voteList.push("+" + delegate);
        }

        //设置投票的参数
        let txData = {
          type: this.transactionTypes.VOTE,
          secret: secret,
          publicKey: this.user.userInfo.publicKey,
          fee: this.appSetting.settings.default_fee.toString(),
          timestamp: resp.timestamp,
          asset: {
            votes: voteList,
          },
          secondSecret,
        };

        if (secondSecret) {
          txData.secondSecret = secondSecret;
        }

        //成功完成交易
        let isDone: boolean = await this.transactionService.putTransaction(
          txData,
        );
        if (isDone) {
          this.appSetting.settings.digRound = this.appSetting.getRound();
          this.appSetting.settings.background_mining = true;
        } else {
          throw "vote transaction error";
        }
      }
    }
  }

  /**
   * 自动投票
   */
  async autoVote(round) {
    let voteSwitch: boolean = this.appSetting.settings.background_mining;
    let voteRound: number = this.appSetting.settings.digRound;
    let password: string;
    let secondSecret: any;
    let passwordObj: any;
    if (voteSwitch == true && voteRound < round) {
      passwordObj = await FLP_Form.prototype.getUserPassword();
      password = passwordObj.password;
      secondSecret = passwordObj.secondSecret;
      await this.vote(password, secondSecret);
    }
  }

  /**
   * 取消自动投票
   */
  stopVote() {
    this.appSetting.settings.background_mining = false;
  }

  /**
   * 返回所有的投票人
   * @param page
   * @param limit
   */
  async getAllVotersForMe(page = 1, limit = 10) {
    let voteForMeUrl = this.VOTE_FOR_ME;

    let data = await this.fetch.get<any>(voteForMeUrl, {
      search: {
        publicKey: this.user.publicKey,
        offset: (page - 1) * limit,
        limit: limit,
      },
    });
    if (data.success) {//@DDFIX
      data.unshift(0, data.length - 1);
      if (this.allVoters) {
        this.allVoters.push(...data);
      } else {
        this.allVoters = data;
      }
      return this.allVoters;
    } else {
      return this.allVoters;
    }
  }

  /**
   * 给我投票的人
   */
  voteForMe!: AsyncBehaviorSubject<TYPE.RankModel[]>;
  @ROUND_AB_Generator("voteForMe")
  voteForMe_Executor(promise_pro) {
    return promise_pro.follow(this.getAllVotersForMe());
  }

  /**
   * 获取我投的票
   * @param page
   * @param limit
   */
  async getMyVotes(page = 1, limit = 10) {
    let query = {
      address: this.user.userInfo.address,
      offset: (page - 1) * limit,
      limit: limit,
    };

    let data: any = await this.fetch.get<any>(this.MY_VOTES, { search: query });

    return data.delegates;
  }

  /**
   * 返回已被选中的矿工
   * 一次性获取57条，本轮不再获取
   * 返回offset + limit
   * @param page
   * @param limit
   */
  async getAllMiners(page = 1, limit = 10): Promise<TYPE.DelegateModel[]> {
    let currentBlock = await this.blockService.getLastBlock();
    let currentRound = Math.floor(currentBlock.height / 57);

    if (this.allMinersInfo && this.allMinersInfo.round === currentRound) {
      return this.allMinersInfo.list.slice((page - 1) * limit, limit);
    } else {
      let query = {
        orderBy: "rate:asc",
      };
      let data = await this.fetch.get<any>(this.MINERS, { search: query });
      this.allMinersInfo = {
        list: data.delegates,
        round: currentRound
      }
      return this.allMinersInfo.list.slice((page - 1) * limit, limit);
    }
  }

  /**
   * 获取本轮矿工
   */
  allMinersPerRound!: AsyncBehaviorSubject<TYPE.DelegateModel[]>;
  @ROUND_AB_Generator("allMinersPerRound")
  allMiners_Executor(promise_pro) {
    return promise_pro.follow(this.getAllMiners());
  }

  /**
   * 获取候选矿工
   * @param page
   * @param limit
   */
  async getAllMinersOutside(page = 1, limit = 10): Promise<TYPE.DelegateModel[]> {
    let query = {
      offset: 57 + (page - 1) * limit,
      limit: limit,
      orderBy: "rate:asc",
    };
    let data = await this.fetch.get<any>(this.MINERS, { search: query });

    return data.delegates;
  }

  /**
   * 获取未被选中的矿工
   */
  minersOut!: AsyncBehaviorSubject<TYPE.DelegateModel[]>;
  @ROUND_AB_Generator("minersOut")
  minersOut_Executor(promise_pro) {
    return promise_pro.follow(this.getAllMinersOutside());
  }

  /**
   * 返回是否在挖矿(打块)
   * @returns {Promise<void>}
   */
  async getForgeStaus() {
    let query = {
      publicKey: this.user.userInfo.publicKey,
    };
    let data = await this.fetch.get<any>(this.FORGE_STATUS, { search: query });
    return data.enabled;
  }

  /**
   * 获取输入的时间戳的完整时间戳
   * @param timestamp
   */
  getFullTimestamp(timestamp: number) {
    let seed = new Date(
      Date.UTC(
        AppSettingProvider.SEED_DATE[0],
        AppSettingProvider.SEED_DATE[1],
        AppSettingProvider.SEED_DATE[2],
        AppSettingProvider.SEED_DATE[3],
        AppSettingProvider.SEED_DATE[4],
        AppSettingProvider.SEED_DATE[5],
        AppSettingProvider.SEED_DATE[6],
      ),
    );
    let tstamp = parseInt((seed.valueOf() / 1000).toString());
    let fullTimestamp = (timestamp + tstamp) * 1000;

    return fullTimestamp;
  }

  /**
   * 获取我在上一轮的排名
   */
  async getMyRank(): Promise<TYPE.RankModel[]> {
    let query = {
      address: this.user.userInfo.address,
    };
    let data = await this.fetch.get<any>(this.MY_RANK, { search: query });

    return data.ranks;
  }

  myRank!: AsyncBehaviorSubject<TYPE.RankModel[]>;
  @ROUND_AB_Generator("myRank")
  myRank_Executor(promise_pro) {
    return promise_pro.follow(this.getMyRank());
  }

  /** 
   * 获取上一轮的投资回报率
   * 从rank中获取上一轮的收益，从上一轮的交易中获取手续费
   * TODO:需要后端在rank中添加手续费字段或者从其他地方获取手续费或者获取交易时可以根据轮次进行获取
  */
  async getRateOfReturn() {
    let lastRoundT = await this.transactionService.getTransactions({
      "type": this.ifmJs.transactionTypes.VOTE,
      "senderId": this.user.address,
      "orderBy": "t_timestamp:desc",
      "limit": 57
    })

    let transactions = lastRoundT.transactions;

    let totalBenefitList = await this.myRank.getPromise();
    const myBenefit = totalBenefitList.find(rank_info => rank_info.address === this.user.address);
    if (!myBenefit) {
      return undefined
    }
    let totalBenefit = parseInt(myBenefit.profit);
    let totalFee = 0;
    for (let i of transactions) {
      if (Math.floor(i.height / 57) == this.appSetting.getRound()) {
        totalFee += parseFloat(i.fee);
      } else {
        break;
      }
    }
    if (totalFee < 0) {
      throw new RangeError("手续费不可能为负数");
    }

    return {
      totalBenefit,
      totalFee,
      rateOfReturn: totalFee ? (totalBenefit / totalFee) : 0
    } as TYPE.RateOfReturnModel;
  }
}
