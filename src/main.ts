import "./style.css";

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
    console.log("x", x);
    let y = this.cropRectangle.top;
    let width = this.cropRectangle.width;
    let height = this.cropRectangle.height;
    this.ctx.clearRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);
    this.renderBorderCirclor(x, y);
    this.renderBorderCirclor(x + width, y);
    this.renderBorderCirclor(x + width, y + height);
    this.renderBorderCirclor(x, y + height);
  }
  drawCover() {
    this.ctx.fillStyle = "rgba(0,0,0,0.5)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  renderBorderCirclor(x: number, y: number) {
    this.ctx.beginPath();
    this.ctx.setLineDash([]);
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fill();
    this.ctx.strokeStyle = this.strokeStyle;
    this.ctx.stroke();
    this.ctx.closePath();
  }
  startMouse(e: MouseEvent) {
    this.moving = true;
    this.startMovePos = { x: e.clientX, y: e.clientY };
  }
  moveMouse(e: MouseEvent) {
    if (!this.moving) return;
    const { clientX, clientY } = e;
    const move_x = clientX - this.startMovePos.x;
    const move_y = clientY - this.startMovePos.y;
    this.cropRectangle.left = this.cropRectangle.startPosLeft + move_x;
    this.cropRectangle.top = this.cropRectangle.startPosTop + move_y;
    requestAnimationFrame(() => {
      this.render(this.src, move_x, move_y);
    });
  }
  endMouse() {
    this.cropRectangle.startPosLeft = this.cropRectangle.left;
    this.cropRectangle.startPosTop = this.cropRectangle.top;
    this.moving = false;
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
      this.cropRectangle.width = crop_width;
      this.cropRectangle.height = crop_height;
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
