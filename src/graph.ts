import { NonFunction } from "./types";
import { Metabox } from "./utils"

type Connection<TNode extends object, TLink extends {}> = [ node: TNode, link: TLink ]

export type WeakGraph<TSource extends object, TTarget extends object, TLink extends {}> = [

  sources: Metabox<TTarget, readonly Connection<TSource, NonFunction<TLink>>[]>,
  targets: Metabox<TSource, readonly Connection<TTarget, NonFunction<TLink>>[]>,
  link: Metabox<[TSource, TTarget], NonFunction<TLink> | null>

];

export function WeakGraph<TNode extends object>(): WeakGraph<TNode, TNode, true>;
export function WeakGraph<TSource extends object, TTarget extends object>(): WeakGraph<TSource, TTarget, true>;
export function WeakGraph<TNode extends object, TLink extends {}>(
  initLink: (source: TNode, target: TNode) => NonFunction<TLink>
): WeakGraph<TNode, TNode, NonFunction<TLink>>;
export function WeakGraph<TSource extends object, TTarget extends object, TLink extends {}>(
  initLink: (source: TSource, target: TTarget) => NonFunction<TLink>
): WeakGraph<TSource, TTarget, NonFunction<TLink>>;

export function WeakGraph<TSource extends object, TTarget extends object, TLink extends {}>(
  initLink = (source: TSource, target: TTarget) => true as NonFunction<TLink>
) {

  const sources = Metabox((target: TTarget) => [] as readonly Connection<TSource, NonFunction<TLink>>[]);
  const targets = Metabox((source: TSource) => [] as readonly Connection<TTarget, NonFunction<TLink>>[]);

  const links = Metabox<[TSource, TTarget], TLink | null>(
    ([ source, target ]) => {
      const link = initLink(source, target)
      sources(target, sources => [...sources, [ source, link ]]);
      targets(source, targets => [...targets, [ target, link ]]);
      return link;
    },
  );
  
  return [ sources, targets, links ];

};