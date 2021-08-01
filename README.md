# Design by Contract

## Example Usage

```js
function getFileByKey(fileKey) {
  const file = contract({
    // The contracts optional identifier. Used within error messages.
    id: 'getFileByKey',

    // The contracts context is the internal state of the contract. It's important
    // that the state the contract reads is immutable: its the same at the end of
    // the contract as it is when the contract is invoked. This internal context
    // is passed to each of the other properties on this contract configuration
    // object and is checked once more at the end of execution.
    ctx: { fileKey },

    // If for whatever reason the contracts preconditions or postconditions fail,
    // this is what will get returned in its place. This allows you to overwrite
    // the default thrown error. It expects a function thats given the internal
    // context, the result if it exists, and the errors collected during the
    // process of running the contract.
    fallback: ({ errors }) => {
      return 'Something went wrong finding this file by key: ' + errors.map((e) => e.msg).join(', ')
    },

    // The contracts require (or preconditions) are conditions that must be met
    // in order for the contract to be invoked. If the preconditions are not met
    // the contract will throw an error or return whatever fallback error you
    // provide within the requirement. Its important that to understand that
    // whenever a contracts requirements fail it is considered a *bug*. Contract
    // requirements are not meant to be used for non-bug, unwanted behavior such
    // as form validation, for example.
    require: [
      { that: (ctx) => typeof ctx.fileKey === 'string', msg: 'fileKey not string' },
      { that: (ctx) => ctx.fileKey.length > 0, msg: 'fileKey not provided' },
    ],

    // The contracts invokation is the main purpose for the contract. When the
    // contracts requirements are met this invokation is called with the context
    // passed to it. Whatever this invokation returns is then passed to the
    // contracts postrequirements. This invokation accepts both sync and async
    // return types.
    invoke: async (ctx) => api.getFileByKey(ctx.fileKey),

    // The contracts ensure (postconditions) are conditions that must be true
    // about what the invokation returns. If the postconditions are not met the
    // contract will throw an error or whatever fallback error you provide within
    // the ensurement. It's important to understand that whenever a contracts
    // ensurements fail it is considered a *bug* in your program. Contract
    // ensurements are not meant to be used for non-bug, unwanted behavior.
    ensure: [
      { that: (res) => res.meta.status === 200, msg: 'result was not 200' },
      { that: (res, ctx) => res.data.key === ctx.fileKey, msg: 'result was not same file' },
    ],
  })

  return file.data
}
```
