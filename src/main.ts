import "./style.css";
import { SizeControlPoint, radius } from "./SizeControlPoint";
import { CursorType } from "./CursorType";
const { neswResize, nwseResize } = CursorType;

enum ResizeDir {
  TOP_LEFR = "top-left",
  TOP_RIGHT = "top-right",
  BOTTOM_LEFT = "bottom-left",
  BOTTOM_RIGHT = "bottom-right",
}

type IResizeDir =
  | ""
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface IOption {
  /** 边框颜色 */
  strokeStyle?: string;
  /** 裁剪比例 */
  ratio?: number;
  /** canvas width if not will init to image width */
  width?: number;
  /** canvas height if not will init to iamge height */
  height?: number;
  padding?: number;
}

interface IPosition {
  x: number;
  y: number;
}

class CropRectangle {
  left: number = 0;
  top: number = 0;
  width: number = 0;
  height: number = 0;
  min: number = 20; // 裁剪的最小尺寸
  constructor(left: number, top: number, width: number, height: number) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
  }
}

class ImageSize {
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 虚拟图片宽度 */
  virtualWidth: number;
  /** 虚拟图片高度 */
  virtualHeight: number;
  constructor(
    width: number = 0,
    height: number = 0,
    virtualWidth: number = 0,
    virtualHeight: number = 0
  ) {
    this.width = width;
    this.height = height;
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;
  }
}

class CropImage {
  app: HTMLDivElement; // 存放 canvas div
  img: HTMLImageElement;
  canvas: HTMLCanvasElement; // canvas
  ctx: CanvasRenderingContext2D; // canvas content
  strokeStyle: string = "#999";
  ratio: number = 1;
  backgroundColor = "#FFF";
  cropRectangle: CropRectangle;
  moving: boolean = false;
  resizing: boolean = false;
  resizeDir: IResizeDir = "";
  startMovePos: IPosition = { x: 0, y: 0 };
  /** canvas width if not will init to image width */
  width?: number;
  /** canvas height if not will init to iamge height */
  height?: number;
  padding: number = 0;
  imageSize = new ImageSize();
  constructor(id: string, src: string, option?: IOption) {
    this.app = document.querySelector<HTMLDivElement>(id)!;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    if (option) {
      // @ts-ignore
      Object.entries(option).forEach(([key, value]) => (this[key] = value));
    }
    this.img = new Image();
    this.cropRectangle = new CropRectangle(0, 0, 0, 0);
    this.init(src);
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mousedown", this.startMouse.bind(this));
    this.canvas.addEventListener("mousemove", this.moveMouse.bind(this));
    this.canvas.addEventListener("mouseup", this.endMouse.bind(this));
  }
  renderBorder(top: number, left: number, width: number, height: number) {
    this.ctx.strokeStyle = this.strokeStyle;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([3]);
    let x = left;
    let y = top;
    this.ctx.clearRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);
    const sizeControlPoints = [
      new SizeControlPoint(x, y, this.ctx),
      new SizeControlPoint(x + width, y, this.ctx),
      new SizeControlPoint(x + width, y + height, this.ctx),
      new SizeControlPoint(x, y + height, this.ctx),
    ];
    sizeControlPoints.forEach((point) => point.render());
  }
  drawCover(width: number, height: number) {
    this.ctx.fillStyle = "rgba(0,0,0,0.5)";
    this.ctx.fillRect(0, 0, width, height);
  }
  moveInside() {
    let { left, top, width, height } = this.cropRectangle;
    let { virtualWidth, virtualHeight } = this.imageSize;
    let leftPadding = this.canvas.width / 2 - virtualWidth / 2;
    let topPadding = this.canvas.height / 2 - virtualHeight / 2;
    if (left < leftPadding) {
      this.cropRectangle.left = leftPadding;
    }
    if (top < topPadding) {
      this.cropRectangle.top = topPadding;
    }
    if (left + width > leftPadding + virtualWidth) {
      this.cropRectangle.left = leftPadding + virtualWidth - width;
    }
    if (top + height > topPadding + virtualHeight) {
      this.cropRectangle.top = topPadding + virtualHeight - height;
    }
  }
  startMouse(e: MouseEvent) {
    this.startMovePos = { x: e.clientX, y: e.clientY };
    let cursor = this.canvas.style.cursor;
    if (cursor === "move") {
      this.moving = true;
    } else if (cursor === neswResize || cursor === nwseResize) {
      this.resizing = true;
    }
  }
  moveMouse(e: MouseEvent) {
    const { clientX, clientY } = e;
    const move_x = clientX - this.startMovePos.x;
    const move_y = clientY - this.startMovePos.y;
    if (this.moving) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.top += move_y;
      this.moveInside();
      this.render();
    } else if (this.resizing) {
      this.resize(move_x);
    }
    this.startMovePos.x += move_x;
    this.startMovePos.y += move_y;
  }
  endMouse() {
    this.moving = false;
    this.resizing = false;
  }
  handleMouseMove(e: MouseEvent) {
    const { clientX, clientY } = e;
    const { left, top } = this.canvas.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    let {
      left: crop_left,
      top: crop_top,
      width: crop_width,
      height: crop_height,
    } = this.cropRectangle;
    if (!this.resizing) {
      if (
        x > crop_left &&
        x < crop_left + crop_width &&
        y > crop_top &&
        y < crop_top + crop_height
      ) {
        this.canvas.style.cursor = "move";
      } else {
        this.canvas.style.cursor = "default";
      }
    }
    if (Math.abs(x - crop_left) * Math.abs(y - crop_top) < radius) {
      this.canvas.style.cursor = nwseResize;
      this.resizeDir = ResizeDir.TOP_LEFR;
    } else if (
      Math.abs(x - (crop_left + crop_width)) *
        Math.abs(y - (crop_top + crop_height)) <
      radius
    ) {
      this.canvas.style.cursor = nwseResize;
      this.resizeDir = ResizeDir.BOTTOM_RIGHT;
    } else if (
      Math.abs(x - (crop_left + crop_width)) * Math.abs(y - crop_top) <
      radius
    ) {
      this.canvas.style.cursor = neswResize;
      this.resizeDir = ResizeDir.TOP_RIGHT;
    } else if (
      Math.abs(x - crop_left) * Math.abs(y - (crop_top + crop_height)) <
      radius
    ) {
      this.canvas.style.cursor = neswResize;
      this.resizeDir = ResizeDir.BOTTOM_LEFT;
    }
  }
  canResize(dir: IResizeDir, move: number): boolean {
    const { width, height, min } = this.cropRectangle;
    if (
      (dir === ResizeDir.TOP_LEFR || dir === ResizeDir.BOTTOM_LEFT) &&
      width - move > min &&
      height - move > min
    ) {
      return true;
    } else if (
      (dir === ResizeDir.TOP_RIGHT || dir === ResizeDir.BOTTOM_RIGHT) &&
      width + move > min &&
      height + move > min
    ) {
      return true;
    }
    return false;
  }
  resize(move_x: number) {
    if (!this.canResize(this.resizeDir, move_x)) return;
    if (this.resizeDir === ResizeDir.TOP_LEFR) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.top += move_x;
      this.cropRectangle.width -= move_x;
      this.cropRectangle.height -= move_x;
    } else if (this.resizeDir === ResizeDir.TOP_RIGHT) {
      this.cropRectangle.top -= move_x;
      this.cropRectangle.width += move_x;
      this.cropRectangle.height += move_x;
    } else if (this.resizeDir === ResizeDir.BOTTOM_RIGHT) {
      this.cropRectangle.width += move_x;
      this.cropRectangle.height += move_x;
    } else if (this.resizeDir === ResizeDir.BOTTOM_LEFT) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.width -= move_x;
      this.cropRectangle.height -= move_x;
    }
    this.render();
  }
  render = () => {
    requestAnimationFrame(this.render);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawCover(this.canvas.width, this.canvas.height);
    this.renderBorder(
      this.cropRectangle.top,
      this.cropRectangle.left,
      this.cropRectangle.width,
      this.cropRectangle.height
    );
    this.ctx.globalCompositeOperation = "destination-over";
    this.ctx.drawImage(
      this.img,
      this.canvas.width / 2 - this.imageSize.virtualWidth / 2,
      this.canvas.height / 2 - this.imageSize.virtualHeight / 2,
      this.imageSize.virtualWidth,
      this.imageSize.virtualHeight
    );
  };
  /**
   *  init canvas width and height, init image, init crop rectangle
   * @param src 图片地址
   */
  init(src: string) {
    const img = new Image();
    img.onload = () => {
      this.img = img;
      let width = img.width;
      let height = img.height;
      this.canvas.width = (this.width || width) + this.padding * 2;
      this.canvas.height = (this.height || height) + this.padding * 2;
      this.initImageSize(this.canvas.width, this.canvas.height, width, height);
      this.app.appendChild(this.canvas);
      requestAnimationFrame(this.render);
    };
    img.src = src;
  }
  /**
   * calc the crop rectangle and image position and size
   * @param cw canvas width
   * @param ch canvas height
   * @param iw image width
   * @param ih image height
   */
  initImageSize(cw: number, ch: number, iw: number, ih: number) {
    let ratio = this.ratio;
    cw = cw - this.padding * 2;
    ch = ch - this.padding * 2;
    if (cw < iw || ch < ih) {
      if (cw / ch < iw / ih) {
        this.imageSize = new ImageSize(iw, ih, cw, (cw * ih) / iw);
      } else {
        this.imageSize = new ImageSize(iw, ih, (iw * ch) / ih, ch);
      }
    } else {
      this.imageSize = new ImageSize(iw, ih, iw, ih);
    }
    let width = this.imageSize.virtualWidth;
    let height = this.imageSize.virtualHeight;
    let crop_width = width <= height * ratio ? width : height * ratio; // 图片裁剪宽度
    let crop_height = width <= height * ratio ? width / ratio : height; // 图片裁剪高度
    this.cropRectangle = new CropRectangle(
      (cw - crop_width + this.padding * 2) / 2,
      (ch - crop_height + this.padding * 2) / 2,
      crop_width,
      crop_height
    );
  }
}
let inputDom = document.querySelector<HTMLInputElement>("#image")!;
inputDom.onchange = (e: any) => {
  const file = e.target.files![0];
  const reader = new FileReader();
  reader.onload = () => {
    new CropImage("#canvas", reader.result as string, {
      width: 1020,
      height: 540,
      padding: 40,
    });
  };
  reader.readAsDataURL(file);
};
