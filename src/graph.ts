import { NonFunction, Reverse } from "./types";
import { $throw, Metabox } from "./utils";
import { PhantomSet } from "./weaks";

type Connection<TNode extends object, TLink extends {}> = [ node: TNode, link: TLink ]

export const $GET = Symbol('GET');

export type WeakGraph<TSource extends object, TTarget extends object, TLink extends {}> = [

  sources: Metabox<TTarget, readonly Connection<TSource, NonFunction<TLink>>[]>,
  targets: Metabox<TSource, readonly Connection<TTarget, NonFunction<TLink>>[]>,
  
  setTarget: {
    (source: TSource, target: TTarget): void;
    (source: TSource, target: TTarget, link: TLink): void;
    (source: TSource, target: TTarget, remove: null): void;
    (source: TSource, target: TTarget, get: typeof $GET): TLink;
  }

];

export function WeakGraph<TNode extends object>(): WeakGraph<TNode, TNode, true>;
export function WeakGraph<TSource extends object, TTarget extends object>(): WeakGraph<TSource, TTarget, true>;
export function WeakGraph<TNode extends object, TLink extends {}>(
  initLink: (source: TNode, target: TNode) => TLink
): WeakGraph<TNode, TNode, NonFunction<TLink>>;
export function WeakGraph<TSource extends object, TTarget extends object, TLink extends {}>(
  initLink: (source: TSource, target: TTarget) => TLink
): WeakGraph<TSource, TTarget, NonFunction<TLink>>;

export function WeakGraph<TSource extends object, TTarget extends object, TLink extends {}>(
  initLink = (source: TSource, target: TTarget) => true as TLink
) {

  const sourcesSet = Metabox((target: TTarget) => new PhantomSet<TSource>());
  const targetsSet = Metabox((source: TSource) => new PhantomSet<TTarget>());

  const links = Metabox<readonly [TSource, TTarget], TLink | null>(
    // no getter = use the internal Metabox state
    undefined,
    // setter
    ([source, target], link) =>
      link === null
        ? (
          sourcesSet(target).delete(source),
          targetsSet(source).delete(target)
        )
        : (
          sourcesSet(target).add(source),
          targetsSet(source).add(target)
        )
  );

  enum ConnectionType {
    Sources,
    Targets,
  };

  function Connections<CT extends ConnectionType>(connectionType: CT) {
    type TNode = TSource | TTarget;
    const set = (
      connectionType === ConnectionType.Sources ? sourcesSet : targetsSet
    ) as Metabox<TNode, PhantomSet<TNode>>;

    type NodeTuple = readonly [TSource, TTarget] | readonly [TTarget, TSource];
    function areReversed(nodeTuple: NodeTuple): nodeTuple is readonly [ TTarget, TSource ] {
      return connectionType === ConnectionType.Sources;
    };

    function aligned(node: TNode, other: TNode) {
      const nodes = [ node, other ] as NodeTuple;
      return areReversed(nodes) ? Reverse(nodes) : nodes;
    };

    return Metabox(

      (node: TNode) => set(node).snapshot.map(
        other => [
          node as CT extends ConnectionType.Sources ? TSource : TTarget,
          links(aligned(node, other)) ?? $throw('Link not found (this should never happen)')
        ] as const
      ),
      
      (node, connections) => {
        set(node).snapshot.forEach(other =>
          links(aligned(node, other), null)
        );
        connections.forEach(([other, link]) =>
          links(aligned(node, other), link)
        );
        
      }
    );
  };

  return [ 
    Connections(ConnectionType.Sources),
    Connections(ConnectionType.Targets), 
    (
      source: TSource, target: TTarget, link: TLink | null | typeof $GET
    ) => {
      const pair = <const>[source, target];
      return (
        link === $GET ? links(pair) :
        link !== null ? links(pair, initLink(source, target)) :
                        links(pair, link)
      )
    }
  ];
  
};