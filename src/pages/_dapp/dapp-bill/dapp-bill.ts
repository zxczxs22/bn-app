import { Component, Optional } from "@angular/core";
import { SecondLevelPage } from "../../../bnqkl-framework/SecondLevelPage";
import { TabsPage } from "../../tabs/tabs";
import { IonicPage, NavController, NavParams } from "ionic-angular/index";

/**
 * Generated class for the DappBillPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage({ name: "dapp-bill" })
@Component({
  selector: "page-dapp-bill",
  templateUrl: "dapp-bill.html",
})
export class DappBillPage extends SecondLevelPage {
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    @Optional() public tabs: TabsPage
  ) {
    super(navCtrl, navParams, true, tabs);
  }
}
