import { Component, ViewChild, ElementRef, OnInit } from "@angular/core";
import { DomSanitizer, SafeStyle } from "@angular/platform-browser";

import { IonicPage, NavController, NavParams } from "ionic-angular";
import { EarthNetMeshComponent } from "../../components/earth-net-mesh/earth-net-mesh";
import { ChainMeshComponent } from "../../components/chain-mesh/chain-mesh";
import { FirstLevelPage } from "../../bnqkl-framework/FirstLevelPage";
import { LoginServiceProvider } from "../../providers/login-service/login-service";
import { BlockServiceProvider } from "../../providers/block-service/block-service";
import { TransactionServiceProvider } from "../../providers/transaction-service/transaction-service";
import { AccountServiceProvider } from "../../providers/account-service/account-service";
import { asyncCtrlGenerator } from "../../bnqkl-framework/Decorator";
import { MyApp } from "../../app/app.component";
import {
  LoginFormInOut,
  RegisterFormInOut,
} from "./sign-in-and-sign-up.animations";
import { MainPage } from "../pages";
import { AppSettingProvider } from "../../providers/app-setting/app-setting";
import * as plumin from "plumin.js";

@IonicPage({ name: "sign-in-and-sign-up" })
@Component({
  selector: "page-sign-in-and-sign-up",
  templateUrl: "sign-in-and-sign-up.html",
  animations: [LoginFormInOut, RegisterFormInOut],
})
export class SignInAndSignUpPage extends FirstLevelPage {
  ifmJs = AppSettingProvider.IFMJS;
  transactionType = this.ifmJs.transactionTypes;
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public loginService: LoginServiceProvider,
    public myApp: MyApp,
    public blockService: BlockServiceProvider,
    public transactionService: TransactionServiceProvider,
    public domSanitizer: DomSanitizer,
  ) {
    super(navCtrl, navParams);
  }
  @ViewChild("passwordTextarear") passwordTextarear: ElementRef;
  @ViewChild(EarthNetMeshComponent) earth: EarthNetMeshComponent;
  @ViewChild(ChainMeshComponent) cmesh: ChainMeshComponent;

  @SignInAndSignUpPage.didEnter
  initEarchPos() {
    if (this.earth) {
      this.earth.camera.position.y = 18 * this.earth.devicePixelRatio;
      this.earth.camera.position.z /= 1.8;
      this.earth.line_width = 1.5;
    }
    if (this.cmesh) {
      // this.cmesh.startAnimation();
    }
  }

  formData = {
    email: "",
    phone: "",
    remark: "",
    gpwd: "",
    pwd: "",
  };
  _ture_pwd = "";
  pwd_textarea_height = "";

  autoReHeightPWDTextArea() {
    const ele = this.passwordTextarear.nativeElement;
    this.pwd_textarea_height = ele.style.height = "";
    if (ele.clientHeight < ele.scrollHeight) {
      this.pwd_textarea_height = ele.style.height = ele.scrollHeight + "px";
    }
  }

  show_pwd = false;
  showPWD() {
    this.show_pwd = true;
  }
  hidePWD() {
    this.show_pwd = false;
  }
  togglePWD() {
    this.show_pwd = !this.show_pwd;
  }
  pwd_font_char_map = new Map();
  pwd_font = (() => {
    // const canvas_ele = document.createElement("canvas");
    // canvas_ele.style.display = "none";
    // document.body.appendChild(canvas_ele);
    plumin.setup({
      width: 1024,
      height: 1024,
    });

    return new plumin.Font({
      familyName: "PWD",
      ascender: 800,
      descender: -200,
    });
  })();
  hiddenPwd() {
    this.generatePWDFont();
  }
  font_name: SafeStyle = this.domSanitizer.bypassSecurityTrustStyle("PWD");
  @ViewChild("fontCalc") fontCalcEle: ElementRef;
  calcFontWidth(c) {
    const ele = this.fontCalcEle.nativeElement;
    ele.innerHTML = c;
    return ele.getBoundingClientRect().width;
  }
  generatePWDFont() {
    const { pwd_font_char_map } = this;
    const pwd_str = this.formData.pwd;
    const new_char_list = [];
    for (let i = 0; i < pwd_str.length; i += 1) {
      const char = pwd_str[i];
      if (pwd_font_char_map.has(char)) {
        continue;
      }
      const char_g = new plumin.Glyph({
        name: "PWD:" + char,
        unicode: char,
        advanceWidth: 76.57 * this.calcFontWidth(char), //536,
      });

      const shape = new plumin.Path.Ellipse({
        point: [50, 0],
        size: [436, 510],
      });
      char_g.addContour(shape);
      new_char_list.push(char_g);
      pwd_font_char_map.set(char, char_g);
    }
    // if (new_char_list.length) {
    //   // const font_name =
    //   //   "PWD-" +
    //   //   Date.now()
    //   //     .toString(36)
    //   //     .substr(2);
    //   // this.font_name = this.domSanitizer.bypassSecurityTrustStyle(font_name);
    //   // const pwd_font = new plumin.Font({
    //   //   familyName: font_name,
    //   //   ascender: 800,
    //   //   descender: -200,
    //   // });
    //   const font_name = "PWD";
    //   const { pwd_font } = this;
    //   pwd_font.addGlyphs(new_char_list);
    //   pwd_font.updateOTCommands();
    //   pwd_font.addToFonts(undefined, font_name, true);
    // }
    const font_name =
      "PWD-" +
      Date.now()
        .toString(36)
        .substr(2);
    this.font_name = this.domSanitizer.bypassSecurityTrustStyle(font_name);
    const pwd_font = new plumin.Font({
      familyName: font_name,
      ascender: 800,
      descender: -200,
    });
    this.pwd_font = pwd_font;

    pwd_font.addGlyphs([...pwd_font_char_map.values()]);
    pwd_font.updateOTCommands();
    pwd_font.addToFonts(undefined, font_name, true);
  }

  page_status = "login";
  gotoLogin() {
    this.page_status = "login";
    this.earth && this.earth.rotateMeshsZ(0, 500, -1);
  }

  get canDoLogin() {
    return this.formData.pwd;
  }
  @asyncCtrlGenerator.error(() =>
    SignInAndSignUpPage.getTranslate("LOGIN ERROR"),
  )
  @asyncCtrlGenerator.loading()
  async doLogin() {
    let result = await this.loginService.doLogin(this.formData.pwd);
    if (result) {
      this.routeTo("scan-nodes");
    }
  }
  gotoRegister() {
    this.page_status = "register";
    this.earth && this.earth.rotateMeshsZ(Math.PI, 500, -1);
  }
  get canDoRegister() {
    return true; //this.allHaveValues(this.formData);
  }

  async doRegister() {
    // debugger
    // let txData = {
    //   // "typeName" : "SEND",
    //   "type": this.transactionType.SEND,
    //   "amount": "0.00000001",
    //   "secret": "decorate soap volcano lizard original leaf evolve vibrant protect maple enough together weapon erase orphan eye blue spoil verb more credit garbage barrel age",
    //   "publicKey": "38e70075fc1054bfbb29cb550932a719f88c1c34f2ed897f1ae74a328ab9a21e",
    //   "recipientId": "c2B5D921U9sbLfQCBAWhyFMnJcHEcc3ij2",
    //   "fee": "0.00000001"
    // }
    // this.transactionService.putTransaction(txData);
    // let a = await this.blockService.getLastBlock();
    // this.blockService.getTopBlocks(true);

    let passphrase = this.loginService.generateNewPassphrase({
      email: this.formData.email,
      phone: this.formData.phone,
      mark: this.formData.remark,
      pwd: this.formData.gpwd,
    });
    this.gotoLogin();
    this.formData.pwd = passphrase;
    this.show_pwd = true;
    this.hiddenPwd();
    this.platform.raf(() => {
      this.autoReHeightPWDTextArea();
    });

    console.log(passphrase);
  }
}
