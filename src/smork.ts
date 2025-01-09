//! Smork, the smol framework
import { uniqueId } from "./lodashish";
import { NonUndefined } from "./types";
import { mutate } from "./utils";

//! Refs

export function ref<T>(): Ref<T | undefined>;
export function ref<T extends {}>(value: T): Ref<T>;
export function ref<T>(value?: T) {
  return createRef(value);
};

const refBrand = Symbol('ref');

export function createRef<T>(value: T) {
  
  const ref = new ClassRef(value);

  function accessor(value: NonUndefined<T>): void;
  function accessor(): T;
  function accessor(value?: T) {
    if ( value === undefined ) {
      return ref.get();
    } else {
      ref.set(value);
    };
  };

  mutate(ref, accessor);
  mutate(ref, { [refBrand]: true });


  return ref;

}

export type Ref<T> = ReturnType<typeof createRef<T>>;

export function isRef(value: any): value is Ref<any> {
  return value instanceof BaseClassRef && refBrand in value;
};

export type Watcher<T> = (value: T, oldValue: T) => void;

export class BaseClassRef<T> {

  protected watchers: ((value: T, oldValue: T) => void)[] = [];

  constructor(
    protected _value: T
  ) { };

  get() {
    // computedPreHandlers.forEach(hook => hook(this));
    computedPreHandlers.at(-1)?.(this);
    return this._value;
  };

  protected _set(value: T) {
    const { _value: oldValue } = this;
    if ( value !== this._value ) {
      this._value = value;
      this.watchers.forEach(watcher => watcher(value, oldValue));
    }
  };

  runAndWatch(watcher: Watcher<T>) {
    watcher(this._value, this._value);
    this.watch(watcher);
  };

  /**
   * @alias runAndWatch
   */
  watchImmediate = this.runAndWatch;

  watch(watcher: Watcher<T>) {
    this.watchers.push(watcher);
  };

  /**
   * @alias watch
   */
  onChange = this.watch; // just an alias

  unwatch(watcher: Watcher<T>) {
    this.watchers = this.watchers.filter(w => w !== watcher);
  };

  get value() {
    return this.get();
  };

};

export class ClassRef<T> extends BaseClassRef<T> {
  
  set = super._set;

  set value(value: T) {
    this.set(value);
  };

  get value() {
    return this.get();
  };

};

// const computedPreHandlers = new Set<(ref: BaseRef<any>) => void>();
const computedPreHandlers: Array<(ref: BaseClassRef<any>) => void> = [];

export class ComputedClassRef<T> extends BaseClassRef<T> {

  refresh() {
    this._set(this.getter());
  };

  constructor(
    private getter: () => T
  ) {
    super(undefined as any); // we need to call super before we can use this
    const handler = (ref: BaseClassRef<any>) => {
      ref.watch(() => this.refresh());
    };
    // computedPreHandlers.add(handler);
    computedPreHandlers.push(handler);
    this.refresh();
    // computedPreHandlers.delete(handler);
    if ( computedPreHandlers.pop() !== handler ) {
      throw new Error('smork: computedPreHandlers stack is corrupted');
    };
  };

};

export function computed<T extends {}>(getter: () => T) {
  const ref = new ComputedClassRef(getter);
  mutate(ref, () => ref.get());
  mutate(ref, { [refBrand]: true });
  return ref;
};

export type ComputedRef<T extends {}> = ReturnType<typeof computed<T>>;

export function useNot<T>(ref: BaseClassRef<T>) {
  return computed(() => {
    return !ref.value
  });
};

//! Elements

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
        ref.runAndWatch(assignProps);  
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
};

export function showIf(condition: boolean) {
  return condition ? {} : { display: 'none' };
};

export function hideIf(condition: boolean) {
  return showIf(!condition);
};