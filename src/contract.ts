class Contract {
  private ctx: any

  private preconditionsFailed: boolean = false
  private preconditionErrors: any[] = []
  private postconditionErrors: any[] = []
  private remedyHit: boolean = false

  result: any = undefined

  constructor(ctx: any) {
    this.ctx = ctx
  }

  require(preconditions: any) {
    for (const { that, remedy, ...rest } of preconditions) {
      // capture any broken contract requirements
      try {
        if (that && !that(this.ctx)) {
          this.preconditionErrors.push(rest)

          if (remedy) {
            this.remedyHit = true
            this.result = typeof remedy === 'function' ? remedy(this.ctx) : remedy
          }
        }
      } catch {
        this.preconditionErrors.push(rest)

        if (remedy) {
          this.remedyHit = true
          this.result = typeof remedy === 'function' ? remedy(this.ctx) : remedy
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

  invoke(invokation: (ctx: any) => any) {
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

  async invokeAsync(invokation: (ctx: any) => Promise<any>) {
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

  ensure(postconditions: any) {
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
            this.result = typeof remedy === 'function' ? remedy(this.ctx) : remedy
          }
        }
      } catch {
        this.postconditionErrors.push(rest)

        if (remedy) {
          this.remedyHit = true
          this.result = typeof remedy === 'function' ? remedy(this.ctx) : remedy
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

////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
const add = (a: number, b: number): number => {
  const contract = new Contract({ a, b })

  contract.require([
    { that: (ctx: any) => typeof ctx.a === 'number', error: 'a is not a number' },
    { that: (ctx: any) => typeof ctx.b === 'number', error: 'b is not a number' },
  ])

  contract.invoke((ctx) => ctx.a + ctx.b)

  contract.ensure([{ that: (res: any) => res > 0, error: 'result not more than 0' }])

  return contract.result
}

console.log(add(2, 4))

////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
const fakeEndpoint = async (ms: number, rejectIt: boolean = false) => {
  return new Promise((resolve, reject) => {
    if (rejectIt) setTimeout(() => reject('Something went wrong'), ms)

    setTimeout(() => resolve({ id: 1, name: 'Benjamin' }), ms)
  })
}

const getUserById = async (userId: number) => {
  const contract = new Contract({ userId })

  contract.require([{ that: (ctx: any) => ctx.userId > 0, error: 'userId is not more than 0' }])

  await contract.invokeAsync(() => {
    const user = fakeEndpoint(1000)
    return user
  })

  contract.ensure([
    {
      that: (res: any, ctx: any) => res.id === ctx.userId,
      error: 'the correct user was not returned',
      // remedy: 'uh oh.',
    },
  ])

  return contract.result
}

;(async () => {
  console.log(await getUserById(1))
})()
