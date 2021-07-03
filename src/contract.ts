type Require<Ctx> = { msg: string; that: (ctx: Ctx) => boolean }
type Remedy<Ctx> = ((ctx: Ctx) => any) | undefined
type Invoke<Result, Ctx> = (ctx: Ctx) => Result
type Ensure<Result, Ctx> = { msg: string; that: (res: Result, ctx: Ctx) => boolean }

export default class Contract<Result = any, Ctx = any> {
  private ctx
  invariants = []
  require: Require<Ctx>[] = []
  remedy: Remedy<Ctx> = undefined
  invoke!: Invoke<Result, Ctx>
  ensure: Ensure<Result, Ctx>[] = []

  private invokationResult!: Result
  private resultSetByRemedy: boolean = false

  constructor(ctx: Ctx) {
    this.ctx = ctx
  }

  private runPreconditions(): boolean {
    const preconditionErrors = []

    for (const { msg, that } of this.require) {
      const condition = that(this.ctx)

      if (!condition) {
        preconditionErrors.push(msg)
      }
    }

    if (preconditionErrors.length > 0) {
      console.error(`contract pre-conditions failed:`, {
        precondnitions: preconditionErrors,
        ctx: this.ctx,
      })

      if (this.remedy) {
        this.invokationResult = this.remedy(this.ctx)
        this.resultSetByRemedy = true
      }

      return false
    }

    return true
  }

  private runPostonditions() {
    if (this.ensure.length === 0) {
      throw Error(
        `contract post-conditions not set. At least 1 post-condition is required and it must be defined before you invoke the contract.`
      )
    }

    const postconditionErrors = []

    for (const { msg, that } of this.ensure) {
      const condition = that(this.invokationResult, this.ctx)

      if (!condition) {
        postconditionErrors.push(msg)
      }
    }

    if (postconditionErrors.length > 0) {
      console.error(`contract post-conditions failed:`, {
        postconditions: postconditionErrors,
        result: this.invokationResult,
        ctx: this.ctx,
      })

      throw Error(`contract post-condnitions failed. Check console for more information.`)
    }
  }

  result(): Result | undefined {
    const preconditionsPassed = this.runPreconditions()

    if (!preconditionsPassed) {
      return this.invokationResult
    }

    if (!this.resultSetByRemedy) {
      this.invokationResult = this.invoke(this.ctx)
    }

    this.runPostonditions()
    return this.invokationResult
  }
}

const addPositiveNumbers = (a: number, b: number) => {
  const contract = new Contract<number>({ a, b })

  contract.require = [
    { msg: 'a is a number', that: (ctx) => typeof ctx.a == 'number' },
    { msg: 'b is a number', that: (ctx) => typeof ctx.b == 'number' },
  ]

  contract.remedy = () => 0

  contract.invoke = (ctx) => ctx.a + ctx.b

  contract.ensure = [{ msg: 'result is positive', that: (res) => res > 0 }]

  return contract.result()
}
