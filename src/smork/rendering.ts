import { forEach, uniqueId } from "../lodashish";
import { mutate, renameKeys } from "../utils";
import { assignAndWatch, Ref, Refable, Refables, runAndWatch, Unref } from "./refs";

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


type EventHandler = ((this: GlobalEventHandlers, ev: any) => any) | null;

export type StyleOptions = Partial<Omit<CSSStyleDeclaration, 'length' | 'parentRule'>>

export type Props<TElement extends SupportedElement> = {
  [K in Exclude<keyof TElement, 'style' | 'className' | 'htmlFor' | keyof Events<TElement>>]: TElement[K]
} & {
  style: StyleOptions,
  class: string,
  for: TElement extends HTMLLabelElement ? TElement['htmlFor'] : never,
};
    
export type Events<TElement extends SupportedElement> = {
  [K in keyof TElement as 
    TElement[K] extends EventHandler
      ? K
      : never
  ]?: TElement[K]
};

type HTMLNode = SupportedElement | string;

function createTag<TTag extends SupportedTag>(tagName: TTag) {

  type TElement = TagElementMap[TTag];
  type TProps = Partial<Refables<Props<TElement>>>;

  function elementFactory(props: TProps, events?: Events<TElement>, children?: HTMLNode[]): TElement;
  function elementFactory(props: TProps, children?: HTMLNode[]): TElement;
  function elementFactory(children?: HTMLNode[]): TElement;
  function elementFactory(
    propsOrChildren?: TProps | HTMLNode[],
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

  return elementFactory;

  function verboseElementFactory(
    props: TProps | undefined,
    events: Events<TElement> | undefined,
    children: HTMLNode[] | undefined
  ) {
    const element = document.createElement(tagName) as TElement;
    events && Object.assign(element, events);
    props && forEach(
        renameKeys(props, {
          class: 'className',
          for: 'htmlFor'
        } as any) as Refables<TElement>,
        (value, key) => {
          runAndWatch(value, value => {
            key !== 'style'
              ? element[key] = value as any
              : forEach(value as StyleOptions, (value, key) =>
                element.style[key] = value as any
              );
          });
        }
      );
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

};

export const Checkbox = modelElement('input', 'checked', 
  { type: 'checkbox' }, 
  model => ({
    onchange: () => model.set(!model.value)
  })
);

export const TextInput = modelElement('input', 'value',
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
  initProps: Partial<TProps>,
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
    }, eventFactory(model))
  };
}


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