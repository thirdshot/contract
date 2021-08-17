type Require<Ctx> = ({ cond: (ctx: Ctx) => boolean } & Record<string, any>)[]
type Ensure<Result, Ctx> = ({ cond: (result: Result, ctx: Ctx) => boolean } & Record<string, any>)[]
type FallbackArg<Fallback, Result, Ctx> =
  | Fallback
  | ((internal: { errors: any; requireErrors: any; ensureErrors: any; result: Result; ctx: Ctx }) => Fallback)

interface AsyncConfig<Ctx, Result, Fallback> {
  id?: string
  ctx: Ctx
  fallback?: FallbackArg<Fallback, Result, Ctx>
  require: Require<Ctx>
  invoke: (ctx: Ctx) => Promise<Result>
  ensure: Ensure<Result, Ctx>
}

export async function contractAsync<Ctx = any, Result = any, Fallback = any>(
  config: AsyncConfig<Ctx, Result, Fallback>
): Promise<Result | Fallback> {
  const { id = undefined, ctx, fallback = undefined, require = [], invoke, ensure = [] } = config

  let contractName = id ? `"${id}"` : 'contract'
  let requireErrors: any[] = []
  let ensureErrors: any[] = []
  let result!: Result

  // check the preconditions
  for (const { cond, ...rest } of require) {
    try {
      const passes = cond(ctx)
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
    result = await invoke(ctx)
  } catch {}

  // check the postcondtions
  for (const { cond, ...rest } of ensure) {
    try {
      const passes = cond(result, ctx)
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
