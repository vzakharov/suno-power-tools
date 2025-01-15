import { ReadonlyRef, WritableComputedRef, computed, ComputedRef, Ref, ref, useNot } from "../smork/refs";
import { Storage } from "../storage";
import { mutate } from "../utils";

mutate(window, { ref, computed, useNot, BaseRef: ReadonlyRef, Ref: Ref, ComputedRef, WritableComputedRef });