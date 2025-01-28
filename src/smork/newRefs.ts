// import { watch } from "fs";
// import { Func } from "../types";
// import { MetaRegister, Register } from "../utils";

// const RefCore = MetaRegister();
// type RefCore<T = any> = ReturnType<typeof RefCore<T>>;

// // const watchers: 
// //     ( <T>(ref: RefCore<T>) => Watchers<T> )
// //   & ( <T>(ref: RefCore<T>, value: Watchers<T>) => void )
// //  = Register(RefCore, () => new Set<Func<[any, any], void>>());
// function watchers<T>(ref: RefCore<T>, setValue?: Set<Watcher<T>>) {
//   return Register(RefCore, () => new Set<Watcher<T>>())(ref, setValue);
// };

// type Watcher<T> = Func<[now: T, before: T], void>;

// function activeWatchers<T>(ref: RefCore<T>) {
//   return Register(RefCore, () => new WeakSet<Func<[T, T], void>>())(ref);
// };

// const targets = Register(RefCore, () => new Set<RefCore>());

// function setRef<T>(ref: RefCore<T>, value: T) {
//   const oldValue = ref();
//   if ( value !== oldValue ) {
//     ref(value);
//     tarnishTargets(ref);
//     try {
//       for ( const watcher of watchers(ref) ) {
//         if ( activeWatchers(ref).has(watcher) ) {
//           console.warn('smork: watcher is already active — perhaps a circular dependency — exiting watch to prevent infinite loop');
//           break;
//         };
//         activeWatchers(ref).add(watcher);
//         watcher(value, oldValue);
//       };
//     } finally {
//       activeWatchers(ref, new WeakSet());
//     };
//   };
// };

// const dirty = new WeakSet<RefCore>();

// function tarnishTargets(ref: RefCore) {
//   targets(ref).forEach(tarnish);
// };

// function tarnish(ref: RefCore) {
//   if ( dirty.has(ref) ) return;
//   dirty.add(ref);
//   if ( watchers(ref).size ) {
//     recalculate(ref);
//   } else {
//     tarnishTargets(ref);
//   };
// };


// export function Ref<T>(initialValue: T) {

//   const core = RefCore(initialValue);

//   // const ref = () => (
//   //   currentComputedTracker?.(ref),
//   //   core()
//   // );

//   function ref(): T;
//   function ref(value: T): void;
//   function ref<U>(mapper: Func<[now: T, before: T], U>): MappedRef<U>;
//   function ref<U>(arg?: T | Func<[now: T, before: T], U>) {
//     if ( arguments.length === 0 ) {
//       return core();
//     } else if ( typeof arg === 'function' ) {
//       return MappedRef(core, arg);
//     } else {
//       setRef(core, arg);
//     };
//   };

//   // tba

//   return ref;

// };

// export type Ref<T> = ReturnType<typeof Ref<T>>;

// const name = RefCore('John Doe');

// const nameWatchers = watchers(name, new Set<Func<[string], void>>())()