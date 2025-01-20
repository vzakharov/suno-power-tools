import { Ref, SetterRef, computed, ComputedRef, WritableRef, ref } from "../smork/refs";
import { Storage } from "../storage";
import { mutate } from "../utils";
import * as dom from "../smork/dom";

mutate(window, { ref, computed, Ref, WritableRef, ComputedRef, SetterRef, ...dom });