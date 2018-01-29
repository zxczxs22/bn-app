import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage";

@Injectable()
// 用户缓存用户的基本信息，相比getUserToken，速度更快
export class UserInfoProvider {
  private _userInfo: any;
  get userInfo() {
    return this._userInfo || {};
  }

  private _balance: string;
  get balance() {
    return this._balance;
  }
  private _address: string;
  get address() {
    return this._address;
  }
  private _password: string;
  get password() {
    return this._password;
  }
  private _secondPublicKey: string;
  get secondPublicKey() {
    return this._secondPublicKey;
  }
  get hasSecondPwd() {
    return !!this._userInfo.secondPublicKey;
  }
  constructor(public storage: Storage) {}
  initUserInfo(userInfo) {
    if (!userInfo) {
      userInfo = {};
    }
    this._userInfo = userInfo;
    this._address = userInfo.address;
    this._balance = userInfo.balance;
    this._secondPublicKey = userInfo.secondPublicKey;
    this._password = userInfo.remember ? userInfo.password : null;
  }
}