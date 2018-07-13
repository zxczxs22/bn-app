import { Component, Optional } from "@angular/core";
import {
  IonicPage,
  NavController,
  NavParams,
  ViewController,
} from "ionic-angular";
import { SecondLevelPage } from "../../../bnqkl-framework/SecondLevelPage";
import { TabsPage } from "../../tabs/tabs";
import {
  TransactionServiceProvider,
  TransactionTypes,
  TransactionModel,
} from "../../../providers/transaction-service/transaction-service";
import {
  LocalContactModel,
  LocalContactProvider,
  TagModel,
} from "../../../providers/local-contact/local-contact";
import { AccountModel } from "../../../providers/account-service/account-service";
import { AccountServiceProvider } from "../../../providers/account-service/account-service";
import { asyncCtrlGenerator } from "../../../bnqkl-framework/Decorator";

@IonicPage({ name: "account-contact-detail" })
@Component({
  selector: "page-account-contact-detail",
  templateUrl: "account-contact-detail.html",
})
export class AccountContactDetailPage extends SecondLevelPage {
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    @Optional() public tabs: TabsPage,
    public accountService: AccountServiceProvider,
    public localContact: LocalContactProvider,
    public viewCtrl: ViewController,
    public transactionService: TransactionServiceProvider,
  ) {
    super(navCtrl, navParams, true, tabs);
    this.enable_timeago_clock = true;
    this.event.on("job-finished", ({ id, data }) => {
      switch (id) {
        case "account-remark-contact":
          if (
            this.contact &&
            data.updated_contact.address === this.contact.address
          ) {
            this.contact = data.updated_contact;
            this.markForCheck();
          }
          break;
      }
    });
  }
  @AccountContactDetailPage.markForCheck
  contact?: LocalContactModel | AccountModel;
  get mainname() {
    const { contact } = this;
    if (contact) {
      if (contact.address == this.userInfo.address) {
        return this.getTranslateSync("ME");
      }
      return contact["nickname"] || contact.username;
    }
  }
  get username() {
    const { contact } = this;
    if (contact) {
      if (contact.address == this.userInfo.address) {
        return contact.username;
      }
      // 如果有昵称的话，这里返回用户名
      if (contact["nickname"]) {
        return contact.username;
      } // 如果没有昵称的话，那么mainname就会显示昵称，这里就不用显示用户名了，返回空
    }
  }
  private _is_back_from_child_page = false;

  @AccountContactDetailPage.willEnter
  @asyncCtrlGenerator.loading(undefined, undefined, {
    cssClass: "can-tap blockchain-loading",
  })
  async initData() {
    if (this._is_back_from_child_page) {
      this._is_back_from_child_page = false;
      return;
    }
    const contact: LocalContactModel | undefined = this.navParams.get(
      "contact",
    );
    const account: AccountModel | undefined = this.navParams.get("account");
    this.contact = contact || account;
    if (!this.contact) {
      const account_string: string | undefined = this.navParams.get("address");
      if (account_string) {
        this.contact = await this.accountService.getAccountByAddress(
          account_string,
        );
      }
    }
    if (!this.contact) {
      return this.navCtrl.goToRoot({});
    }
    this.hide_navbar_tools = this.contact.address === this.userInfo.address;
    if (!this.hide_navbar_tools) {
      if (this.contact) {
        await this.checkIsMyContact();
      } else {
        this.is_my_contact = true;
      }
    }
    await this.getTransactionLogs();
  }
  hide_navbar_tools = true;
  checking_is_my_contact = false;
  is_my_contact = false;
  @asyncCtrlGenerator.error()
  async checkIsMyContact() {
    if (!this.contact) {
      return;
    }
    this.checking_is_my_contact = true;
    this.markForCheck();
    try {
      const contact = await this.localContact.findContact(this.contact.address);
      if ((this.is_my_contact = !!contact)) {
        this.contact = contact;
      }
    } finally {
      this.checking_is_my_contact = false;
    }
    this.markForCheck();
  }

  /*跳转到编辑页面*/
  goToEditContact() {
    if (!this.contact) {
      return;
    }
    this._is_back_from_child_page = true;
    return this.routeTo("account-remark-contact", {
      contact: this.contact,
      auto_return: true,
    });
  }
  /*添加成我的联系人*/
  @asyncCtrlGenerator.loading()
  @asyncCtrlGenerator.success("@@ADD_LOCAL_CONTACT_SUCCESS")
  @asyncCtrlGenerator.single()
  async addToMyContacts() {
    if (!this.contact) {
      return;
    }
    await this.localContact.addLocalContact(this.contact);
    await this.checkIsMyContact();
  }

  contact_metched_map = new Map<
    string,
    Promise<string | undefined> | LocalContactModel | undefined
  >();
  transaction_list: (TransactionModel & {
    senderNickname?: string;
    recipientNickname?: string;
  })[] = [];
  transaction_config = {
    loading: true,
    has_more: true,
    pageSize: 20,
    page: 1,
  };
  private async _getTransactionList() {
    const { transaction_config } = this;
    transaction_config.loading = true;
    try {
      if (!this.contact) {
        return [];
      }
      const contact = this.contact;
      const list = await Promise.all(
        (await this.transactionService.getUserTransactions(
          contact.address,
          transaction_config.page,
          transaction_config.pageSize,
          "or",
        ))
          // 查询本地联系人
          .map(async trs => {
            const nicknames = await Promise.all(
              [trs.senderId, trs.recipientId].map(async address => {
                if (!address) {
                  return;
                }
                if (address === contact.address) {
                  // 不查询TA
                  return;
                }
                // 这里必须用has判断，应该查询过的可能是空的，但是key还是有设置的
                if (this.contact_metched_map.has(address)) {
                  const task_or_res = this.contact_metched_map.get(address);
                  if (!task_or_res) {
                    return;
                  }
                  if (task_or_res instanceof Promise) {
                    return await task_or_res;
                  } else {
                    return task_or_res.nickname;
                  }
                }

                const task = this.localContact
                  .findContact(address)
                  .then(account => {
                    const nickanme = account && account.nickname;
                    this.contact_metched_map.set(address, account);
                    return nickanme;
                  });
                this.contact_metched_map.set(address, task);

                return await task;
              }),
            );
            return {
              ...trs,
              senderNickname: nicknames[0],
              recipientNickname: nicknames[1],
            };
          }),
      );
      transaction_config.has_more = list.length >= transaction_config.pageSize;
      return list;
    } finally {
      transaction_config.loading = false;
    }
  }
  listTrackBy(index, item: TransactionModel) {
    return item.id;
  }

  TransactionTypes = TransactionTypes;
  @asyncCtrlGenerator.error()
  async getTransactionLogs() {
    this.transaction_config.page = 1;
    this.transaction_list = await this._getTransactionList();
    this.markForCheck();
  }

  @asyncCtrlGenerator.error()
  async getMoreTransactionLogs() {
    try {
      this.transaction_config.page += 1;
      this.transaction_list.push(...(await this._getTransactionList()));
    } catch (err) {
      this.transaction_config.page -= 1;
    }
    this.markForCheck();
  }

  // 进入到交易详情页面
  goToTransactionDetail(tran: TransactionModel) {
    this._is_back_from_child_page = true;
    return this.routeTo("chain-transaction-detail", { transaction: tran });
  }

  is_show_extend_info = false;
  extend_info?: AccountModel;
  /*隐藏功能*/
  @asyncCtrlGenerator.tttttap() // 这个要放第一个
  @asyncCtrlGenerator.error()
  @asyncCtrlGenerator.loading()
  async tryShowAccountBalanceDetail() {
    if (!this.contact) {
      throw new Error("没有联系人");
    }
    const accountInfo = await this.accountService.getAccountByAddress(
      this.contact.address,
    );
    this.extend_info = accountInfo;
    this.is_show_extend_info = true;
    this.markForCheck();
  }
  @asyncCtrlGenerator.tttttap() // 这个要放第一个
  @asyncCtrlGenerator.error()
  @asyncCtrlGenerator.loading("加载全部的交易中", undefined, {
    cssClass: "can-tap blockchain-loading",
  })
  @asyncCtrlGenerator.single()
  async tryGetAllTrans() {
    while (this.transaction_config.has_more) {
      // 增加一次性查询的数量，提升效率
      this.transaction_config.pageSize = 80;
      await this.getMoreTransactionLogs();
    }
  }

  @asyncCtrlGenerator.error("批量备注失败")
  @asyncCtrlGenerator.single()
  async tryRemarkAllContacts() {
    if (
      !(await this.waitTipDialogConfirm("确定要备注全部关联账户", {
        false_text: "@@CANCEL",
        true_text: "@@CONFIRM",
      }))
    ) {
      return;
    }
    const contact = this.contact as LocalContactModel;
    if (!(contact && contact["tags"])) {
      throw new Error("请先添加为联系人");
    }
    const base_name = contact.nickname;
    if (!base_name) {
      throw new Error("请先编辑备注名");
    }
    await this._remarkAllContacts(contact, base_name);
  }
  @asyncCtrlGenerator.loading("批量备注中……")
  private async _remarkAllContacts(
    contact: LocalContactModel,
    base_name: string,
  ) {
    await this.tryGetAllTrans();
    const all_tags = await this.localContact.getTags();
    const all_tags_map = all_tags.reduce((map, tag) => {
      map.set(tag.name, tag);
      return map;
    }, new Map<string, TagModel>());
    const tags = contact.tags
      .map(tagname => all_tags_map.get(tagname))
      .filter(v => v) as TagModel[];
    const tags_name = tags.map(t => t.name);
    for (var [address, local_contact] of this.contact_metched_map.entries()) {
      if (!local_contact) {
        // 添加为联系人
        const _id = await this.localContact.addLocalContact(
          {
            address,
            nickname: `${base_name}-${address.substr(-4)}`,
          },
          tags_name,
        );
        const add_tags_tasks = tags.map(tag => {
          tag.contact_ids.push(_id);
          return this.localContact.updateTag(tag);
        });
        await Promise.all(add_tags_tasks);
      }
    }
  }
}
