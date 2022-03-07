import "./style.css";
import { SizeControlPoint, radius } from "./SizeControlPoint";
import { CursorType } from "./CursorType";
const { neswResize, nwseResize } = CursorType;

type IResizeDir =
  | ""
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface IOption {
  /** 存放 canvas div id */
  id: string;
  /** input id */
  inputId: string;
  /** 边框颜色 */
  strokeStyle?: string;
  /** 裁剪比例 */
  ratio?: number;
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
  startPosLeft: number = 0;
  startPosTop: number = 0;
  startResizeWidth: number = 0;
  startResizeHeight: number = 0;
  constructor(left: number, top: number, width: number, height: number) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
    this.startPosLeft = left;
    this.startPosTop = top;
    this.startResizeWidth = width;
    this.startResizeHeight = height;
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
      this.cropRectangle.left = this.cropRectangle.startPosLeft + move_x;
      this.cropRectangle.top = this.cropRectangle.startPosTop + move_y;
      requestAnimationFrame(() => {
        this.render();
      });
    } else if (this.resizing) {
      this.resize(move_x);
    }
  }
  endMouse() {
    if (this.resizing && this.resizeDir === "top-left") {
      let move = this.cropRectangle.left - this.cropRectangle.startPosLeft;
      this.cropRectangle.startResizeWidth -= move;
      this.cropRectangle.startResizeHeight -= move;
    } else if (this.resizing && this.resizeDir === "top-right") {
      let move = this.cropRectangle.top - this.cropRectangle.startPosTop;
      this.cropRectangle.startResizeWidth -= move;
      this.cropRectangle.startResizeHeight -= move;
    } else if (this.resizing && this.resizeDir === "bottom-right") {
      this.cropRectangle.startResizeWidth = this.cropRectangle.width;
      this.cropRectangle.startResizeHeight = this.cropRectangle.height;
    } else if (this.resizing && this.resizeDir === "bottom-left") {
      this.cropRectangle.startResizeWidth = this.cropRectangle.width;
      this.cropRectangle.startResizeHeight = this.cropRectangle.height;
    }
    this.cropRectangle.startPosLeft = this.cropRectangle.left;
    this.cropRectangle.startPosTop = this.cropRectangle.top;
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
      this.resizeDir = "top-left";
    } else if (
      Math.abs(x - (crop_left + crop_width)) *
        Math.abs(y - (crop_top + crop_height)) <
      radius
    ) {
      this.canvas.style.cursor = nwseResize;
      this.resizeDir = "bottom-right";
    } else if (
      Math.abs(x - (crop_left + crop_width)) * Math.abs(y - crop_top) <
      radius
    ) {
      this.canvas.style.cursor = neswResize;
      this.resizeDir = "top-right";
    } else if (
      Math.abs(x - crop_left) * Math.abs(y - (crop_top + crop_height)) <
      radius
    ) {
      this.canvas.style.cursor = neswResize;
      this.resizeDir = "bottom-left";
    }
  }
  resize(move_x: number) {
    let resize_move = move_x;
    if (this.resizeDir === "top-left") {
      this.cropRectangle.left = this.cropRectangle.startPosLeft + resize_move;
      this.cropRectangle.top = this.cropRectangle.startPosTop + resize_move;
      this.cropRectangle.width =
        this.cropRectangle.startResizeWidth - resize_move;
      this.cropRectangle.height =
        this.cropRectangle.startResizeHeight - resize_move;
    } else if (this.resizeDir === "top-right") {
      this.cropRectangle.top = this.cropRectangle.startPosTop - resize_move;
      this.cropRectangle.width =
        this.cropRectangle.startResizeWidth + resize_move;
      this.cropRectangle.height =
        this.cropRectangle.startResizeHeight + resize_move;
    } else if (this.resizeDir === "bottom-right") {
      this.cropRectangle.width =
        this.cropRectangle.startResizeWidth + resize_move;
      this.cropRectangle.height =
        this.cropRectangle.startResizeHeight + resize_move;
    } else if (this.resizeDir === "bottom-left") {
      this.cropRectangle.left = this.cropRectangle.startPosLeft + resize_move;
      this.cropRectangle.width =
        this.cropRectangle.startResizeWidth - resize_move;
      this.cropRectangle.height =
        this.cropRectangle.startResizeHeight - resize_move;
    }
    requestAnimationFrame(() => {
      this.render();
    });
  }
  render() {
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
    this.ctx.drawImage(this.img, 0, 0);
  }
  /**
   *  init canvas width and height, init image, init crop rectangle
   * @param src 图片地址
   */
  init(src: string) {
    const img = new Image();
    img.onload = () => {
      this.img = img;
      let ratio = this.ratio;
      let width = img.width;
      let height = img.height;
      this.canvas.width = width;
      this.canvas.height = height;
      let crop_width = width <= height * ratio ? width : height * ratio; // 图片裁剪宽度
      let crop_height = width <= height * ratio ? width / ratio : height; // 图片裁剪高度
      this.cropRectangle = new CropRectangle(0, 0, crop_width, crop_height);
      this.app.appendChild(this.canvas);
      this.render();
    };
    img.src = src;
  }
}
let inputDom = document.querySelector<HTMLInputElement>("#image")!;
inputDom.onchange = (e: any) => {
  const file = e.target.files![0];
  const reader = new FileReader();
  reader.onload = () => {
    new CropImage("#canvas", reader.result as string);
  };
  reader.readAsDataURL(file);
};
