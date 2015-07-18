/**
 * Map of status codes and messages.
 */

var DISCONNECT_STATUS_CODES = {
  1: "Shutdown",
  2: "Duplicate stream",
  3: "Control request",
  4: "Stall",
  5: "Normal",
  6: "Token revoked",
  7: "Admin logout",
  9: "Max message limit",
  10: "Stream exception",
  11: "Broker stall",
  12: "Shed load"
};

/**
 * Disconnect error.
 */

export default class TwitterDisconnectError extends Error {
  constructor({ code: code, reason: reason }, ...args) {
    var message = `${DISCONNECT_STATUS_CODES[code] || "Unknown Error"}: ${reason}`;
    var tmp = super([message].concat(args));
    this.origin = tmp;
    this.name = "TwitterDisconnectError";
  }

  get stack() { return this.origin.stack; }
  get message() { return this.origin.message; }
}
