import { Metabox } from "./utils";
import { PhantomSet } from "./weaks";

class CoupledSet<TNode extends object, TOther extends object> extends PhantomSet<TNode> {
  constructor(
    private otherNode: TOther,
    private getOtherSet: (node: TNode) => PhantomSet<TOther>
  ) {
    super();
  };
  add(node: TNode) {
    this.getOtherSet(node).add(this.otherNode);
    return super.add(node);
  };
  delete(node: TNode) {
    this.getOtherSet(node).delete(this.otherNode);
    return super.delete(node);
  };
  clear() {
    this.snapshot.forEach(node => this.getOtherSet(node).delete(this.otherNode));
    return super.clear();
  };
};

export function WeakGraph<TSource extends object, TTarget extends object>(): WeakGraph<TSource, TTarget> {
  
  const sources: Metabox<TTarget, PhantomSet<TSource>> = Metabox((target: TTarget) => new CoupledSet<TSource, TTarget>(target, targets));
  const targets: Metabox<TSource, PhantomSet<TTarget>> = Metabox((source: TSource) => new CoupledSet<TTarget, TSource>(source, sources));

  return [ sources, targets ] as const;

};
  
export type WeakGraph<TSource extends object, TTarget extends object> = [
  sources: Metabox<TTarget, PhantomSet<TSource>>,
  targets: Metabox<TSource, PhantomSet<TTarget>>
]