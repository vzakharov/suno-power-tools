import { ColonyNode } from '../../scripts/colony';
import { div, a, img } from '../../smork/dom';

export function ClipCard({ id, image_url, name, tags }: ColonyNode) {
  return div({ class: 'relative' }, [
    a({ href: `https://suno.com/song/${id}`, target: '_blank' }, [
      img({ src: image_url, style: 'opacity: 0.5; width: 200px' }),
      div({ class: 'absolute topleft', style: 'width: 190px; padding: 5px' }, [
        div([name || '[Untitled]']),
        div({ class: 'smol' }, [
          tags || '(no style)'
        ])
      ])
    ])
  ]);
};
export type ClipCard = ReturnType<typeof ClipCard>;