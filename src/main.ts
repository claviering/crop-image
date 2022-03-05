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
  constructor() {}
}

class CropImage {
  app: HTMLDivElement; // 存放 canvas div
  src: string = ""; // image src
  canvas: HTMLCanvasElement; // canvas
  ctx: CanvasRenderingContext2D; // canvas content
  strokeStyle: string = "#999";
  ratio: number = 1;
  backgroundColor = "#FFF";
  cropRectangle: CropRectangle = new CropRectangle();
  moving: boolean = false;
  resizing: boolean = false;
  resizeDir: IResizeDir = "";
  startMovePos: IPosition = { x: 0, y: 0 };
  constructor(id: string, src: string, option?: IOption) {
    this.src = src;
    this.app = document.querySelector<HTMLDivElement>(id)!;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    if (option) {
      // @ts-ignore
      Object.entries(option).forEach(([key, value]) => (this[key] = value));
    }
    this.render(src);
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mousedown", this.startMouse.bind(this));
    this.canvas.addEventListener("mousemove", this.moveMouse.bind(this));
    this.canvas.addEventListener("mouseup", this.endMouse.bind(this));
  }
  renderBorder() {
    this.ctx.strokeStyle = this.strokeStyle;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([3]);
    let x = this.cropRectangle.left;
    let y = this.cropRectangle.top;
    let width = this.cropRectangle.width;
    let height = this.cropRectangle.height;
    this.ctx.clearRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);
    const sizeControlPoints = [
      new SizeControlPoint(x, y, nwseResize, this.ctx),
      new SizeControlPoint(x + width, y, neswResize, this.ctx),
      new SizeControlPoint(x + width, y + height, nwseResize, this.ctx),
      new SizeControlPoint(x, y + height, neswResize, this.ctx),
    ];
    sizeControlPoints.forEach((point) => point.render());
  }
  drawCover() {
    this.ctx.fillStyle = "rgba(0,0,0,0.5)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
        this.render(this.src, move_x, move_y);
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
      this.render(this.src, resize_move, resize_move);
    });
  }
  /**
   *
   * @param src 图片地址
   * @param x 裁剪选区开始的 x 坐标
   * @param y 裁剪选区开始的 y 坐标
   */
  render(src: string, x: number = 0, y: number = 0) {
    const img = new Image();
    img.onload = () => {
      const canvas = this.canvas;
      let ratio = this.ratio;
      let width = img.width;
      let height = img.height;
      canvas.width = width;
      canvas.height = height;
      let crop_width = width <= height * ratio ? width : height * ratio; // 图片裁剪宽度
      let crop_height = width <= height * ratio ? width / ratio : height; // 图片裁剪高度
      if (!this.cropRectangle.startResizeWidth) {
        this.cropRectangle.width = crop_width;
        this.cropRectangle.height = crop_height;
        this.cropRectangle.startResizeWidth = crop_width;
        this.cropRectangle.startResizeHeight = crop_height;
      }
      this.ctx.clearRect(x, y, width, height);
      this.drawCover();
      this.renderBorder();
      this.ctx.globalCompositeOperation = "destination-over";
      this.ctx.drawImage(img, 0, 0);
      this.app.innerHTML = "";
      this.app.appendChild(canvas);
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
