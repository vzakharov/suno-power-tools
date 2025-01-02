import { Clip } from "./types";

function dummyMethod(...args: any[]) {
  throw new Error("This is a dummy method. Have you done the steps outlined in the repository’s README? Please make sure you do so before running this code.");
}

const dummySuno = {
  root: {
    clips: {
      loadClipById: dummyMethod as (id: string) => Promise<Clip>,
    }
  }
};

export type SunoManager = typeof dummySuno;

export function getSuno() {
  if ('suno' in window) {
    return window.suno as SunoManager;
  };
  throw new Error("Suno manager not found in window object. Make sure you have followed the steps outlined in the repository’s README.");
}