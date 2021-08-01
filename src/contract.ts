interface SyncConfig<Ctx, Result, Fallback> {
  id?: string
  ctx: Ctx
  fallback?:
    | Fallback
    | ((internal: {
        errors: any
        requireErrors: any
        ensureErrors: any
        result: Result
        ctx: Ctx
      }) => Fallback)
  require: ({ that: (ctx: Ctx) => boolean } & Record<string, any>)[]
  invoke: (ctx: Ctx) => Result
  ensure: ({ that: (result: Result, ctx: Ctx) => boolean } & Record<string, any>)[]
}

export function contract<Ctx = any, Result = any, Fallback = any>(
  config: SyncConfig<Ctx, Result, Fallback>
): Result | Fallback {
  const { id = undefined, ctx, fallback = undefined, require = [], invoke, ensure = [] } = config

  let contractName = id ? `"${id}"` : 'contract'
  let requireErrors: any[] = []
  let ensureErrors: any[] = []
  let result!: Result

  // check the preconditions
  for (const { that, ...rest } of require) {
    try {
      const passes = that(ctx)
      if (!passes) requireErrors.push(rest)
    } catch {
      requireErrors.push(rest)
    }
  }

  // throw error and return if preconditions failed, or return the fallback.
  if (requireErrors.length > 0) {
    console.error(`${contractName} pre-conditions were not met.`, {
      ctx,
      requireErrors,
    })

    if (!fallback) {
      throw new Error('Contract pre-conditions failed. Check console for more information.')
    }

    if (fallback instanceof Function) {
      return fallback({
        errors: [...requireErrors, ...ensureErrors],
        requireErrors,
        ensureErrors,
        result,
        ctx,
      })
    }

    return fallback
  }

  // invoke the main contracts invokation
  try {
    result = invoke(ctx)
  } catch {}

  // check the postcondtions
  for (const { that, ...rest } of ensure) {
    try {
      const passes = that(result, ctx)
      if (!passes) ensureErrors.push(rest)
    } catch {
      ensureErrors.push(rest)
    }
  }

  // throw error and return if postconditions failed, or return the fallback.
  if (ensureErrors.length > 0) {
    console.error(`${contractName} post-conditions were not met.`, {
      ctx,
      result,
      ensureErrors,
    })

    if (!fallback) {
      throw new Error('Contract post-conditions failed. Check console for more information.')
    }

    if (fallback instanceof Function) {
      return fallback({
        errors: [...requireErrors, ...ensureErrors],
        requireErrors,
        ensureErrors,
        result,
        ctx,
      })
    }

    return fallback
  }

  return result
}
