export class Resolvable {

  resolve: () => void;
  reject: (err: Error) => void;
  promise: Promise<void>;

  constructor() {
    this.promise = new Promise<void>((resolve, reject) =>
      Object.assign(this, { resolve, reject })
    );
  };

}