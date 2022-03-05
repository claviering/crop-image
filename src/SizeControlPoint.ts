import { CursorType } from "./CursorType";

interface IBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface IRenderable {
  render: () => void;
}

export const radius: number = 5;
export class SizeControlPoint implements IBoundingBox, IRenderable {
  left: number;
  top: number;
  width = radius * 2;
  height = radius * 2;
  bordredColor: string = "#999";
  backgroundColor: string = "#fff";
  public static topLayerCursorType = CursorType.defaultCursor;
  constructor(
    private centerX: number,
    private centerY: number,
    public cursorType: CursorType,
    private ctx: CanvasRenderingContext2D
  ) {
    this.left = centerX - radius;
    this.top = centerY - radius;
  }
  render() {
    this.ctx.beginPath();
    this.ctx.setLineDash([]);
    this.ctx.arc(this.centerX, this.centerY, 5, 0, Math.PI * 2);
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fill();
    this.ctx.strokeStyle = this.bordredColor;
    this.ctx.stroke();
    this.ctx.closePath();
  }
}
