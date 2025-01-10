//! Smork, the smol framework
import { isFunction, uniqueId } from "./lodashish";
import { Function } from "./types";

//! Refs

export function ref<T extends {}>(value: Exclude<T, Function>): Ref<T>;
export function ref<T>(): Ref<T | undefined>;
export function ref<T>(getter: () => T): ComputedRef<T>;

export function ref<T>(arg?: T | (() => T)) {
  return isFunction(arg) 
    ? new ComputedRef(arg)
    : new Ref(arg);
};

export type Watcher<T> = (value: T, oldValue: T) => void;

export class BaseRef<T> {

  protected watchers: Watcher<T>[] = [];
  private activeWatchers = new WeakSet<Watcher<T>>();

  constructor(
    protected _value: T
  ) { };

  get() {
    currentComputedPreHandler?.(this);
    return this._value;
  };

  protected _set(value: T) {
    const { _value: oldValue } = this;
    if ( value !== this._value ) {
      this._value = value;
      try {
        for ( const watcher of this.watchers ) {
          if ( this.activeWatchers.has(watcher) ) {
            console.warn('smork: watcher is already active — perhaps a circular dependency — exiting watch to prevent infinite loop');
            return;
          }
          this.activeWatchers.add(watcher);
          watcher(value, oldValue);
        };
      } finally {
        this.activeWatchers = new WeakSet();
      };
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

  // map<U>(getter: (value: T) => U): ComputedRef<U>;
  // map<K extends keyof T>(key: K): ComputedRef<T[K]>;
  // map(arg: ((value: T) => any) | keyof T) {
  //   return isFunction(arg) 
  //     ? new ComputedRef(() => arg(this.get()))
  //     : new ComputedRef(() => this.get()[arg]);
  // };
  // Let's remove the key-based mapping for now, until/unless we find a use case for it
  map<U>(getter: (value: T) => U): ComputedRef<U> {
    return new ComputedRef(() => getter(this.get()));
  };

};


export class Ref<T> extends BaseRef<T> {
  
  set = super._set;

  set value(value: T) {
    this.set(value);
  };

  get value() {
    return this.get();
  };

};

// const computedPreHandlers: Array<(ref: BaseRef<any>) => void> = [];
let currentComputedPreHandler: ((ref: BaseRef<any>) => void) | undefined = undefined;

export class ComputedRef<T> extends BaseRef<T> {

  refresh() {
    this._set(this.getter());
  };

  constructor(
    private getter: () => T
  ) {
    if ( currentComputedPreHandler ) {
      throw new Error('smork: currentComputedPreHandler is already set (this should never happen)');
    };
    try {
      currentComputedPreHandler = ref => {
        ref.watch(() => this.refresh());
      };
      super(getter()); // to register any refs that are used in the getter
    } finally {
      currentComputedPreHandler = undefined;
    };
  };

};

export function computed<T>(getter: () => T) {
  return new ComputedRef(getter);
};

export function useNot<T>(ref: BaseRef<T>) {
  return computed(() => {
    return !ref.value
  });
};

//! Elements

export const SUPPORTED_TAGS = [
  'html', 'head', 'style', 'script', 'body', 'div', 'h3', 'p', 'a', 'img', 'audio', 'input', 'label', 'button'
] as const;
// TODO: Distinguish between void elements and non-void elements

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
  for?: T extends HTMLLabelElement ? string : never,
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

export function checkbox(
  model: Ref<boolean>,
  props?: Inferrable<
    Omit<Props<HTMLInputElement>, 'type' | 'checked' | 'onchange'>
  >,
) {
  return input(() => ({
    ...props,
    type: 'checkbox',
    checked: model.value,
    onchange: () => {
      model.set(!model.value);
    }
  }));
};

export function textInput(
  model: Ref<string>,
  props?: Inferrable<
    Omit<Props<HTMLInputElement>, 'type' | 'value' | 'oninput'>
  >,
) {
  return input(() => ({
    ...props,
    type: 'text',
    value: model.value,
    onkeyup: ({ key }: KeyboardEvent) => {
      // TODO: Add support for other model "trigger" events (change, blur, etc.)
      key === 'Enter' && model.set(model.value);
    }
  }));
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

export function showIf(conditionRef: BaseRef<boolean>) {
  return conditionRef.value ? {} : { display: 'none' };
};

export function hideIf(conditionRef: BaseRef<boolean>) {
  return showIf(useNot(conditionRef));
};