export default class PostConditionNotSetError extends Error {
  constructor() {
    super()
    this.message =
      'ContractPostConditionNotSet: At least 1 post condition is required when defining contracts.'
  }
}
