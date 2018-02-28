import { Clipboard } from "@ionic-native/clipboard";
import { TranslateService } from "@ngx-translate/core";
import {
  ActionSheetController,
  AlertController,
  Platform,
  LoadingController,
  Loading,
  ToastController,
  ModalController,
} from "ionic-angular";
export class FLP_Tool {
  constructor() { }
  // 全局弹出层控制器
  @FLP_Tool.FromGlobal actionSheetCtrl!: ActionSheetController;
  @FLP_Tool.FromGlobal alertCtrl!: AlertController;
  @FLP_Tool.FromGlobal loadingCtrl!: LoadingController;
  @FLP_Tool.FromGlobal toastCtrl!: ToastController;
  @FLP_Tool.FromGlobal modalCtrl!: ModalController;
  @FLP_Tool.FromGlobal platform!: Platform;
  @FLP_Tool.FromGlobal translate!: TranslateService;
  @FLP_Tool.FromGlobal clipboard!: Clipboard;
  navigatorClipboard: {
    writeText: (text: string) => Promise<void>,
    readText: () => Promise<string>,
  } = navigator["clipboard"] || {
    writeText: text => this.clipboard.copy(text),
    readText: () => this.clipboard.paste(),
  };
  get localName() {
    const { currentLang } = this.translate;
    if (currentLang === "zh-cmn-Hans") {
      return "zh-cn"; // 使用国际化标准
    }
    if (currentLang === "zh-cmn-Hant") {
      return "zh-tw";
    }
    return currentLang;
  }

  /**
   * 用于管理loading对象的对象池
   * 由于有的页面loading的显示时，用户可以直接无视返回上一级页面，所以就需要有一个对象池缓存这些对象并在页面离开的时候销毁它们
   *
   * @type {Set<Loading>}
   * @memberof FirstLevelPage
   */
  presented_loading_instances: Array<Loading> = [];

  // 页面上通用的辅助函数
  toFixed(num: any, fix_to: number) {
    num = parseFloat(num) || 0;
    return num.toFixed(fix_to);
  }
  toBool(v: any) {
    if (v) {
      v = String(v);
      return v.toLowerCase() !== "false";
    }
    return false;
  }
  isFinite = isFinite;

  static FromGlobal(
    target: any,
    name: string,
    descriptor?: PropertyDescriptor,
  ) {
    if (!descriptor) {
      const hidden_prop_name = `-G-${name}-`;
      descriptor = {
        enumerable: true,
        configurable: true,
        get() {
          return this[hidden_prop_name] || window[name];
        },
        set(v) {
          this[hidden_prop_name] = v;
        },
      };
      Object.defineProperty(target, name, descriptor);
    }
  }
  static FromNavParams(
    target: any,
    name: string,
    descriptor?: PropertyDescriptor,
  ) {
    if (!descriptor) {
      const hidden_prop_name = `-P-${name}-`;
      descriptor = {
        enumerable: true,
        configurable: true,
        get() {
          if (hidden_prop_name in this) {
            return this[hidden_prop_name];
          } else {
            this.navParams &&
              this.navParams.get instanceof Function &&
              this.navParams.get(name);
          }
        },
        set(v) {
          this[hidden_prop_name] = v;
        },
      };
      Object.defineProperty(target, name, descriptor);
    }
  }
  static getTranslate(key: string | string[], interpolateParams?: Object) {
    return (window["translate"] as TranslateService)
      .get(key, interpolateParams)
      .take(1)
      .toPromise();
  }
  getTranslate(key: string | string[], interpolateParams?: Object) {
    return this.translate
      .get(key, interpolateParams)
      .take(1)
      .toPromise();
  }
  static getProtoArray = getProtoArray;
  static addProtoArray = addProtoArray;
}

// 存储在原型链上的数据（字符串）集合
const CLASS_PROTO_ARRAYDATA_POOL = (window[
  "CLASS_PROTO_ARRAYDATA_POOL"
] = new Map<string, classProtoArraydata>());
const PA_ID_KEY = '@PAID:' + Math.random().toString(36).substr(2);
type classProtoArraydata = Map<string, string[]>;
export function getProtoArray(target: any, key: string) {
  var res = new Set();
  const CLASS_PROTO_ARRAYDATA = CLASS_PROTO_ARRAYDATA_POOL.get(key);
  if (CLASS_PROTO_ARRAYDATA) {
    do {
      if (target.hasOwnProperty(PA_ID_KEY)) {
        const arr_data = CLASS_PROTO_ARRAYDATA.get(target[PA_ID_KEY])
        if (arr_data) {
          for (let item of arr_data) {
            res.add(item);
          }
        }
      }
    } while ((target = Object.getPrototypeOf(target)));
  }
  return res;
}
window['getProtoArray'] = getProtoArray;

let PA_ID_VALUE = 0;
export function addProtoArray(target: any, key: string, value: any) {
  var CLASS_PROTO_ARRAYDATA = CLASS_PROTO_ARRAYDATA_POOL.get(key);
  if (!CLASS_PROTO_ARRAYDATA) {
    CLASS_PROTO_ARRAYDATA = new Map();
    CLASS_PROTO_ARRAYDATA_POOL.set(key, CLASS_PROTO_ARRAYDATA);
  }

  const pa_id = target.hasOwnProperty(PA_ID_KEY) ? target[PA_ID_KEY] : (target[PA_ID_KEY] = ('#' + PA_ID_VALUE++));
  var arr_data = CLASS_PROTO_ARRAYDATA.get(pa_id);
  if (!arr_data) {
    arr_data = [value];
    CLASS_PROTO_ARRAYDATA.set(pa_id, arr_data);
  } else {
    arr_data.push(value);
  }
}
