import { forEach, uniqueId } from "../lodashish";
import { Inferable } from "../types";
import { $with, Undefined } from "../utils";
import { Ref, Refable, toref, unref, Unref, WritableRef } from "./refs";
import { label } from "./tags";
import { AllProps, ElementForTag, Events, Props, SmorkNode, Tag } from "./types";

export type StyleOptions = Partial<Omit<CSSStyleDeclaration, 'length' | 'parentRule'>>

export type RefableSmorkNode = Refable<SmorkNode>;

export function tag<TTag extends Tag>(tagName: TTag) {

  type TElement = ElementForTag[TTag];
  type TProps = Props[TTag];

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
    props && 
      forEach(
        props as AllProps,
        (value, key) => {
          typeof value === 'function'
            ? element[key === 'style' ? 'cssText' : key] = value()
            : $with(value, refable => {
                update(unref(refable));
                toref(refable).watch(update);
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
      });
    return element;
  };

};

export const Checkbox = modelElement('input', 'checked', Boolean,
  { type: 'checkbox' }, 
  model => ({
    onchange: () => model.set(!model.value)
  })
);

export const TextInput = modelElement('input', 'value', String,
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
  = WritableRef<NonNullable<Unref<Props<TElement>[TModelKey]>>>;

// exmample

type TextInputModelRef = ModelRef<HTMLInputElement, 'value'>; // should be Ref<string>
type CheckboxModelRef = ModelRef<HTMLInputElement, 'checked'>; // should be Ref<boolean>

export function modelElement<
  TTag extends Tag,
  TModelKey extends keyof Props<ElementForTag[TTag]>,
  TProps extends Props<ElementForTag[TTag]>
>(
  tag: TTag,
  modelKey: TModelKey,
  initProps: Partial<TProps>,
  eventFactory: (model: ModelRef<ElementForTag[TTag], TModelKey>) => Events<ElementForTag[TTag]>
) {
  type TElement = ElementForTag[TTag];
  return (
    model: ModelRef<TElement, TModelKey>,
    props?: Omit<Props<TElement>, TModelKey | keyof TProps>
  ) => {
    return tag(tag)({
      ...initProps,
      ...props,
      [modelKey]: model,
    // }, eventFactory(model))
      ...eventFactory(model)
    });
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

export function If<TValue, TNode extends SmorkNode>(condition: Ref<TValue | undefined>, ifYes: Inferable<TNode, TValue>): TNode | null
export function If<TNode extends SmorkNode>(condition: Ref<boolean>, ifYes: Inferable<TNode, boolean>): TNode | null;
export function If<TYesNode extends SmorkNode, TNoNode extends SmorkNode>(condition: Ref<boolean>, ifYes: Inferable<TYesNode, boolean>, ifNo: Inferable<TNoNode, boolean>): TYesNode | TNoNode;
export function If<TValue, TYesNode extends SmorkNode, TNoNode extends SmorkNode>(
  condition: Ref<TValue | undefined>,
  ifYes: Inferable<TYesNode, NonNullable<TValue>>,
  ifNo = Undefined<Inferable<TNoNode, NonNullable<TValue>>>()
) {
  return condition.map(value => value ? ifYes : ifNo);
};