import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import {
  AppSettingProvider
} from "../app-setting/app-setting";
import { AppFetchProvider, CommonResponseData } from "../app-fetch/app-fetch";
import { TranslateService } from "@ngx-translate/core";
import { TransactionServiceProvider } from "../transaction-service/transaction-service";
import { Storage } from "@ionic/storage";

import { Observable, BehaviorSubject } from "rxjs";
import * as IFM from 'ifmchain-ibt';

// TODO：接入Token管理，将用户相关的数据使用内存进行缓存。改进用户相关的数据请求。@Gaubee
@Injectable()
export class AccountServiceProvider {
  ifmJs = AppSettingProvider.IFMJS;
  Mnemonic = this.ifmJs.Mnemonic;
  account = AppSettingProvider.IFMJS.Api(AppSettingProvider.HTTP_PROVIDER).account;
  transactionType = this.ifmJs.transactionTypes;
  nacl_factory = this.ifmJs.nacl_factory;
  Buff = this.ifmJs.Buff;
  keypair = this.ifmJs.keypairHelper;
  userInfo: any;
  Crypto = this.ifmJs.crypto;
  md5: any;
  sha: any;
  nacl: any;
  fee: any;
  balance: any;
  constructor(
    public http: HttpClient,
    public translateService: TranslateService,
    public storage : Storage,
    public appSetting: AppSettingProvider,
    public fetch: AppFetchProvider,
    public transactionService: TransactionServiceProvider,
  ) {
    console.log(this.Crypto);
    this.md5 = this.Crypto.createHash('md5');//Crypto.createHash('md5');
    this.sha = this.Crypto.createHash('sha256');//Crypto.createHash('sha256');
  }

  /**
   * 根据地址获取账户信息
   * @param {string} address
   * @returns {Promise<any>}
   */
  async getAccountByAddress(address: string) {
    let data = await this.account.getUserByAddress(address);
    if(data.success) {
      return data;
    }else {
      return {} as Object;
    }
  }

  /**
   * 根据用户名获取账户信息
   * @param {string} username
   * @returns {Promise<any>}
   */
  async getAccountByUsername(username: string) {
    let data = await this.account.getUserByUsername(username);

    if(data.success && data.account.address) {
      return data.account;
    }else {
      return {} as Object;
    }
  }

  /**
   *  更改用户名
   *  @param {string} newUsername
   */
  async changeUsername(newUsername: string, secret ?: string) {
    if(!!this.userInfo.username) {
      throw "account already has username";
    }else {
      let accountUsername = await this.getAccountByUsername(newUsername);
      if(!!accountUsername) {
        let accountData = {
          type: "username",
          secret: this.userInfo.secret,
          publicKey: this.userInfo.publicKey,
          fee: this.userInfo.fee,
          asset: {
            username: {
              alias: newUsername,
              publicKey: this.userInfo.publicKey
            }
          }
        }

        let is_success = await this.transactionService.putTransaction(accountData);
        if (is_success) {
          this.userInfo.username = newUsername;
        }
      }
    }
  }

  async getUserSettingLocal(address: string) {
    let user:any = this.storage.get(address);
    this.fee = user.fee;
    this.balance = user.balance;
  }

  async saveUserSettingLocal(userData: any) {
    let user:any = await this.storage.get(userData.address);
    if(user) {
      user = {userData};
    }else {
      // default
      userData.fingerPrint = false;
      userData.sound = false;
      userData.autoDig = false;
      userData.digRound = 0;
      userData.background = false;
      userData.report = false;
      userData.animate = true;
      userData.digAtWifi = true;
      userData.autoUpdate = false;
      userData.fee = 0.00000001;
      userData.language = 'cn';
      return this.storage.set(userData.address, userData);
    }
  }

  //生成密码
  generateCryptoPassword(options : object, lang : string) {
    let password = this.keypair.generatePassPhraseWithInfo(options, lang);
    
    return password;
  }

  //验证支付密码
  verifySecondPassphrase(secondPassphrase: string) {
    try {
      let secondPublic = this.formatSecondPassphrase(this.userInfo.publicKey, secondPassphrase);
      console.log(secondPublic.publicKey.toString('hex'));
      if(secondPublic.publicKey.toString('hex') === this.userInfo.secondPublicKey) {
        return true; 
      }else {
        return false;
      }
    }catch(e) {
      console.log("Failed to verify");
    }
  }

  /**
   * 将输入的支付密码转换为publicKey
   * @param publicKey
   * @param secondSecret
   * @returns {any}
   */
  formatSecondPassphrase(publicKey, secondSecret) {
    debugger
    //设置
    if(!this.nacl) {
      this.nacl_factory.instantiate(function(tmpNacl) {
        this.nacl = tmpNacl;
      })
    }

    let reg = /^[^\s]+$/;
    if(!reg.test(secondSecret)) {
      throw "Second Secret cannot contain spaces";
    }

    let pattern = /^[^\u4e00-\u9fa5]+$/;
    if(!pattern.test(secondSecret)) {
      throw "Second Secret cannot contain Chinese characters";
    }

    let md5Second = publicKey.toString().trim() + '-' + this.md5.update(secondSecret.toString().trim()).digest('hex');
    let secondHash = this.sha.update(md5Second, 'utf-8').digest();
    let secondKeypair = this.nacl.crypto_sign_seed_keypair(secondHash);
    secondKeypair.publicKey = this.Buff.from(secondKeypair.signPK);
    secondKeypair.privateKey = this.Buff.from(secondKeypair.signSK);
    return secondKeypair;
  }

  
  /**
   * 设置支付密码
   * @param {string} secondScret
   */
  async setSecondPassphrase(secondSecret: string, second ?: string) {
    debugger
    let txData = {
      "type" : this.transactionType.SIGNATURE,
      "asset" : {
        signature: {
          publicKey: this.userInfo.publicKey
        }
      },
      "amount" : "0",
      "secret" : "decorate soap volcano lizard original leaf evolve vibrant protect maple enough together weapon erase orphan eye blue spoil verb more credit garbage barrel age",
      "secondSecret" : secondSecret,
      "publicKey" : "38e70075fc1054bfbb29cb550932a719f88c1c34f2ed897f1ae74a328ab9a21e",
      "fee" : "0.00000001"
    }

    let is_success = await this.transactionService.putTransaction(txData);
    if(is_success) {
      console.log("secondSign set successfully");
    }
  }

}
