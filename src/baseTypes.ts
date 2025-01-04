export type RawClip = {
  is_missing?: boolean,
  id: string,
  title: string,
  audio_url: string,
  image_url: string,
  metadata: {
    tags: string,
  } & ClipHierarchyMetadata,
};

export type MissingClip = RawClip & {
  is_missing: true,
};

export type ClipHierarchyMetadata = (
  // An extended/inpainted/etc. clip
  {
    history: [
      {
        id: string;
        type: string;
      }
    ];
  }
  // Concatenation of said extended/inpainted/etc. clip
  | {
    concat_history: [
      // First item is the original clip that is being extended/inpainted/etc.
      {
        id: string;
        type: string;
      },
      // Second item is the clip that is extending/inpainting/etc. the original clip.
      {
        id: string;
      }
    ];
  }
  // A cover clip
  | {
    cover_clip_id: string;
  }
  // An upsampled (remastered) clip
  | {
    upsample_clip_id: string;
  }
  // Crop of a clip
  | {
    type: 'edit_crop';
  })
  // Any other clip
  | {};