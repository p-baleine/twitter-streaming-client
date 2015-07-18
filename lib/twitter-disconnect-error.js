/**
 * Map of status codes and messages.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

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

var TwitterDisconnectError = (function (_Error) {
  _inherits(TwitterDisconnectError, _Error);

  function TwitterDisconnectError(_ref) {
    var code = _ref.code;
    var reason = _ref.reason;

    _classCallCheck(this, TwitterDisconnectError);

    var message = (DISCONNECT_STATUS_CODES[code] || "Unknown Error") + ": " + reason;

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    var tmp = _get(Object.getPrototypeOf(TwitterDisconnectError.prototype), "constructor", this).call(this, [message].concat(args));
    this.origin = tmp;
    this.name = "TwitterDisconnectError";
  }

  _createClass(TwitterDisconnectError, [{
    key: "stack",
    get: function get() {
      return this.origin.stack;
    }
  }, {
    key: "message",
    get: function get() {
      return this.origin.message;
    }
  }]);

  return TwitterDisconnectError;
})(Error);

exports["default"] = TwitterDisconnectError;
module.exports = exports["default"];