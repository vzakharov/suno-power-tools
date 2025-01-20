import { tag as createTag } from './dom.ts';
import { TAGS } from './types.ts';

// Note: the below doesn't allow tree-shaking, but it's better than spelling out each tag factory export manually (especially because TypeScript doesn't allow inferring all overloads of a function, which we would need for e.g. `a` to be inferred the same as `tag('a')`)
export const {
  a, abbr, address, area, article, aside, audio, b, base, bdi, bdo, blockquote, body, br, button, canvas, caption, cite, code, col, colgroup, data, datalist, dd, del, details, dfn, dialog, div, dl, dt, em, embed, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, head, header, hgroup, hr, html, i, iframe, img, input, ins, kbd, label, legend, li, link, main, map, mark, menu, meta, meter, nav, noscript, object: $object, ol, optgroup, option, output, p, picture, pre, progress, q, rp, rt, ruby, s, samp, script, search, section, select, slot, small, source, span, strong, style, sub, summary, sup, table, tbody, td, template, textarea, tfoot, th, thead, time, title, tr, track, u, ul, var: $var, video, wbr
} = TAGS.reduce((tags, tag) => {
  tags[tag as any] = createTag(tag);
  return tags;
}, {} as {
  [T in typeof TAGS[number]]: ReturnType<typeof createTag<T>>
});