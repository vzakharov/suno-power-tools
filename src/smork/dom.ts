import { forEachValue, uniqueId } from "../lodashish";
import { infer, Inferable } from "../types";
import { $with, debug, getOrSet } from "../utils";
import { Undefined } from "../types";
import { allElements, DEV_MODE, refToElementLinks } from "./devTools";
import { Ref, Refable, toref, unref, Unref, WritableRef } from "./refs";
import { AllProps, ElementForTag, Events, Props, SmorkNode, Tag, TAGS, EventName } from "./types";

export type StyleOptions = Partial<Omit<CSSStyleDeclaration, 'length' | 'parentRule'>>

export type RefableSmorkNode = Refable<SmorkNode>;

export function tag<TTag extends Tag>(tagName: TTag) {

  type TElement = ElementForTag<TTag>;
  type TProps = Props<TTag>;

  function factory(props: TProps, children?: RefableSmorkNode[]): TElement;
  function factory(children?: RefableSmorkNode[]): TElement;
  function factory(
    propsOrChildren?: TProps | RefableSmorkNode[],
    childrenOrNone?: RefableSmorkNode[]
  ) {
    const [ props, children ] =
      Array.isArray(propsOrChildren)
        ? [ undefined, propsOrChildren ]
        : [ propsOrChildren, childrenOrNone ];
    return verboseFactory(props, children);
  }

  return factory;

  function verboseFactory(
    props: TProps | undefined,
    children: RefableSmorkNode[] | undefined
  ) {

    const element = document.createElement(tagName) as TElement;
    DEV_MODE && allElements.add(element);
    props && 
      forEachValue(
        props as AllProps,
        (value, key) => {
          typeof value === 'function'
            ? element[key as EventName<TTag>] = value as any
            : $with(value, refable => {
                update(unref(refable));
                toref(refable).watch(update);
                DEV_MODE && refable instanceof Ref && getOrSet(refToElementLinks, refable, new Set()).add(element);
                function update(value: Unref<typeof refable>) {
                  typeof value === 'boolean'
                    ? value
                      ? element.setAttribute(key, '')
                      : element.removeAttribute(key)
                    : element.setAttribute(key, String(value));
                };
              })
        }
      );
    children && 
      children.forEach(child => {
        let currentNode = Undefined<ChildNode>();
        const place = (node: Unref<RefableSmorkNode>) => {
          const rawNode = typeof node === 'string'
            ? document.createTextNode(node)
          : node instanceof HTMLElement
            ? node
          : document.createComment('');
          currentNode 
            ? currentNode.replaceWith(rawNode)
            : element.appendChild(rawNode);
          currentNode = rawNode;
        };
        child instanceof Ref ? child.watchImmediate(place) : place(child);
        DEV_MODE && child instanceof Ref && getOrSet(refToElementLinks, child, new Set()).add(element);
      });
    return element;
  };

};

// Note: the below doesn't allow tree-shaking, but it's better than spelling out each tag factory export manually (especially because TypeScript doesn't allow inferring all overloads of a function, which we would need for e.g. `a` to be inferred the same as `tag('a')`)
export const {
  a, abbr, address, area, article, aside, audio, b, base, bdi, bdo, blockquote, body, br, button, canvas, caption, cite, code, col, colgroup, data, datalist, dd, del, details, dfn, dialog, div, dl, dt, em, embed, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, head, header, hgroup, hr, html, i, iframe, img, input, ins, kbd, label, legend, li, link, main, map, mark, menu, meta, meter, nav, noscript, object: $object, ol, optgroup, option, output, p, picture, pre, progress, q, rp, rt, ruby, s, samp, script, search, section, select, slot, small, source, span, strong, style, sub, summary, sup, table, tbody, td, template, textarea, tfoot, th, thead, time, title, tr, track, u, ul, var: $var, video, wbr
} = TAGS.reduce((tags, tagName) => {
  tags[tagName as any] = tag(tagName);
  return tags;
}, {} as {
  [T in typeof TAGS[number]]: ReturnType<typeof tag<T>>
});


export function Checkbox(model: WritableRef<boolean>, props?: Omit<Props<'input'>, 'type' | 'checked'>) {
  return tag('input')({
    ...props,
    type: 'checkbox',
    checked: model,
    onchange: () => model.set(!model.value)
  });
};
export type Checkbox = ReturnType<typeof Checkbox>;

export function TextInput(model: WritableRef<string>, props?: Omit<Props<'input'>, 'type' | 'value'>) {
  return tag('input')({
    ...props,
    type: 'text',
    value: model,
    onkeyup: ({ key, target }: KeyboardEvent ) => {
      key === 'Enter'
        && target instanceof HTMLInputElement
        && model.set(target.value);
    }
  });
};
export type TextInput = ReturnType<typeof TextInput>;

/**
 * Creates a labeled input by generating or reusing an ID for the provided HTML input element.
 *
 * NOTE: The label is placed after the input element if the input element is a checkbox, and before otherwise.
 */
export function Labeled(labelText: string, element: HTMLInputElement) {
  element.id ||= uniqueId('smork-input-');
  const output = [
    label({ for: element.id }, [labelText]),
    element
  ];
  if ( element.type === 'checkbox' ) {
    output.reverse();
  };
  return output;
};
export type Labeled = ReturnType<typeof Labeled>;

export async function $import<T>(windowKey: string, src: string) {
  if ( window[windowKey] ) {
    return window[windowKey] as T;
  };
  return new Promise<T>((resolve) => {
    document.head.appendChild(script({ src, onload: () => resolve(window[windowKey] as T) }));
  });
};

export function If<T>(
  condition: Ref<T>,
  ifYes: Inferable<SmorkNode, NonNullable<T>>,
  ifNo = Undefined<Inferable<SmorkNode, void>>()
) {
  return condition.map(value => value ? infer(ifYes, value) : infer(ifNo));
};
export type If = ReturnType<typeof If>;