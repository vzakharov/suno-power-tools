import { ReadonlyComputedRef, Effect, RootRef, Ref, effect, watch } from "../smork/newRefs";

Object.assign(window, { RootRef, ReadonlyComputedRef, Effect, ref: Ref, effect, watch });