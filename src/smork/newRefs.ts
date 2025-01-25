import { Func } from "../types";
import { Factory, FunctionAccessor, MetaRegister, Register } from "../utils";

const RefCore = MetaRegister();
type RefCore<T = any> = ReturnType<typeof RefCore<T>>;

const watchers = Register(RefCore, () => new Set<Func>());
const activeWatchers = Register(RefCore, () => new WeakSet<Func>());

function setRef<T>(ref: RefCore<T>, value: T) {
  const oldValue = ref();
  if ( value !== oldValue ) {
    ref(value);
    tarnishTargets(ref);
    try {
      for ( const watcher of watchers(ref)() ) {
        if ( activeWatchers(ref)().has(watcher) ) {
          console.warn('smork: watcher is already active — perhaps a circular dependency — exiting watch to prevent infinite loop');
          break;
        };
        activeWatchers(ref)().add(watcher);
        watcher(value, oldValue);
      };
    } finally {
      activeWatchers(ref)(new WeakSet());
    };
  };
};

export function Ref<T>(initialValue: T) {

  const core = RefCore(initialValue);

  const ref = () => (
    currentComputedTracker?.(ref),
    core()
  );

  // tba

  return ref;

};

export type Ref<T> = ReturnType<typeof Ref<T>>;

const name = RefCore('John Doe');

const nameWatchers = watchers(name, new Set<Func<[string], void>>())()