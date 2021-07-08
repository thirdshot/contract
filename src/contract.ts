import PostConditionNotSetError from './custom-errors/PostConditionNotSetError'

type Require<Ctx> = { msg: string; that: (ctx: Ctx) => boolean }
type Remedy<Ctx> = ((ctx: Ctx) => any) | undefined
type Invoke<Result, Ctx> = (ctx: Ctx) => Result
type InvokeAsync<Result, Ctx> = (ctx: Ctx) => Promise<Result>
type Ensure<Result, Ctx> = {
  msg: string
  that: (res: Result, ctx: Ctx) => boolean
}

export default class Contract<Result = any, Ctx = any> {
  private ctx
  invariants = []
  require: Require<Ctx>[] = []
  remedy: Remedy<Ctx> = undefined
  invoke!: Invoke<Result, Ctx>
  invokeAsync!: InvokeAsync<Result, Ctx>
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
      throw new PostConditionNotSetError()
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

      throw Error(`contract post-conditions failed. Check console for more information.`)
    }
  }

  async result(): Promise<Result> {
    const preconditionsPassed = this.runPreconditions()

    // return early if the preconditions failed
    if (!preconditionsPassed) {
      return this.invokationResult
    }

    // returned early if there the remedy was hit and a value was returned
    if (this.resultSetByRemedy) {
      return this.invokationResult
    }

    if (this.invoke) {
      this.invokationResult = this.invoke(this.ctx)
      this.runPostonditions()
      return this.invokationResult
    }

    return await this.invokeAsync(this.ctx).then((res) => {
      this.invokationResult = res
      this.runPostonditions()
      return this.invokationResult
    })
  }
}
