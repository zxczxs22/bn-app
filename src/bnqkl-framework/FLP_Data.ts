import { FLP_Form } from "./FLP_Form";
import { PAGE_STATUS } from "./const";
export class FLP_Data extends FLP_Form {
  /** 定义一个延迟渲染到页面的属性
   */
  static setAfterPageEnter(defaultValue?: any, delay?: number) {
    return function(
      target: any,
      name: string,
      descriptor?: PropertyDescriptor,
    ) {
      if (!descriptor) {
        let cache_data = defaultValue;
        let val;
        let is_bind_event = false;
        let can_set = true;
        let can_set_cb = null;

        target.event.on("willEnter", () => {
          val = cache_data = defaultValue;
          if (isFinite(delay)) {
            can_set = false;
            setTimeout(() => {
              can_set = true;
              if (can_set_cb instanceof Function) {
                can_set_cb();
              }
            }, delay);
          }
        });
        const setVal = () => {
          if (can_set) {
            val = cache_data;
          } else {
            can_set_cb = () => (val = cache_data);
          }
        };
        descriptor = {
          enumerable: true,
          configurable: true,
          get() {
            return val;
          },
          set(v) {
            cache_data = v;
            if (this.PAGE_STATUS === PAGE_STATUS.WILL_ENTER) {
              if (!is_bind_event) {
                is_bind_event = true;
                this.event.once("didEnter", setVal);
                this.event.once("didLeave", () => {
                  is_bind_event = false;
                });
              }
            } else {
              setVal();
            }
          },
        };
        Object.defineProperty(target, name, descriptor);
      }
    };
  }
}
