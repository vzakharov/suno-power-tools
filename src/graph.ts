import { NonFunction, Reverse } from "./types";
import { $throw, Metabox, tap } from "./utils";
import { PhantomSet } from "./weaks";

export const $GET = Symbol('GET');

enum LinkType {
  SOURCES,
  TARGETS,
};

export enum LinkExistence {
  OPTIONAL,
  REQUIRED,
};

export type WeakGraph<TSource extends object, TTarget extends object, TLink extends {}> = 
  ReturnType<typeof createWeakGraph<TSource, TTarget, TLink>>;

export function WeakGraph<TNode extends object>(): WeakGraph<TNode, TNode, true>;
export function WeakGraph<TSource extends object, TTarget extends object>(): WeakGraph<TSource, TTarget, true>;
export function WeakGraph<TSource extends object, TTarget extends object, TLink extends {}>(
  initLink: (source: TSource, target: TTarget) => TLink
): WeakGraph<TSource, TTarget, NonFunction<TLink>>;
export function WeakGraph<TNode extends object, TLink extends {}>(
  initLink: (source: TNode, target: TNode) => TLink
): WeakGraph<TNode, TNode, NonFunction<TLink>>;
export function WeakGraph<TSource extends object, TTarget extends object, TLink extends {}>(
  initLink = (source: TSource, target: TTarget) => true as TLink
) {
  return createWeakGraph(initLink);
};

function createWeakGraph<TSource extends object, TTarget extends object, TLink extends {}>(
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

  function NodeHandler(linkType: LinkType.SOURCES): Metabox<TTarget, readonly TSource[]>;
  function NodeHandler(linkType: LinkType.TARGETS): Metabox<TSource, readonly TTarget[]>;
  function NodeHandler(linkType: LinkType) {
    type Node = TSource | TTarget;
    const set = (
      linkType === LinkType.SOURCES ? sourcesSet : targetsSet
    ) as Metabox<Node, PhantomSet<Node>>;

    function align(node: Node, other: Node) {
      return (
        linkType === LinkType.SOURCES
          ? [ node, other ]
          : [ other, node ]
      ) as [TSource, TTarget];
    };

    return Metabox(

      (node: Node) => set(node).snapshot,
      
      (node, setLinks) => {
        set(node).snapshot.forEach(other =>
          links(align(node, other), null)
        );
        setLinks.forEach(other => {
          const aligned = align(node, other);
          links(aligned, initLink(...aligned));
        });
      }
    );
  };

  function setTarget(source: TSource, target: TTarget): void;
  function setTarget(source: TSource, target: TTarget, link: TLink): void;
  function setTarget(source: TSource, target: TTarget, remove: null): void;
  function setTarget(source: TSource, target: TTarget, link?: TLink | null) {

    return links([source, target], 
      link === undefined
        ? initLink(source, target)
        : link
    );

  };

  function getLink(source: TSource, target: TTarget): TLink | null;
  function getLink(source: TSource, target: TTarget, existence: LinkExistence.REQUIRED): TLink;
  function getLink(source: TSource, target: TTarget, existence = LinkExistence.OPTIONAL) {
    return tap(links([source, target]), link =>
      existence === LinkExistence.REQUIRED 
        && link === null
        && $throw(`Link not found between ${source} and ${target}`)
    );
  };

  const graph = [ 
    NodeHandler(LinkType.SOURCES),
    NodeHandler(LinkType.TARGETS), 
    setTarget,
    getLink
  ] as const;

  return graph;
  
};