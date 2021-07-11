type Precondition<Ctx, Result> = {} & (
  | {
      that: (ctx: Ctx) => boolean
      remedy?: ((state: { ctx: Ctx }) => Result) | Result
      [key: string]: any
    }
  | {
      remedy: ((state: { ctx: Ctx }) => Result) | Result
      that?: never
    }
)

type Postcondition<Ctx, Result> = {} & (
  | {
      that: (result: Result, ctx: Ctx) => boolean
      remedy?: ((state: { ctx: Ctx }) => Result) | Result
      [key: string]: any
    }
  | {
      remedy: ((state: { ctx: Ctx }) => Result) | Result
      that?: never
    }
)

export default class Contract<Ctx, Result> {
  private ctx: Ctx

  private preconditionsFailed: boolean = false
  private preconditionErrors: any[] = []
  private postconditionErrors: any[] = []
  private remedyHit: boolean = false

  result!: Result

  constructor(ctx: Ctx) {
    this.ctx = ctx
  }

  require(preconditions: Precondition<Ctx, Result>[]) {
    for (const { that, remedy, ...rest } of preconditions) {
      // capture any broken contract requirements
      try {
        if (that && !that(this.ctx)) {
          this.preconditionErrors.push(rest)

          if (remedy) {
            this.remedyHit = true
            this.result = remedy instanceof Function ? remedy({ ctx: this.ctx }) : remedy
          }
        }
      } catch {
        this.preconditionErrors.push(rest)

        if (remedy) {
          this.remedyHit = true
          this.result = remedy instanceof Function ? remedy({ ctx: this.ctx }) : remedy
        }
      }

      if (this.remedyHit) {
        break
      }
    }

    if (this.preconditionErrors.length > 0) {
      this.preconditionsFailed = true
      console.error('Contract pre-conditions failed:', {
        ctx: this.ctx,
        result: this.result,
        preconditionErrors: this.preconditionErrors,
      })

      if (!this.remedyHit) {
        throw new Error('Contract pre-conditions failed. See logs for more information.')
      }
    }
  }

  invoke(invokation: (ctx: Ctx) => Result) {
    // don't let any invokations happen if the preconditions have failed
    if (this.preconditionsFailed || this.remedyHit) {
      return this.result
    }

    try {
      this.result = invokation(this.ctx)
    } catch (error) {
      console.error('Contract invokation failed:', { ctx: this.ctx })

      if (!this.remedyHit) {
        throw new Error(error)
      }
    }
  }

  async invokeAsync(invokation: (ctx: Ctx) => Promise<Result>) {
    // don't let any invokations happen if the preconditions have failed
    if (this.preconditionsFailed || this.remedyHit) {
      return this.result
    }

    try {
      this.result = await invokation(this.ctx)
    } catch (error) {
      console.error('Contract invokation failed:', { ctx: this.ctx })

      if (!this.remedyHit) {
        throw new Error(error)
      }
    }
  }

  ensure(postconditions: Postcondition<Ctx, Result>[]) {
    if (this.remedyHit) {
      return
    }

    for (const { that, remedy, ...rest } of postconditions) {
      // capture any broken contract ensurements
      try {
        if (that && !that(this.result, this.ctx)) {
          this.postconditionErrors.push(rest)

          if (remedy) {
            this.remedyHit = true
            this.result = remedy instanceof Function ? remedy({ ctx: this.ctx }) : remedy
          }
        }
      } catch {
        this.postconditionErrors.push(rest)

        if (remedy) {
          this.remedyHit = true
          this.result = remedy instanceof Function ? remedy({ ctx: this.ctx }) : remedy
        }
      }

      if (this.postconditionErrors.length > 0) {
        console.error('Contract post-conditions failed:', {
          ctx: this.ctx,
          result: this.result,
          postconditionErrors: this.postconditionErrors,
        })

        if (!this.remedyHit) {
          throw new Error('Contract post-conditions failed. See logs for more information.')
        }
      }

      if (this.remedyHit) {
        break
      }
    }
  }
}
