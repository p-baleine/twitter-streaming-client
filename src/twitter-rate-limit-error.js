
/**
 * Rate Limit error.
 */

export default class TwitterRateLimitError extends Error {
  constructor() {
    var tmp = super(arguments);
    this.origin = tmp;
    this.name = "TwitterRateLimitError";
  }

  get stack() { return this.origin.stack; }
}
