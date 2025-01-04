import { RawClip } from "./baseTypes";
import { $throw } from "./utils";

//! Background info: For some unknown reason, Suno doesn't keep the data bout the original clip when you crop it.
//! To work around this, whenever we find a cropped clip, we find the first clip that:
//! - Is earlier than the cropped clip
//! - Has the same genre as the cropped clip
//! - Has the same image as the cropped clip
//! This last part is especially tricky because Suno stores the images as URLs, and the URLs are different for the same image. Moreover, even the images themselves are different because they are compressed at different times, and as JPEG is a lossy format, the images are not pixel-perfect.
//! (Imagine all the pains we have to go through just because someone (Suno team, I'm looking at you) didn't think it was important to keep the data about the original clip when cropping it!)
export async function findCropBaseClipId(croppedClip: RawClip, clips: RawClip[]): Promise<string | undefined> {
  return clips.slice(clips.findIndex(clip => clip.id === croppedClip.id) + 1).find(clip => {
    return clip !== croppedClip && clip.metadata.tags === croppedClip.metadata.tags && areImagesEqual(clip.image_url, croppedClip.image_url);
  })?.id;
};

export async function loadImage(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);  // Clean up after loading
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

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
  console.log({ url1, url2, avgDiff });
  canvas.remove();
  return avgDiff < 32;
  //! (This is a very naive implementation; a more sophisticated one would involve comparing the images in the frequency domain, but that's a bit too much for this project)
};