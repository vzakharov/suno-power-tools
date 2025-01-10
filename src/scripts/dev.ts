import { BaseRef, computed, ComputedRef, Ref, ref, useNot } from "../smork/refs";
import { Storage } from "../storage";
import { mutate } from "../utils";

mutate(window, { ref, computed, useNot, BaseRef, Ref, ComputedRef });