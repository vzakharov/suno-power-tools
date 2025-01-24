import { Ref, SetterRef, computed, ComputedRef, WritableRef, ref } from "../smork/refs";
import { Storage } from "../storage";
import { mutate } from "../utils";
import * as dom from "../smork/dom";
import { unclass } from "../unclass";

mutate(window, { unclass });