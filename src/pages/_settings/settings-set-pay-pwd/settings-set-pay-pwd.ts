import { Component, Optional } from "@angular/core";
import { SecondLevelPage } from "../../../bnqkl-framework/SecondLevelPage";
import { asyncCtrlGenerator } from "../../../bnqkl-framework/Decorator";
import { TabsPage } from "../../tabs/tabs";
import { IonicPage, NavController, NavParams } from "ionic-angular";
import { AccountServiceProvider } from "../../../providers/account-service/account-service";

@IonicPage({ name: "settings-set-pay-pwd" })
@Component({
  selector: "page-settings-set-pay-pwd",
  templateUrl: "settings-set-pay-pwd.html",
})
export class SettingsSetPayPwdPage extends SecondLevelPage {
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    @Optional() public tabs: TabsPage,
    public accountService: AccountServiceProvider,
  ) {
    super(navCtrl, navParams, true, tabs);
  }
  formData = {
    pay_pwd: "",
    confrim_pay_pwd: "",
  };

  @asyncCtrlGenerator.error()
  async submit() {
    const { password, custom_fee } = await this.getUserPassword({
      custom_fee: true,
      force_require_password: true,
    });
    return this._submit(password, custom_fee);
  }
  @asyncCtrlGenerator.loading(() =>
    SettingsSetPayPwdPage.getTranslate("SET_PAY_PWD_SUBMITING"),
  )
  @asyncCtrlGenerator.error(() =>
    SettingsSetPayPwdPage.getTranslate("SET_PAY_PWD_SUBMIT_ERROR"),
  )
  @asyncCtrlGenerator.success(() =>
    SettingsSetPayPwdPage.getTranslate("SET_PAY_PWD_SUBMIT_SUCCESS"),
  )
  async _submit(password: string, custom_fee?: number) {
    return this.accountService
      .setSecondPassphrase(
        password,
        this.formData.pay_pwd,
        undefined,
        custom_fee,
      )
      .then(() => {
        this.finishJob();
      });
  }

  @SettingsSetPayPwdPage.setErrorTo("errors", "confrim_pay_pwd", ["noSame"])
  check_TwoPwd() {
    const res: any = {};
    if (this.formData.confrim_pay_pwd !== this.formData.pay_pwd) {
      res.noSame = true;
    }
    return res;
  }
}
