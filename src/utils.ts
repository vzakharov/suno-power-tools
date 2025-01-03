import { SunoManager } from "./manager";

export function mutate<T extends {}, U extends {}>(obj: T, partial: U): asserts obj is T & U {
  Object.assign(obj, partial);
};

let lastCalled = 0;

export function atLeast(milliseconds: number): Promise<void> {
  const timeToWait = Math.max(0, milliseconds - (Date.now() - lastCalled));
  return new Promise((resolve) => {
    setTimeout(() => {
      lastCalled = Date.now();
      resolve();
    }, timeToWait);
  });
};

export function $throw(message: string): never {
  throw new Error(message);
};

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export async function areImagesEqual(url1: string, url2: string): Promise<boolean> {
  const img1 = await loadImage(url1);
  const img2 = await loadImage(url2);
  // We need to make a pixelwise difference comparison (because JPEGs are lossy) and figure out if the average difference is below a certain threshold
  const canvas = document.createElement('canvas');
  canvas.width = img1.width;
  canvas.height = img1.height;
  const ctx = canvas.getContext('2d') ?? $throw('Canvas 2D context not supported');
  ctx.drawImage(img1, 0, 0);
  const img1Data = ctx.getImageData(0, 0, img1.width, img1.height);
  ctx.drawImage(img2, 0, 0);
  const img2Data = ctx.getImageData(0, 0, img2.width, img2.height);
  const data1 = img1Data.data;
  const data2 = img2Data.data;
  const len = data1.length;
  let diff = 0;
  for ( let i = 0; i < len; i += 4 ) {
    for ( let j = 0; j < 3; j++ ) {
      diff += Math.abs(data1[i + j] - data2[i + j]);
    }
  };
  const avgDiff = diff / (len / 4);
  return avgDiff < 10;
};