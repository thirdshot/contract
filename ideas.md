```ts
function add(a, b) {
  const contract = new Contract({ a, b })

  contract.require = [
    { that: (ctx) => typeof ctx.a === 'number' }
  ]

  contract.remedy = () => null

  contract.invoke = (ctx) => ctx.a + ctx.b;

  contract.ensure = [
    { that: (res) => res > 0 }
  ]

  return contract.result()
}
```

```ts
function add(a, b) {
  const contract = new Contract({
    id: 'customContract',
    ctx: { a, b },
    invariants: [],
    require: [],
    remedy: () => null,
    invoke: () => {},
    ensure: [],
  })
}
```