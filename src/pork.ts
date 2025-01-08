//! Pork, the PORtable framewORK

import { uniqueId } from "./lodashish";

const refBrand = Symbol('ref');

export function ref<T>(): Ref<T | undefined> {
  return {
    [refBrand]: true as const,
    value: undefined as T | undefined
  };
};

export type Ref<T> = {
  [refBrand]: true,
  value: T
};

export function assert<T>(ref: Ref<T | undefined>): asserts ref is Ref<T> {
  if ( ref.value === undefined ) {
    throw new Error('Ref value is undefined');
  };
};

export function ensure<T>(ref: Ref<T | undefined>) {
  assert(ref);
  return ref.value;
};

export function isRef(candidate: any): candidate is Ref<any> {
  return candidate?.[refBrand];
};

export const SUPPORTED_TAGS = [
  'html', 'head', 'style', 'script', 'body', 'div', 'h3', 'p', 'a', 'img', 'audio', 'input', 'label', 'button'
] as const;

export type SupportedTag = typeof SUPPORTED_TAGS[number];

export type TagElementMap = Pick<HTMLElementTagNameMap, SupportedTag>;

export type TagName = keyof TagElementMap;
export type SupportedElement = TagElementMap[SupportedTag];

export const {
  html, head, style, script, body, div, h3, p, a, img, audio, input, label, button
} = createTags(SUPPORTED_TAGS);

export function createTags(tagNames: typeof SUPPORTED_TAGS) {
  return tagNames.reduce((acc, tagName) => {
    return Object.assign(acc, {
      [tagName]: tag(tagName)
    });
  }, {} as {
    [K in SupportedTag]: ReturnType<typeof tag<K>>
  });
};

export type Props<T extends SupportedElement> = Partial<Omit<T, 'children' | 'className' | 'style' | 'htmlFor'>> & {
  class?: T['className'],
  style?: Partial<T['style']>,
  for?: T extends HTMLLabelElement ? string : never
}

export type ElementFactory<TElement extends SupportedElement, TProps extends Props<TElement> = Props<TElement>> = {
  (ref: Ref<TElement | undefined>, props?: TProps, children?: (string | SupportedElement)[]): TElement;
  (ref: Ref<TElement | undefined>, children: (string | SupportedElement)[]): TElement;
  (props?: TProps, children?: (string | SupportedElement)[]): TElement;
  (children?: (string | SupportedElement)[]): TElement
}

export function tag<T extends SupportedTag>(tagName: T) {

  type Element = TagElementMap[T];
  
  function element(
    ...args: any
  ) {
    const ref = isRef(args[0]) ? args.shift() : undefined;
    const props = Array.isArray(args[0]) ? undefined : args.shift();
    const children = args[0];
    return elementFactory(ref, props, children);
  };

  function elementFactory(
    ref: Ref<Element> | undefined,
    props: Props<Element> | undefined,
    children: (string | SupportedElement)[] | undefined
  ) {
    const element = document.createElement(tagName);
    if (props) {
      Object.assign(element, props);
      if ( props.class ) {
        element.className = props.class;
      };
      if ( element instanceof HTMLLabelElement && props.for ) {
        element.htmlFor = props.for;
      };
      Object.entries(props.style ?? {}).forEach(([key, value]) => {
        element.style[key as any] = value;
      });
    };
    if (children) {
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        };
      });
    };
    if (ref) {
      ref.value = element;
    };
    return element;
  }

  return element as ElementFactory<Element>;

};

export const checkbox = boundElementFactory(input, { type: 'checkbox' });
export const textInput = boundElementFactory(input, { type: 'text' });

export function boundElementFactory<TElement extends SupportedElement, TProps extends Props<TElement>, TBoundKey extends keyof TProps>(
  baseFactory: ElementFactory<TElement, TProps>,
  boundProps: {
    [P in TBoundKey]: TProps[P]
  }
) {
  return ((...args: any) => {
    const element = baseFactory(...args);
    Object.assign(element, boundProps);
    return element;
  }) as ElementFactory<TElement, Omit<TProps, TBoundKey> extends Props<TElement> ? Omit<TProps, TBoundKey> : never>;
};

export function labeled(labelText: string, element: HTMLInputElement) {
  element.id ||= uniqueId('pork-input-');
  const output = [
    label({ for: element.id }, [labelText]),
    element
  ];
  if ( element.type === 'checkbox' ) {
    output.reverse();
  };
  return output;
};

export async function importScript<T>(win: Window, windowKey: string, url: string) {
  const script = win.document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  win.document.head.appendChild(script);
  return new Promise<T>((resolve) => {
    script.onload = () => {
      resolve(win[windowKey] as T);
    };
  });
}