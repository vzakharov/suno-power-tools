import { MetaRegister } from "../utils";

export const Ref = MetaRegister();
export type Ref<T> = ReturnType<typeof Ref<T>>;

const name = Ref('John Doe');
console.log(name()); // John Doe
name('Jane Doe');
console.log(name()); // Jane Doe