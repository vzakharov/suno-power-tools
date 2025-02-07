import { ReadonlyComputedRef, Effect, RootRef, Ref, effect, watch } from "../smork/newRefs";

Object.assign(window, { RootRef, ReadonlyComputedRef, Effect, Ref, effect, watch });