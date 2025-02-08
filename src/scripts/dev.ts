import { ReadonlyComputedRef, Effect, RootRef, ref, effect, watch, Ref, allRefs } from "../smork/newRefs";

Object.assign(window, { RootRef, ReadonlyComputedRef, Effect, Ref, ref, effect, watch, allRefs });