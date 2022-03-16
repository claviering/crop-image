import "./style.css";
import { SizeControlPoint, radius } from "./SizeControlPoint";
import { CursorType } from "./CursorType";
const { neswResize, nwseResize } = CursorType;

function distance(x1: number, y1: number, x2: number, y2: number) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

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

interface IData {
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
  private img: HTMLImageElement;
  private canvas: HTMLCanvasElement; // canvas
  private ctx: CanvasRenderingContext2D; // canvas content
  private strokeStyle: string = "#999";
  ratio: number = 1;
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
  onReize: (data: IData) => void = () => {};
  onMove: (data: IData) => void = () => {};
  created: (data: IData) => void = () => {};
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
    const sizeControlPoints = [
      new SizeControlPoint(x, y, this.ctx),
      new SizeControlPoint(x + width, y, this.ctx),
      new SizeControlPoint(x + width, y + height, this.ctx),
      new SizeControlPoint(x, y + height, this.ctx),
    ];
    sizeControlPoints.forEach((point) => point.render());
  }
  private drawCover(width: number, height: number) {
    this.ctx.fillStyle = "rgba(0,0,0,0.5)";
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
    let cursor = this.canvas.style.cursor;
    if (cursor === "move") {
      this.moving = true;
    } else if (cursor === neswResize || cursor === nwseResize) {
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
      this.resize(move_x);
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
    let radiusSqrt = radius * radius;
    let x2 = crop_left + crop_width;
    let y2 = crop_top + crop_height;
    if (distance(crop_left, crop_top, x, y) < radiusSqrt) {
      this.canvas.style.cursor = nwseResize;
      this.resizeDir = ResizeDir.TOP_LEFR;
    } else if (distance(x2, y2, x, y) < radiusSqrt) {
      this.canvas.style.cursor = nwseResize;
      this.resizeDir = ResizeDir.BOTTOM_RIGHT;
    } else if (distance(x2, crop_top, x, y) < radiusSqrt) {
      this.canvas.style.cursor = neswResize;
      this.resizeDir = ResizeDir.TOP_RIGHT;
    } else if (distance(crop_left, y2, x, y) < radiusSqrt) {
      this.canvas.style.cursor = neswResize;
      this.resizeDir = ResizeDir.BOTTOM_LEFT;
    }
  }
  getPadding() {
    const { virtualWidth, virtualHeight } = this.imageSize;
    let paddingLeft = this.canvas.width / 2 - virtualWidth / 2;
    let paddingTop = this.canvas.height / 2 - virtualHeight / 2;
    return [paddingLeft, paddingTop];
  }
  private canZoomIn(dir: IResizeDir, move: number): boolean {
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
    }
    return false;
  }
  private canZoomOut(dir: IResizeDir, move: number): boolean {
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
  private resize(move_x: number) {
    if (
      !this.canZoomOut(this.resizeDir, move_x) ||
      !this.canZoomIn(this.resizeDir, move_x)
    )
      return;
    if (this.resizeDir === ResizeDir.TOP_LEFR) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.top += move_x / this.ratio;
      this.cropRectangle.width -= move_x;
      this.cropRectangle.height -= move_x / this.ratio;
    } else if (this.resizeDir === ResizeDir.TOP_RIGHT) {
      this.cropRectangle.top -= move_x / this.ratio;
      this.cropRectangle.width += move_x;
      this.cropRectangle.height += move_x / this.ratio;
    } else if (this.resizeDir === ResizeDir.BOTTOM_RIGHT) {
      this.cropRectangle.width += move_x;
      this.cropRectangle.height += move_x / this.ratio;
    } else if (this.resizeDir === ResizeDir.BOTTOM_LEFT) {
      this.cropRectangle.left += move_x;
      this.cropRectangle.width -= move_x;
      this.cropRectangle.height -= move_x / this.ratio;
    }
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
  private init(src: string) {
    const img = new Image();
    img.onload = () => {
      this.img = img;
      let width = img.width;
      let height = img.height;
      this.canvas.width = (this.width || width) + this.padding * 2;
      this.canvas.height = (this.height || height) + this.padding * 2;
      this.initImageSize();
      this.app.innerHTML = "";
      this.app.appendChild(this.canvas);
      requestAnimationFrame(this.render);
      this.created(this.getIData());
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
  initImageSize() {
    let cw = this.canvas.width;
    let ch = this.canvas.height;
    let iw = this.img.width;
    let ih = this.img.height;
    let ratio = this.ratio;
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
}

interface ICropPositionCash {
  [key: number]: CropRectangle;
}

function setZoomPrototype(dom: HTMLElement, data: IData): void {
  const {
    imageVirtalWidth,
    imageVirtalHeight,
    virtalCropWidth,
    virtalCropHeight,
    left,
    top,
  } = data;
  let width = dom.clientWidth;
  let height = dom.clientHeight;
  let zoomWidth = (width * imageVirtalWidth) / virtalCropWidth;
  let zoomHeight = (height * imageVirtalHeight) / virtalCropHeight;
  let zoomLeft = (left * zoomWidth) / imageVirtalWidth;
  let zoomTop = (top * zoomHeight) / imageVirtalHeight;
  dom.style.backgroundSize = `${zoomWidth}px ${zoomHeight}px`;
  dom.style.backgroundPosition = `-${zoomLeft}px -${zoomTop}px`;
}

let cropPositionCash: ICropPositionCash = {};
function cacheCropPos(crop: CropImage, data: IData): void {
  const { virtalCropWidth, virtalCropHeight, left, top } = data;
  let [paddingLeft, paddingTop] = crop.getPadding();
  cropPositionCash[crop.ratio] = {
    left: left + paddingLeft,
    top: top + paddingTop,
    width: virtalCropWidth,
    height: virtalCropHeight,
    min: crop.cropRectangle.min,
  };
}

let inputDom = document.querySelector<HTMLInputElement>("#image")!;
inputDom.onchange = (e: any) => {
  const file = e.target.files![0];
  const reader = new FileReader();
  reader.onload = () => {
    cropPositionCash = {};
    let crop = new CropImage("#canvas", reader.result as string, {
      width: 640,
      height: 460,
      padding: 40,
      ratio: 1,
    });
    let imageDom: HTMLDivElement = document.querySelector(".crop-image-1")!;
    let image235Dom: HTMLDivElement =
      document.querySelector(".crop-image-235")!;
    imageDom.style.backgroundImage = `url(${reader.result})`;
    image235Dom.style.backgroundImage = `url(${reader.result})`;
    crop.created = (data: IData) => {
      setZoomPrototype(imageDom, data);
      crop.ratio = 2.35;
      crop.initImageSize();
      setZoomPrototype(image235Dom, crop.getIData());
    };
    crop.onMove = (data: IData) => {
      if (crop.ratio === 1) {
        setZoomPrototype(imageDom, data);
      } else if (crop.ratio === 2.35) {
        setZoomPrototype(image235Dom, data);
      }
      cacheCropPos(crop, data);
    };
    crop.onReize = (data: IData) => {
      if (crop.ratio === 1) {
        setZoomPrototype(imageDom, data);
      } else if (crop.ratio === 2.35) {
        setZoomPrototype(image235Dom, data);
      }
      cacheCropPos(crop, data);
    };
    let cropOprt = document.querySelector(".crop-oper");
    cropOprt?.addEventListener("click", (e: any) => {
      let ratio = Number(e.target.dataset.ratio);
      if (Number.isNaN(ratio)) return;
      crop.ratio = ratio;
      if (cropPositionCash[ratio]) {
        crop.initCrop(cropPositionCash[ratio]);
      } else {
        crop.initImageSize();
      }
      crop.render();
    });
  };
  reader.readAsDataURL(file);
};
