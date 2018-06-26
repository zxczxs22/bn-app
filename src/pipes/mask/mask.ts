import { Pipe, PipeTransform } from "@angular/core";
import { FLP_Tool } from "../../bnqkl-framework/FLP_Tool";
import { UserInfoProvider } from "../../providers/user-info/user-info";
import { TranslateService } from "@ngx-translate/core";

@Pipe({
  name: "mask",
})
export class MaskPipe implements PipeTransform {
  @FLP_Tool.FromGlobal translate!: TranslateService;
  @FLP_Tool.FromGlobal userInfo!: UserInfoProvider;

  transform(value: string, ...args) {
    if (typeof value === "string" && args[0].indexOf("@") === 0) {
      const type = args[0].substr(1);
      if (type === "address") {
        if (value === this.userInfo.address) {
          return `<span class="address-is-me">${FLP_Tool.getTranslateSync(
            "ME",
          )}</span>`;
        }
        return (
          value.substr(0, 4) +
          "<span class='hide-content'>**</span>" +
          value.substr(-4)
        );
      }
      if (type === "ip") {
        const ipinfo = value.split(".");
        if (ipinfo.length == 4) {
          ipinfo.splice(1, 2, "<span class='hide-content'>⁎⁎</span>");
        }
        return ipinfo.join(".");
      }
    }
    return value;
  }
}
