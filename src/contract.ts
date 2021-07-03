type Require<Ctx> = {
  key: string;
  cond: (ctx: Ctx) => boolean;
};

type Ensure<ReturnValue, Ctx> = {
  key: string;
  cond: (result: ReturnValue, ctx: Ctx) => boolean;
};

export default class Contract<Ctx = any, ReturnValue = any> {
  /**
   * The unique identifier for this contract. Used for debugging and logs.
   */
  private id: string;

  /**
   * All data required to make this contract work.
   */
  private ctx: Ctx;

  /**
   * Contract preconditions.
   */
  require: Require<Ctx>[] = [];

  /**
   * Contract postconditions.
   */
  ensure: Ensure<ReturnValue, Ctx>[] = [];

  /**
   * The return value that gets checked by postconditions.
   */
  result!: ReturnValue;

  constructor(id: string, ctx: Ctx) {
    this.id = id;
    this.ctx = ctx;
  }

  /**
   * Main body of the contract. Its passed a callback function thats given the
   * context and returns a value. That returned value is passed to each of
   * the postconditions.
   */
  invoke(cb: (ctx: Ctx) => ReturnValue) {
    this.runPreconditions();
    this.result = cb(this.ctx);
    this.runPostonditions();
  }

  async invokeAsync(cb: (ctx: Ctx) => Promise<ReturnValue>) {
    this.runPreconditions();
    this.result = await cb(this.ctx);
    this.runPostonditions();
  }

  private runPreconditions() {
    const preconditionErrors = [];

    for (const { key, cond } of this.require) {
      const condition = cond(this.ctx);

      if (!condition) {
        preconditionErrors.push(key);
      }
    }

    if (preconditionErrors.length > 0) {
      console.error(`${this.id} pre-conditions failed:`, {
        precondnitions: preconditionErrors,
        ctx: this.ctx
      });

      return;
    }
  }

  private runPostonditions() {
    if (this.ensure.length === 0) {
      throw Error(
        `${this.id} post-conditions not set. At least 1 post-condition is required and it must be defined before you invoke the contract.`
      );
    }

    const postconditionErrors = [];

    for (const { key, cond } of this.ensure) {
      const condition = cond(this.result, this.ctx);

      if (!condition) {
        postconditionErrors.push(key);
      }
    }

    if (postconditionErrors.length > 0) {
      console.error(`${this.id} post-conditions failed:`, {
        postconditions: postconditionErrors,
        result: this.result,
        ctx: this.ctx
      });

      throw Error(
        `${this.id} postcondnitions failed. Check console for more information.`
      );
    }
  }
}
