import { Ref, WritableComputedRef, computed, ComputedRef, WritableRef, ref, useNot } from "../smork/refs";
import { Storage } from "../storage";
import { mutate } from "../utils";

mutate(window, { ref, computed, useNot, Ref, WritableRef, ComputedRef, WritableComputedRef });