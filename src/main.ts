import "./style.css";
import { CropImage, IData, CropRectangle } from "../lib";

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

let cacheData = {} as {
  [key: string]: IData;
};
function setCacheData(ratio: string, data: IData) {
  cacheData[ratio] = data;
}

let inputDom = document.querySelector<HTMLInputElement>("#image")!;
inputDom.onchange = (e: any) => {
  const file = e.target.files![0];
  const reader = new FileReader();
  reader.onload = () => {
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
      let cropOprt = document.querySelector(".crop-oper");
      if (cropOprt) {
        cropOprt.classList.add("active-235");
        cropOprt.classList.remove("active-1");
      }
      setZoomPrototype(imageDom, data);
      setCacheData(String(crop.ratio), data);
      crop.ratio = 2.35;
      crop.initImageSize();
      setZoomPrototype(image235Dom, crop.getIData());
      setCacheData(String(crop.ratio), crop.getIData());
    };
    crop.onMove = (data: IData) => {
      if (crop.ratio === 1) {
        setZoomPrototype(imageDom, data);
      } else if (crop.ratio === 2.35) {
        setZoomPrototype(image235Dom, data);
      }
      cacheCropPos(crop, data);
      setCacheData(String(crop.ratio), data);
    };
    crop.onReize = (data: IData) => {
      if (crop.ratio === 1) {
        setZoomPrototype(imageDom, data);
      } else if (crop.ratio === 2.35) {
        setZoomPrototype(image235Dom, data);
      }
      cacheCropPos(crop, data);
      setCacheData(String(crop.ratio), data);
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
      if (ratio === 1) {
        e.currentTarget.classList.add("active-1");
        e.currentTarget.classList.remove("active-235");
      } else {
        e.currentTarget.classList.add("active-235");
        e.currentTarget.classList.remove("active-1");
      }
      crop.render();
    });
    let c2c = document.querySelector("#canvas-to-canvas")!;
    c2c.addEventListener("click", function () {
      crop.getCurrentBlob().then((blob) => {
        let imageDom = document.createElement("img") as HTMLImageElement;
        imageDom.src = URL.createObjectURL(blob);
        let imageContainer = document.querySelector("#crop-image-container-1")!;
        imageContainer.innerHTML = "";
        imageContainer.appendChild(imageDom);
      });
    });
  };
  reader.readAsDataURL(file);
};

let ratio0InputDom = document.querySelector<HTMLInputElement>("#ratio0")!;
ratio0InputDom.onchange = (e: any) => {
  const file = e.target.files![0];
  let crop = new CropImage("#canvas-ratio0", file, {
    width: 640,
    height: 460,
    padding: 40,
    ratio: 0,
  });
  document.querySelector("#ratio0-c2c")?.addEventListener("click", function () {
    crop.getCurrentBlob().then((blob) => {
      let imageDom = document.createElement("img") as HTMLImageElement;
      imageDom.src = URL.createObjectURL(blob);
      let imageContainer = document.querySelector("#crop-image-container-0")!;
      imageContainer.innerHTML = "";
      imageContainer.appendChild(imageDom);
    });
  });
};

let ratio2InputDom = document.querySelector<HTMLInputElement>("#ratio2")!;
ratio2InputDom.onchange = (e: any) => {
  const file = e.target.files![0];
  try {
    let crop = new CropImage("#canvas-ratio2", file, {
      width: 640,
      height: 460,
      padding: 40,
      ratio: 1,
      cropWidth: 200,
      cropHeight: 200,
    });
    document
      .querySelector("#ratio2-c2c")
      ?.addEventListener("click", function () {
        crop.getCurrentBlob().then((blob) => {
          let imageDom = document.createElement("img") as HTMLImageElement;
          imageDom.src = URL.createObjectURL(blob);
          let imageContainer = document.querySelector(
            "#crop-image-container-2"
          )!;
          imageContainer.innerHTML = "";
          imageContainer.appendChild(imageDom);
        });
      });
  } catch (error) {
    console.log("1111", error);
  }
};

let ratio3InputDom = document.querySelector<HTMLInputElement>("#ratio3")!;
ratio3InputDom.onchange = (e: any) => {
  const file = e.target.files![0];
  let crop = new CropImage("#canvas-ratio3", file, {
    width: 640,
    height: 460,
    padding: 40,
    ratio: 1,
  });
  document.querySelector("#ratio3-c2c")?.addEventListener("click", function () {
    crop.getCurrentBlob(500, 500).then((blob) => {
      let imageDom = document.createElement("img") as HTMLImageElement;
      imageDom.src = URL.createObjectURL(blob);
      let imageContainer = document.querySelector("#crop-image-container-3")!;
      imageContainer.innerHTML = "";
      imageContainer.appendChild(imageDom);

      // imageDom.onload = () => {
      //   const newCanvas = document.createElement("canvas");
      //   newCanvas.width = 500;
      //   newCanvas.height = 500;
      //   const ctx = newCanvas.getContext("2d");
      //   ctx?.drawImage(imageDom, 0, 0, 500, 500);
      //   let imageContainer = document.querySelector("#crop-image-container-3")!;
      //   imageContainer.innerHTML = "";
      //   imageContainer.appendChild(newCanvas);
      // };
      // imageDom.src = URL.createObjectURL(blob);
    });
  });
};
