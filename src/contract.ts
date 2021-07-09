type Config<Ctx, Result> =
  | {
      ctx: Ctx
      require: { that: (ctx: Ctx) => boolean; [key: string]: any }[]
      ensure: { that: (result: Result) => boolean; [key: string]: any }[]
      remedy?: (error: any) => any
    } & (
      | {
          invoke: (ctx: Ctx) => Result
          invokeAsync?: never
        }
      | {
          invoke?: never
          invokeAsync: (ctx: Ctx) => Promise<Result>
        }
    )

function contract<Result = any, Ctx = any>(title: string, config: Config<Ctx, Result>) {
  let result: any

  const preconditions = () => {
    const failed = []

    for (const { that, ...rest } of config.require) {
      const check = that(config.ctx)
      if (!check) failed.push(rest)
    }

    if (failed.length > 0) {
      console.error(title + ': pre-conditions failed', {
        ctx: config.ctx,
        preconditions: failed,
      })

      if (config.remedy) {
        // set the result to the remedy if one is provided
        result = config.remedy({ preconditionError: failed })
      } else {
        throw new Error(title + ': pre-conditions failed')
      }
    }

    // returns true that preconditions passed if theres no errors
    return failed.length === 0
  }

  const postconditions = (res: any) => {
    const failed = []

    for (const { that, ...rest } of config.ensure) {
      try {
        that(res)
      } catch {
        failed.push(rest)
      }
    }

    if (failed.length > 0) {
      console.error(title + ': post-conditions failed', {
        ctx: config.ctx,
        postconditions: failed,
        result: res,
      })

      if (config.remedy) {
        // set the result to the remedy if one is provided
        result = config.remedy(failed)
      } else {
        throw new Error(title + ': post-conditions failed')
      }
    }

    // returns true that postconditions passed if theres no errors
    return failed.length === 0
  }

  const preconditionCheck = preconditions()

  if (!preconditionCheck) {
    return result
  }

  if (config?.invokeAsync) {
    result = config
      .invokeAsync(config.ctx)
      .then((res: any) => {
        const postconditionCheck = postconditions(res)

        if (!postconditionCheck) {
          return result
        }

        return res
      })
      .catch((error: any) => {
        // set the result to the remedy if one is provided
        if (config.remedy) {
          return config.remedy(error)
        }
      })
  }

  if (config?.invoke) {
    result = config.invoke(config.ctx)
  }

  return result
}

export default contract
