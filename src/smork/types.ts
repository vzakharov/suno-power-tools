import { Func } from "../types";
import { Refable, Refables } from "./refs";

export type SmorkNode = HTMLElement | string | undefined;

export const TAGS = [ "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link", "main", "map", "mark", "menu", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "search", "section", "select", "slot", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr" ] as const;

export type Tag = typeof TAGS[number];

export type AnyAttribute = [
  'accept', 'accept-charset', 'accesskey', 'action', 'align', 'allow', 'allowfullscreen', 'alt', 'as', 'async', 'autocapitalize', 'autocomplete', 'autofocus', 'autoplay', 'bgcolor', 'border', 'capture', 'charset', 'checked', 'cite', 'class', 'color', 'cols', 'colspan', 'content', 'contenteditable', 'controls', 'coords', 'crossorigin', 'csp', 'data', 'datetime', 'decoding', 'default', 'defer', 'dir', 'dirname', 'disabled', 'download', 'draggable', 'enctype', 'for', 'form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'http-equiv', 'id', 'inert', 'inputmode', 'integrity', 'intrinsicsize', 'ismap', 'itemprop', 'keytype', 'kind', 'label', 'lang', 'language', 'list', 'loading', 'loop', 'low', 'manifest', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'muted', 'name', 'novalidate', 'open', 'optimum', 'pattern', 'ping', 'placeholder', 'playsinline', 'poster', 'preload', 'radiogroup', 'readonly', 'referrerpolicy', 'rel', 'required', 'reversed', 'role', 'rows', 'rowspan', 'sandbox', 'scope', 'selected', 'shape', 'size', 'sizes', 'slot', 'span', 'spellcheck', 'src', 'srcdoc', 'srclang', 'srcset', 'start', 'step', 'style', 'summary', 'tabindex', 'target', 'title', 'translate', 'type', 'usemap', 'value', 'width', 'wrap'
][number]

export type ElementForTag<T extends Tag> = T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : HTMLElement;

export type TagSpecificAttribute = {
  a: 'href' | 'hreflang' | 'ping' | 'rel' | 'target' | 'type' | 'download';
  area: 'alt' | 'coords' | 'shape' | 'href' | 'target' | 'download' | 'rel' | 'ping';
  base: 'href' | 'target';
  button: 'disabled' | 'form' | 'formaction' | 'formenctype' | 'formmethod' | 'formnovalidate' | 'formtarget' | 'name' | 'type' | 'value';
  canvas: 'height' | 'width';
  col: 'align' | 'bgcolor' | 'span';
  colgroup: 'align' | 'bgcolor' | 'span';
  details: 'open';
  dialog: 'open';
  embed: 'height' | 'width' | 'src' | 'type';
  fieldset: 'disabled' | 'form' | 'name';
  form: 'accept' | 'accept-charset' | 'action' | 'autocomplete' | 'enctype' | 'method' | 'name' | 'novalidate' | 'target';
  iframe: 'allow' | 'allowfullscreen' | 'csp' | 'height' | 'loading' | 'name' | 'referrerpolicy' | 'sandbox' | 'src' | 'srcdoc' | 'width';
  img: 'alt' | 'crossorigin' | 'decoding' | 'height' | 'intrinsicsize' | 'loading' | 'referrerpolicy' | 'sizes' | 'src' | 'srcset' | 'usemap' | 'width' | 'ismap';
  input: 'accept' | 'alt' | 'autocomplete' | 'autofocus' | 'checked' | 'dirname' | 'disabled' | 'form' | 'formaction' | 'formenctype' | 'formmethod' | 'formnovalidate' | 'formtarget' | 'height' | 'inputmode' | 'list' | 'max' | 'maxlength' | 'min' | 'minlength' | 'multiple' | 'name' | 'pattern' | 'placeholder' | 'readonly' | 'required' | 'size' | 'src' | 'step' | 'type' | 'value' | 'width' | 'capture';
  label: 'for' | 'form';
  link: 'as' | 'crossorigin' | 'href' | 'hreflang' | 'media' | 'referrerpolicy' | 'rel' | 'sizes' | 'type' | 'integrity';
  map: 'name';
  meta: 'charset' | 'content' | 'http-equiv' | 'name';
  meter: 'high' | 'low' | 'max' | 'min' | 'optimum' | 'value';
  object: 'data' | 'form' | 'height' | 'name' | 'type' | 'usemap' | 'width';
  ol: 'reversed' | 'start' | 'type';
  optgroup: 'disabled' | 'label';
  option: 'disabled' | 'label' | 'selected' | 'value';
  output: 'for' | 'form' | 'name';
  progress: 'max' | 'value';
  script: 'async' | 'defer' | 'src' | 'type' | 'integrity' | 'crossorigin' | 'language';
  select: 'autocomplete' | 'disabled' | 'form' | 'multiple' | 'name' | 'required' | 'size';
  source: 'media' | 'sizes' | 'src' | 'srcset' | 'type';
  style: 'media' | 'type';
  table: 'align' | 'bgcolor' | 'summary';
  tbody: 'align' | 'bgcolor';
  td: 'align' | 'bgcolor' | 'colspan' | 'headers' | 'rowspan';
  textarea: 'autocomplete' | 'cols' | 'dirname' | 'disabled' | 'form' | 'maxlength' | 'minlength' | 'name' | 'placeholder' | 'readonly' | 'required' | 'rows' | 'wrap';
  th: 'align' | 'bgcolor' | 'colspan' | 'headers' | 'rowspan' | 'scope';
  thead: 'align' | 'bgcolor';
  time: 'datetime';
  track: 'default' | 'kind' | 'label' | 'src' | 'srclang';
  video: 'autoplay' | 'controls' | 'crossorigin' | 'height' | 'loop' | 'muted' | 'poster' | 'preload' | 'src' | 'width' | 'playsinline';
};

type InvalidTag = Exclude<keyof TagSpecificAttribute, Tag>;

//@ts-expect-error: If this fires up, you have either misspelled a tag in TagSpecificAttribute or you need to add a new tag to the TAGS array. See the InvalidTag type above for which tags are missing
function __testTags__(t: InvalidTag) { t.length };

export type GlobalAttribute = [
  'accesskey', 'autocapitalize', 'class', 'contenteditable', 'data', 'dir', 'draggable', 'hidden', 'id', 'inert', 'itemprop', 'lang', 'role', 'slot', 'spellcheck', 'style', 'tabindex', 'title', 'translate'
][number];

type InvalidAttribute = Exclude<TagSpecificAttribute[keyof TagSpecificAttribute] | GlobalAttribute, AnyAttribute>;

//@ts-expect-error: If this fires up, you have either misspelled an attribute in either TagSpecificAttribute or GlobalAttribute or you need to add a new attribute to the ATTRIBUTES array. See the InvalidAttribute type above for which attributes are missing
function __testAttributes__(a: InvalidAttribute) { a.length };

export type Attribute<T extends Tag> =
  (
  T extends keyof TagSpecificAttribute
    ? TagSpecificAttribute[T]
    : never
  )
  | GlobalAttribute
  | `data-${string}`

export type BooleanAttribute = [
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap', 'loop', 'multiple', 'muted', 'novalidate', 'open', 'readonly', 'required', 'reversed', 'selected'
][number];

export type NumberAttribute = [
  'cols', 'colspan', 'height', 'max', 'maxlength', 'min', 'minlength', 'rows', 'rowspan', 'size', 'span', 'start', 'step', 'width'
][number];

export type Attributes<T extends Tag> = {
  [A in Attribute<T>]: A extends BooleanAttribute ? boolean : A extends NumberAttribute ? number : string
};

export type StringAttribute = Exclude<AnyAttribute, BooleanAttribute | NumberAttribute>

type EventHandler = ((this: GlobalEventHandlers, ev: any) => any) | null;

export type Events<T extends Tag> = {
  [K in keyof ElementForTag<T> as
    ElementForTag<T>[K] extends EventHandler
      ? K extends `on${string}` 
        ? K 
        : never
      : never
  ]: Extract<ElementForTag<T>[K], Func>
};

export type Event<T extends Tag> = keyof Events<T> & string;

export type AnyEvent = Event<Tag>;

export type Prop<T extends Tag> = Attribute<T> | Event<T>;

export type Props<T extends Tag> = Partial<Refables<Attributes<T>> & Events<T>>;

export type AllProps = 
  Record<StringAttribute, Refable<string>> 
  & Record<BooleanAttribute, Refable<boolean>> 
  & Record<NumberAttribute, Refable<number>>
  & Record<AnyEvent, Func>;