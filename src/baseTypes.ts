export type RawClip = {
  id: string,
  title: string,
  metadata: {
    concat_history?: [
      // First item is the original clip that is being extended/inpainted/etc.
      {
        id: string,
        type: string,
      },
      // Second item is the clip that is extending/inpainting/etc. the original clip.
      {
        id: string,
      }
    ]
  },
};