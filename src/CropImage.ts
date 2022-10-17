import { SizeControlPoint, radius } from "./sizeControlPoint";
import { CursorType } from "./cursorType";
const { neswResize, nwseResize, nsResize, ewResize } = CursorType;

export interface IData {
  /** crop left */
  left: number;
  /** crop top */
  top: number;
  virtalCropWidth: number;
  virtalCropHeight: number;
  cropWidth: number;
  cropHeight: number;
  imageWidth: number;
  imageHeight: number;
  imageVirtalWidth: number;
  imageVirtalHeight: number;
}

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
  /**裁剪的固定宽度 */
  cropWidth?: number;
  /**裁剪的高定宽度 */
  cropHeight?: number;
}

interface IPosition {
  x: number;
  y: number;
}

export class CropRectangle {
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

function distance(x1: number, y1: number, x2: number, y2: number) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

enum ResizeDir {
  TOP_LEFR = "top-left",
  TOP_RIGHT = "top-right",
  BOTTOM_LEFT = "bottom-left",
  BOTTOM_RIGHT = "bottom-right",
  TOP_MIDDLE = "top-middle",
  BOTTOM_MIDDLE = "bottom-middle",
  LEFT_MIDDLE = "left-middle",
  RIGHT_MIDDLE = "right-middle",
}

type IResizeDir =
  | ""
  | "right-middle"
  | "left-middle"
  | "bottom-middle"
  | "top-middle"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

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

export class CropImage {
  app: HTMLDivElement; // 存放 canvas div
  img: HTMLImageElement;
  private canvas: HTMLCanvasElement; // canvas
  private ctx: CanvasRenderingContext2D; // canvas content
  private imgCanvas: HTMLCanvasElement; // canvas
  private imgCtx: CanvasRenderingContext2D; // canvas content
  private strokeStyle: string = "#999";
  ratio: number = 0;
  cropRectangle: CropRectangle;
  private moving: boolean = false;
  private resizing: boolean = false;
  private resizeDir: IResizeDir = "";
  private startMovePos: IPosition = { x: 0, y: 0 };
  /** canvas width if not will init to image width */
  private width?: number;
  /** canvas height if not will init to iamge height */
  private height?: number;
  private padding: number = 0;
  private imageSize = new ImageSize();
  /**裁剪的固定宽度 */
  private cropWidth?: number;
  /**裁剪的高定宽度 */
  private cropHeight?: number;
  onReize: (data: IData) => void = () => {};
  onMove: (data: IData) => void = () => {};
  created: (data: IData) => void = () => {};
  constructor(id: string | Element, src: string | File, option?: IOption) {
    this.app =
      typeof id == "string"
        ? document.querySelector<HTMLDivElement>(id)!
        : (id as HTMLDivElement);
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.imgCanvas = document.createElement("canvas");
    this.imgCtx = this.imgCanvas.getContext("2d") as CanvasRenderingContext2D;
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
  private renderBorder(
    top: number,
    left: number,
    width: number,
    height: number
  ) {
    this.ctx.strokeStyle = this.strokeStyle;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([3]);
    let x = left;
    let y = top;
    this.ctx.clearRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);
    let sizeControlPoints = [
      new SizeControlPoint(x, y, this.ctx),
      new SizeControlPoint(x + width, y, this.ctx),
      new SizeControlPoint(x + width, y + height, this.ctx),
      new SizeControlPoint(x, y + height, this.ctx),
    ];
    // 任意裁剪，添加上下左右中心4个点
    if (this.ratio <= 0) {
      const appendSizeControlPoint = [
        new SizeControlPoint(x + width / 2, y, this.ctx),
        new SizeControlPoint(x + width, y + height / 2, this.ctx),
        new SizeControlPoint(x + width / 2, y + height, this.ctx),
        new SizeControlPoint(x, y + height / 2, this.ctx),
      ];
      sizeControlPoints = sizeControlPoints.concat(appendSizeControlPoint);
    }
    if (!this.isKeepCropSize()) {
      sizeControlPoints.forEach((point) => point.render());
    }
  }
  private drawCover(width: number, height: number) {
    this.ctx.fillStyle = "rgba(0,0,0,0.4)";
    this.ctx.fillRect(0, 0, width, height);
  }
  private moveInside() {
    let { left, top, width, height } = this.cropRectangle;
    let { virtualWidth, virtualHeight } = this.imageSize;
    let [paddingLeft, paddingTop] = this.getPadding();
    if (left < paddingLeft) {
      this.cropRectangle.left = paddingLeft;
    }
    if (top < paddingTop) {
      this.cropRectangle.top = paddingTop;
    }
    if (left + width > paddingLeft + virtualWidth) {
      this.cropRectangle.left = paddingLeft + virtualWidth - width;
    }
    if (top + height > paddingTop + virtualHeight) {
      this.cropRectangle.top = paddingTop + virtualHeight - height;
    }
  }
  private startMouse(e: MouseEvent) {
    this.startMovePos = { x: e.clientX, y: e.clientY };
    let cursor = this.canvas.style.cursor as CursorType;
    if (cursor === "move") {
      this.moving = true;
    } else if ([neswResize, nwseResize, nsResize, ewResize].includes(cursor)) {
      this.resizing = true;
    }
  }
  private moveMouse(e: MouseEvent) {
    const { clientX, clientY } = e;
    const move_x = clientX - this.startMovePos.x;
    const move_y = clientY - this.startMovePos.y;
    if (this.moving) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.top += move_y;
      this.moveInside();
      this.render();
      this.handleOnChange("move");
    } else if (this.resizing) {
      this.resize(move_x, move_y);
      this.render();
      this.handleOnChange("resize");
    }
    this.startMovePos.x += move_x;
    this.startMovePos.y += move_y;
  }
  getIData(): IData {
    let leftPadding = this.canvas.width / 2 - this.imageSize.virtualWidth / 2;
    let topPadding = this.canvas.height / 2 - this.imageSize.virtualHeight / 2;
    const { left, top, width: cw, height: ch } = this.cropRectangle;
    const {
      width: iw,
      height: ih,
      virtualWidth,
      virtualHeight,
    } = this.imageSize;
    let data: IData = {
      left: left - leftPadding,
      top: top - topPadding,
      virtalCropWidth: cw,
      virtalCropHeight: ch,
      cropWidth: (iw * cw) / virtualWidth,
      cropHeight: (ih * ch) / virtualHeight,
      imageWidth: iw,
      imageHeight: ih,
      imageVirtalWidth: virtualWidth,
      imageVirtalHeight: virtualHeight,
    };
    return data;
  }
  handleOnChange(type: string) {
    let data: IData = this.getIData();
    switch (type) {
      case "move":
        this.onMove(data);
        break;
      case "resize":
        this.onReize(data);
        break;
    }
  }
  private endMouse() {
    this.moving = false;
    this.resizing = false;
  }
  private handleMouseMove(e: MouseEvent) {
    const { clientX, clientY } = e;
    const { left, top } = this.canvas.getBoundingClientRect();
    const x = clientX - left; // from image top-left
    const y = clientY - top; // from image top-left
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
    if (this.isKeepCropSize()) return;
    let radiusSqrt = radius * radius;
    let x2 = crop_left + crop_width;
    let y2 = crop_top + crop_height;
    function isInside(x0: number, y0: number) {
      return distance(x0, y0, x, y) < radiusSqrt;
    }
    let isAnyRatio = this.ratio <= 0;
    if (isInside(crop_left, crop_top)) {
      this.canvas.style.cursor = nwseResize;
      this.resizeDir = ResizeDir.TOP_LEFR;
    } else if (isInside(x2, y2)) {
      this.canvas.style.cursor = nwseResize;
      this.resizeDir = ResizeDir.BOTTOM_RIGHT;
    } else if (isInside(x2, crop_top)) {
      this.canvas.style.cursor = neswResize;
      this.resizeDir = ResizeDir.TOP_RIGHT;
    } else if (isInside(crop_left, y2)) {
      this.canvas.style.cursor = neswResize;
      this.resizeDir = ResizeDir.BOTTOM_LEFT;
    } else if (isAnyRatio && isInside(crop_left + crop_width / 2, crop_top)) {
      this.canvas.style.cursor = nsResize;
      this.resizeDir = ResizeDir.TOP_MIDDLE;
    } else if (isAnyRatio && isInside(crop_left + crop_width / 2, y2)) {
      this.canvas.style.cursor = nsResize;
      this.resizeDir = ResizeDir.BOTTOM_MIDDLE;
    } else if (isAnyRatio && isInside(crop_left, crop_top + crop_height / 2)) {
      this.canvas.style.cursor = ewResize;
      this.resizeDir = ResizeDir.LEFT_MIDDLE;
    } else if (isAnyRatio && isInside(x2, crop_top + crop_height / 2)) {
      this.canvas.style.cursor = ewResize;
      this.resizeDir = ResizeDir.RIGHT_MIDDLE;
    }
  }
  getPadding() {
    const { virtualWidth, virtualHeight } = this.imageSize;
    let paddingLeft = this.canvas.width / 2 - virtualWidth / 2;
    let paddingTop = this.canvas.height / 2 - virtualHeight / 2;
    return [paddingLeft, paddingTop];
  }
  private canZoomIn(dir: IResizeDir, move: number, move_y: number): boolean {
    const { left, top, width, height } = this.cropRectangle;
    const { virtualWidth, virtualHeight } = this.imageSize;
    let [paddingLeft, paddingTop] = this.getPadding();
    if (
      dir === ResizeDir.TOP_LEFR &&
      top + move > paddingTop &&
      left + move > paddingLeft
    ) {
      return true;
    } else if (
      dir === ResizeDir.BOTTOM_LEFT &&
      left + move > paddingLeft &&
      top - move + height < virtualHeight + paddingTop
    ) {
      return true;
    } else if (
      dir === ResizeDir.TOP_RIGHT &&
      left + move + width < virtualWidth + paddingLeft &&
      top - move > paddingTop
    ) {
      return true;
    } else if (
      dir === ResizeDir.BOTTOM_RIGHT &&
      top + move + height < virtualHeight + paddingTop &&
      left + move + width < virtualWidth + paddingLeft
    ) {
      return true;
    } else if (dir === ResizeDir.TOP_MIDDLE && top + move_y > paddingTop) {
      return true;
    } else if (
      dir === ResizeDir.BOTTOM_MIDDLE &&
      top + move_y + height < virtualHeight + paddingTop
    ) {
      return true;
    } else if (dir === ResizeDir.LEFT_MIDDLE && left + move > paddingLeft) {
      return true;
    } else if (
      dir === ResizeDir.RIGHT_MIDDLE &&
      left + move + width < virtualWidth + paddingLeft
    ) {
      return true;
    }
    return false;
  }
  private canZoomOut(dir: IResizeDir, move: number, move_y: number): boolean {
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
    } else if (
      (dir === ResizeDir.TOP_MIDDLE || dir === ResizeDir.BOTTOM_MIDDLE) &&
      height + move_y > min
    ) {
      return true;
    } else if (
      (dir === ResizeDir.LEFT_MIDDLE || dir === ResizeDir.RIGHT_MIDDLE) &&
      width + move > min
    ) {
      return true;
    }
    return false;
  }
  private resize(move_x: number, move_y: number) {
    if (
      !this.canZoomOut(this.resizeDir, move_x, move_y) ||
      !this.canZoomIn(this.resizeDir, move_x, move_y)
    )
      return;
    let ratio =
      this.ratio || this.cropRectangle.width / this.cropRectangle.height;
    if (this.resizeDir === ResizeDir.TOP_LEFR) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.top += move_x / ratio;
      this.cropRectangle.width -= move_x;
      this.cropRectangle.height -= move_x / ratio;
    } else if (this.resizeDir === ResizeDir.TOP_RIGHT) {
      this.cropRectangle.top -= move_x / ratio;
      this.cropRectangle.width += move_x;
      this.cropRectangle.height += move_x / ratio;
    } else if (this.resizeDir === ResizeDir.BOTTOM_RIGHT) {
      this.cropRectangle.width += move_x;
      this.cropRectangle.height += move_x / ratio;
    } else if (this.resizeDir === ResizeDir.BOTTOM_LEFT) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.width -= move_x;
      this.cropRectangle.height -= move_x / ratio;
    } else if (this.resizeDir === ResizeDir.TOP_MIDDLE) {
      this.cropRectangle.top += move_y;
      this.cropRectangle.height -= move_y;
    } else if (this.resizeDir === ResizeDir.BOTTOM_MIDDLE) {
      this.cropRectangle.height += move_y;
    } else if (this.resizeDir === ResizeDir.LEFT_MIDDLE) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.width -= move_x;
    } else if (this.resizeDir === ResizeDir.RIGHT_MIDDLE) {
      this.cropRectangle.width += move_x;
    }
  }
  private renderImageCanver() {
    this.imgCtx.drawImage(
      this.img,
      this.canvas.width / 2 - this.imageSize.virtualWidth / 2,
      this.canvas.height / 2 - this.imageSize.virtualHeight / 2,
      this.imageSize.virtualWidth,
      this.imageSize.virtualHeight
    );
  }
  render = () => {
    // requestAnimationFrame(this.render);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawCover(this.canvas.width, this.canvas.height);
    this.renderBorder(
      this.cropRectangle.top,
      this.cropRectangle.left,
      this.cropRectangle.width,
      this.cropRectangle.height
    );
  };
  /**
   *  init canvas width and height, init image, init crop rectangle
   * @param src 图片地址, or image file
   */
  private init(src: string | File) {
    let _src: string;
    if (src instanceof File) {
      _src = URL.createObjectURL(src);
    } else {
      _src = src;
    }
    const img = new Image();
    debugger;
    img.onload = () => {
      this.img = img;
      let width = img.width;
      let height = img.height;
      this.canvas.width = (this.width || width) + this.padding * 2;
      this.canvas.height = (this.height || height) + this.padding * 2;
      this.imgCanvas.width = this.canvas.width;
      this.imgCanvas.height = this.canvas.height;
      this.initImageSize();
      this.app.innerHTML = "";
      this.app.appendChild(this.imgCanvas);
      this.app.appendChild(this.canvas);
      this.renderImageCanver();
      requestAnimationFrame(this.render);
      this.created(this.getIData());
    };
    img.onerror = function () {
      throw "image load error";
    };
    img.src = _src;
  }
  isKeepCropSize(): boolean {
    let width = this.imageSize.virtualWidth;
    let height = this.imageSize.virtualHeight;
    if (this.cropWidth && this.cropHeight) {
      if (this.cropWidth > width || this.cropHeight > height) {
        throw "裁剪大小不能超过图片大小";
      }
      return true;
    }
    return false;
  }
  /**
   * calc the crop rectangle and image position and size
   * @param cw canvas width
   * @param ch canvas height
   * @param iw image width
   * @param ih image height
   */
  initImageSize() {
    let cw = this.canvas.width;
    let ch = this.canvas.height;
    let iw = this.img.width;
    let ih = this.img.height;
    let ratio = this.ratio || iw / ih;
    cw = cw - this.padding * 2;
    ch = ch - this.padding * 2;
    // zoom image
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
    if (this.isKeepCropSize()) {
      crop_width = this.cropWidth as number;
      crop_height = this.cropHeight as number;
    }
    this.initCrop({
      left: (cw - crop_width + this.padding * 2) / 2,
      top: (ch - crop_height + this.padding * 2) / 2,
      width: crop_width,
      height: crop_height,
      min: this.cropRectangle.min,
    });
  }
  initCrop(option: CropRectangle) {
    const { left, top, width, height } = option;
    this.cropRectangle = new CropRectangle(left, top, width, height);
  }
  getCurrentBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const newCanvas = document.createElement("canvas");
      const {
        cropWidth,
        cropHeight,
        virtalCropWidth,
        virtalCropHeight,
        top,
        left,
      } = this.getIData();
      newCanvas.width = cropWidth;
      newCanvas.height = cropHeight;
      let dx = (left * cropWidth) / virtalCropWidth;
      let dy = (top * cropHeight) / virtalCropHeight;
      const ctx = newCanvas.getContext("2d");
      ctx?.drawImage(this.img, -dx, -dy);
      newCanvas.toBlob((blob) => {
        blob ? resolve(blob) : reject("Error");
      }, "image/jpeg");
    });
  }
}
