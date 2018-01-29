import {
  Component,
  ViewChild,
  ElementRef,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Input,
  Output,
} from "@angular/core";
import { AniBase } from "../AniBase";
import { PromiseOut } from "../../bnqkl-framework/PromiseExtends";

import * as THREE from "three";
// import { SimplexNoise } from "../SimplexNoise";
import * as SimplexNoise from "simplex-noise";
export const loader = new PIXI.loaders.Loader();
export const _load_resource_promiseout = new PromiseOut<
  PIXI.loaders.ResourceDictionary
>();
export const FRAMES_NUM = 60;
for (let i = 0; i < FRAMES_NUM; i += 1) {
  const i_str = ("00000" + i).substr(-5);
  loader.add("img" + i_str, "assets/imgs/400-60/earth-" + i_str + ".png");
}
loader.onError.add(err => _load_resource_promiseout.reject(err));
loader.load((loader, resources) => {
  _load_resource_promiseout.resolve(resources);
});

@Component({
  selector: "chain-mesh",
  templateUrl: "chain-mesh.html",
})
export class ChainMeshComponent extends AniBase {
  @ViewChild("canvas") canvasRef: ElementRef;
  app: PIXI.Application;
  @Input("auto-start") auto_start = false;
  @Input("tint")
  set tint(v) {
    this._tint = v;
    if (this.app) {
      this.app.stage.children.forEach(child => {
        if (child instanceof PIXI.Sprite) {
          child.tint = v;
        }
      });
    }
  }
  _tint = 0xffffff;
  get tint() {
    return this._tint;
  }
  _init() {
    this.canvasNode || (this.canvasNode = this.canvasRef.nativeElement);
    return super._init();
  }
  constructor() {
    super();
    this.on("init-start", this.initPixiApp.bind(this));
    this.on("start-animation", this.startPixiApp.bind(this));
    this.on("stop-animation", this.stopPixiApp.bind(this));
  }
  is_app_ready = false;
  async initPixiApp() {
    if (this.app) {
      this.app.destroy();
      this.app = null;
    }
    const { pt, px, canvasNode } = this;
    const app = (this.app = new PIXI.Application({
      antialias: true,
      transparent: true,
      view: canvasNode,
      height: pt(canvasNode.clientHeight),
      width: pt(canvasNode.clientWidth),
      autoStart: this.auto_start,
    }));
    const resources = await _load_resource_promiseout.promise;
    console.log("resources", resources);
    // 处理resource成动画帧
    const { stage, renderer, ticker } = app;
    const wh_size = Math.min(renderer.width, renderer.height);
    const frames_list: PIXI.Texture[] = (window["frames_list"] = []);
    for (let i = 0; i < FRAMES_NUM; i += 1) {
      const i_str = ("00000" + i).substr(-5);
      const resource = resources["img" + i_str] as PIXI.loaders.Resource;
      frames_list.push(resource.texture);
    }

    const fps_info = new PIXI.Text(ticker.FPS.toFixed(2), {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0,
      align: "center",
    });
    fps_info.position.set(
      160 * this.devicePixelRatio,
      fps_info.height * 2 * this.devicePixelRatio,
    );
    stage.addChild(fps_info);
    ticker.add(() => {
      fps_info.text = ticker.FPS.toFixed(2);
    });

    const gradient_r_canvas = ChainMeshComponent.createRadialGradient(wh_size, [
      [0, "rgba(255,255,255,0.3)"],
      // [0.2, "rgba(255,255,255,0.5)"],
      [0.35, "rgba(255,255,255,0.5)"],
      [0.65, "rgba(255,255,255,0.65)"],
      [0.8, "rgba(255,255,255,0.8)"],
      [0.95, "#FFF"],
      [1, "#FFF"],
    ]);

    const mask_texture = PIXI.Texture.fromCanvas(gradient_r_canvas);

    const mask = new PIXI.Sprite(mask_texture);
    mask.anchor.set(0.5);
    mask.width = wh_size;
    mask.height = wh_size;
    mask.position.set(wh_size / 2);
    stage.addChild(mask);
    stage.mask = mask;

    this.is_app_ready = true;
    this.emit("app-ready");

    let id = 0;
    do {
      const cur_id = id;
      id += 1;
      const po = new PromiseOut();
      const start_frame_num = 0; //(frames_list.length / 3 * Math.random()) | 0;
      const end_frame_num = frames_list.length - 1;
      // (frames_list.length * 2 / 3 +
      // 	frames_list.length / 3 * Math.random()) |
      // 0;
      const frame_num = end_frame_num - start_frame_num;
      const half_frame_num = frame_num / 2;
      const sp = new PIXI.Sprite(frames_list[start_frame_num]);
      sp.width = wh_size;
      sp.height = wh_size;
      stage.addChild(sp);
      let i = 0;
      const skip_num = 0; //2; //* 2;
      let cur_skip = 0;

      let get_aplha = p => {
        return Math.sin(p * Math.PI);
      };
      sp.alpha = 0;
      sp.tint = this.tint;
      // sp.tint = (0xffffff * Math.random()) | 0;
      sp.rotation = Math.PI * 2 * Math.random();
      if (cur_id === 0) {
        sp.alpha = 1;
        get_aplha = p => {
          if (p < 0.5) {
            return 1;
          } else {
            return Math.sin(p * Math.PI);
          }
        };
      }
      sp.anchor.set(0.5);
      sp.position.set(wh_size / 2);
      // sp.blendMode = PIXI.BLEND_MODES.ADD;

      const loop = () => {
        if (cur_skip != skip_num) {
          cur_skip += 1;
          return;
        }
        cur_skip = 0;
        i += 1;
        const cur_frame_num = i + start_frame_num;
        if (cur_frame_num >= end_frame_num) {
          po.resolve(); // 避免出错
          sp.destroy();
          ticker.remove(loop);
          return;
        }

        let alpha = get_aplha(i / frame_num);
        if (i > half_frame_num) {
          po.resolve();
        }
        sp.alpha = alpha;
        sp.texture = frames_list[cur_frame_num];
      };
      ticker.add(loop);
      // ticker.FPS = 30;
      await po.promise;
    } while (true);
  }
  startPixiApp() {
    this.app && this.app.start();
  }
  stopPixiApp() {
    this.app && this.app.stop();
  }
  static createRadialGradient(r = 300, stops = [[0, "#FFF"], [1, "#000"]]) {
    var canvas = document.createElement("canvas");

    canvas.height = r;
    canvas.width = r;

    const half_r = r / 2;

    var ctx = canvas.getContext("2d");
    window["ctx"] = ctx;

    var gradient = ctx.createRadialGradient(
      half_r,
      half_r,
      0,
      half_r,
      half_r,
      half_r,
    );
    for (let stop of stops) {
      gradient.addColorStop(stop[0] as number, stop[1] as string);
    }
    ctx.fillStyle = gradient;

    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }
}