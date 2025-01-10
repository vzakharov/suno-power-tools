import { uniqueId } from "../lodashish";
import { KeyWithValueOfType } from "../types";
import { computed, Ref, ReadonlyRef, useNot, MaybeRefOrGetter, isRefOrGetter, toRef, ref } from "./refs";

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


export type Props<T extends SupportedElement> = Partial<Omit<T, 'children' | 'className' | 'style' | 'htmlFor'>> & {
  class?: T['className'],
  style?: Partial<T['style']>,
  for?: T extends HTMLLabelElement ? string : never,
}

export type ElementFactory<TElement extends SupportedElement, TProps extends Props<TElement> = Props<TElement>> = {
  (props?: MaybeRefOrGetter<TProps>, children?: (string | SupportedElement)[]): TElement;
  (children?: (string | SupportedElement)[]): TElement
}

export function tag<T extends SupportedTag>(tagName: T) {

  type Element = TagElementMap[T];
  
  function element(
    propsOrChildren?: MaybeRefOrGetter<Props<Element>> | (string | SupportedElement)[],
    childrenOrNone?: (string | SupportedElement)[]
  ) {
    const [ props, children ] = 
      Array.isArray(propsOrChildren) 
        ? [ undefined, propsOrChildren ] 
        : [ propsOrChildren, childrenOrNone ];
    return elementFactory(props, children);
  };

  function elementFactory(
    props: MaybeRefOrGetter<Props<Element>> | undefined,
    children: (string | SupportedElement)[] | undefined
  ) {
    const element = document.createElement(tagName);
    if ( props ) {

      if ( isRefOrGetter(props) ) {
        toRef(props).runAndWatch(assignProps);  
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

export const checkbox = modelElement(input, 'checked', model => ({
  type: 'checkbox',
  onchange: () => {
    model.set(!model.value);
  }
}));

export const textInput = modelElement(input, 'value', model => ({
  type: 'text',
  onkeyup: ({ key, target }: KeyboardEvent ) => {
    key === 'Enter'
      && target instanceof HTMLInputElement
      && model.set(target.value);
  }
}));

export function modelElement<
  T extends SupportedElement, 
  KModel extends keyof Props<T>,
  TComputed extends Props<T>
>(
  elementFactory: ElementFactory<T>,
  modelKey: KModel,
  propsFactory: (model: Ref<NonNullable<Props<T>[KModel]>>) => TComputed,
) {
  return (
    model: Ref<NonNullable<Props<T>[KModel]>>,
    props?: MaybeRefOrGetter<Omit<Props<T>, KModel>>,
  ) => {
    const computedProps = ref<Props<T>>(() => ({
      ...propsFactory(model),
      [modelKey]: model.value
    }));
    return elementFactory(props ? computedProps.merge(props) : computedProps);
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

export function showIf(condition: boolean | undefined) {
  return condition ? {} : { display: 'none' };
};

export function hideIf(condition: boolean | undefined) {
  return showIf(!condition);
};