//! Smork, the smol framework

import { uniqueId } from "./lodashish";

export function ref<T>(): Ref<T | undefined>;
export function ref<T extends {}>(value: T): Ref<T>;
export function ref<T>(value?: T) {
  return new Ref(value);
};

class BaseRef<T> {

  protected watchers: ((value: T, oldValue: T) => void)[] = [];

  constructor(
    protected _value: T
  ) {
    // readCounts.set(this, 0);
  };

  get() {
    // readCounts.set(this, readCounts.get(this) ?? 0 + 1);
    return this._value;
  };

  protected set(value: T) {
    if ( value !== this.value ) {
      this.watchers.forEach(watcher => watcher(value, this.value));
      this._value = value;
    }
  };

  /**
   * Note that unlike e.g. Vue watchers, this function will be called immediately.
   */
  watch(watcher: (value: T, oldValue: T) => void) {
    watcher(this._value, this._value);
    this.watchers.push(watcher);
  };

  onChange = this.watch; // just an alias

  unwatch(watcher: (value: T, oldValue: T) => void) {
    this.watchers = this.watchers.filter(w => w !== watcher);
  };

  get value() {
    firstRunningComputeds.forEach(computedRefProvider => {
      computedRefProvider().dependsOn.add(this);
    });
    return this.get();
  };

};

export class Ref<T> extends BaseRef<T> {
  
  set = super.set;

  set value(value: T) {
    this.set(value);
  };

};

const firstRunningComputeds = new Set<() => ComputedRef<any>>();

export class ComputedRef<T> extends BaseRef<T> {

  dependsOn = new Set<BaseRef<any>>();

  constructor(
    private getter: () => T
  ) {
    const thisProvider = () => this;
    firstRunningComputeds.add(thisProvider);
    super(getter());
    firstRunningComputeds.delete(thisProvider);
    this.dependsOn.forEach(ref => {
      ref.watch(() => {
        this.set(this.getter());
      });
    });
  };

};

export function computed<T extends {}>(getter: () => T) {
  return new ComputedRef(getter);
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

export type Inferrable<T> = T | (() => T);

export type Props<T extends SupportedElement> = Partial<Omit<T, 'children' | 'className' | 'style' | 'htmlFor'>> & {
  class?: T['className'],
  style?: Partial<T['style']>,
  for?: T extends HTMLLabelElement ? string : never
}

export type ElementFactory<TElement extends SupportedElement, TProps extends Props<TElement> = Props<TElement>> = {
  (props?: Inferrable<TProps>, children?: (string | SupportedElement)[]): TElement;
  (children?: (string | SupportedElement)[]): TElement
}

export function tag<T extends SupportedTag>(tagName: T) {

  type Element = TagElementMap[T];
  
  function element(
    propsOrChildren?: Inferrable<Props<Element>> | (string | SupportedElement)[],
    childrenOrNone?: (string | SupportedElement)[]
  ) {
    const [ props, children ] = 
      Array.isArray(propsOrChildren) 
        ? [ undefined, propsOrChildren ] 
        : [ propsOrChildren, childrenOrNone ];
    return elementFactory(props, children);
  };

  function elementFactory(
    props: Inferrable<Props<Element>> | undefined,
    children: (string | SupportedElement)[] | undefined
  ) {
    const element = document.createElement(tagName);
    if ( props ) {

      if ( typeof props === 'function' ) {
        const ref = computed(props);
        ref.onChange(assignProps);  
      } else {
        assignProps(props);
      };
      
      function assignProps(props: Props<Element>) {
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