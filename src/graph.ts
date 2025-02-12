import { isDefined, isNotNull, NonFunction, Reverse } from "./types";
import { $throw, itselfIf, Metabox } from "./utils"
import { PhantomSet } from "./weaks";

type Connection<TNode extends object, TLink extends {}> = [ node: TNode, link: TLink ]

export const $GET = Symbol('GET');

export type WeakGraph<TSource extends object, TTarget extends object, TLink extends {}> = [

  sources: Metabox<TTarget, readonly Connection<TSource, NonFunction<TLink>>[]>,
  targets: Metabox<TSource, readonly Connection<TTarget, NonFunction<TLink>>[]>,
  
  link: (source: TSource, target: TTarget, link?: TLink | null | typeof $GET) => void,

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

  function Connections(type: ConnectionType) {
    type TNode = TSource | TTarget;
    const set = (
      type === ConnectionType.Sources ? sourcesSet : targetsSet
    ) as Metabox<TNode, PhantomSet<TNode>>;
    return Metabox(
      (node: TNode) => set(node).snapshot.map(
        (other) => {
          const nodes = [ node, other ] as readonly [TSource, TTarget] | readonly [TTarget, TSource];
          function areReversed(nodeTuple: typeof nodes, connectionType: ConnectionType): nodeTuple is readonly [ TTarget, TSource ] {
            return connectionType === ConnectionType.Sources;
          };
          return [
            nodes[0],
            links(
              areReversed(nodes, type) ? Reverse(nodes) : nodes
            ) ?? $throw('Link not found (this should never happen)')
          ]
        }
      ),
    );
  };

  return [ 
    Connections(ConnectionType.Sources),
    Connections(ConnectionType.Targets), 
    (
      source: TSource, target: TTarget, link?: TLink | null | typeof $GET
    ) => {
      return link === $GET
        ? links([source, target])
        : link === null
          ? links([source, target], link)
          : link !== undefined
            ? links([source, target], link)
            : links([source, target], initLink(source, target));
    }
  ];
  
};