import { forEach, uniqueId } from "../lodashish";
import { Ref, Refable, Unref, unrefs } from "./refs";

export const SUPPORTED_TAGS = [
  'html', 'head', 'style', 'script', 'body', 'div', 'h3', 'p', 'a', 'img', 'audio', 'input', 'label', 'button'
] as const;
// TODO: Distinguish between void elements and non-void elements

export type SupportedTag = typeof SUPPORTED_TAGS[number];

export type TagElementMap = Pick<HTMLElementTagNameMap, SupportedTag>;

export type TagName = keyof TagElementMap;
export type SupportedElement = TagElementMap[SupportedTag];

export const tags = createTags(SUPPORTED_TAGS);

export const {
  html, head, style, script, body, div, h3, p, a, img, audio, input, label, button
} = tags;

export function createTags(tagNames: typeof SUPPORTED_TAGS) {
  return tagNames.reduce((acc, tagName) => {
    return Object.assign(acc, {
      [tagName]: createTag(tagName)
    });
  }, {} as {
    [K in SupportedTag]: ReturnType<typeof createTag<K>>
  });
};

export type Props<T extends SupportedElement> = {
  [K in Exclude<keyof T, 'children' | 'className' | 'style' | 'htmlFor' | keyof Events<T>>]?: Refable<T[K]>
} & {
  class?: Refable<T['className'] | undefined>,
  for?: T extends HTMLLabelElement ? Refable<string | undefined> : never,
  style?: {
    [K in keyof T['style']]?: Refable<T['style'][K] | undefined>
  }
};

export type Events<T extends SupportedElement> = {
  [K in keyof T as 
    T[K] extends ((this: GlobalEventHandlers, ev: any) => any) | null
      ? K
      : never
  ]?: T[K]
};

type HTMLNode = SupportedElement | string;

function createTag<T extends SupportedTag>(tagName: T) {

  type TElement = TagElementMap[T];
  
  function elementFactory(props: Props<TElement>, events?: Events<TElement>, children?: HTMLNode[]): TElement;
  function elementFactory(props: Props<TElement>, children?: HTMLNode[]): TElement;
  function elementFactory(children?: HTMLNode[]): TElement;
  function elementFactory(
    propsOrChildren?: Props<TElement> | HTMLNode[],
    eventsOrChildren?: Events<TElement> | HTMLNode[],
    childrenOrNone?: HTMLNode[]
  ) {
    const [ props, events, children ] = 
      Array.isArray(propsOrChildren) 
        ?   [ undefined,        undefined,          propsOrChildren ] 
        : Array.isArray(eventsOrChildren)
          ? [ propsOrChildren,  undefined,          eventsOrChildren ]
          : [ propsOrChildren,  eventsOrChildren,   childrenOrNone ];
    return verboseElementFactory(props, events, children);
  }


  function verboseElementFactory(
    props: Props<TElement> | undefined,
    events: Events<TElement> | undefined,
    children: HTMLNode[] | undefined
  ) {
    const element = document.createElement(tagName);
    if ( props ) {

      assignProps(props);
      
      function assignProps(props: Props<TElement>) {
        const { style, class: className, for: htmlFor, ...otherProps } = unrefs(props);
        Object.assign(element, {
          ...otherProps,
          ...events
        });
        className 
          && Object.assign(element, { className });
        element instanceof HTMLLabelElement && htmlFor 
          && Object.assign(element, { htmlFor });
        forEach(style ?? {}, (value, key) => {
          element.style[key as any] = value as any;
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

  return elementFactory;

};

export const checkbox = modelElement('input', 'checked', 
  { type: 'checkbox' }, 
  model => ({
    onchange: () => model.set(!model.value)
  })
);

export const textInput = modelElement('input', 'value',
  { type: 'text' },
  model => ({
    onkeyup: ({ key, target }: KeyboardEvent ) => {
      key === 'Enter'
        && target instanceof HTMLInputElement
        && model.set(target.value);
    }
  })
);

export type ModelRef<TElement extends SupportedElement, TModelKey extends keyof Props<TElement>> 
  = Ref<NonNullable<Unref<Props<TElement>[TModelKey]>>>;

// exmample

type TextInputModelRef = ModelRef<HTMLInputElement, 'value'>; // should be Ref<string>
type CheckboxModelRef = ModelRef<HTMLInputElement, 'checked'>; // should be Ref<boolean>

export function modelElement<
  TTag extends SupportedTag,
  TModelKey extends keyof Props<TagElementMap[TTag]>,
  TProps extends Props<TagElementMap[TTag]>
>(
  tag: TTag,
  modelKey: TModelKey,
  initProps: TProps,
  eventFactory: (model: ModelRef<TagElementMap[TTag], TModelKey>) => Events<TagElementMap[TTag]>
) {
  type TElement = TagElementMap[TTag];
  return (
    model: ModelRef<TElement, TModelKey>,
    props?: Omit<Props<TElement>, TModelKey | keyof TProps>
  ) => {
    return createTag(tag)({
      ...initProps,
      ...props,
      [modelKey]: model,
      ...eventFactory(model)
    })
  };
}


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

function getDisplayStyle(condition: Ref<boolean>, showIfTrue: boolean, displayOtherwise?: string) {
  return { 
    display: condition.compute(on => on === showIfTrue ? displayOtherwise : 'none') 
  };
};
export function showIf(condition: Ref<boolean>, displayOtherwise?: string) {
  return getDisplayStyle(condition, true, displayOtherwise)
};

export function hideIf(condition: Ref<boolean>, displayOtherwise?: string) {
  return getDisplayStyle(condition, false, displayOtherwise)
}