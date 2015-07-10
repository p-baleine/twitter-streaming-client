"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _componentEmitter = require("component-emitter");

var _componentEmitter2 = _interopRequireDefault(_componentEmitter);

var _util = require("./util");

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _twitterRateLimitError = require("./twitter-rate-limit-error");

var _twitterRateLimitError2 = _interopRequireDefault(_twitterRateLimitError);

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var log = (0, _debug2["default"])("twitter-streaming-client");

var STATE_READING_LENGTH = 0;
var STATE_READING_DATA = 1;
var STATE_ABORT = 2;

/**
 * Twitter Streaming API client.
 */

var TwitterStreamingClient = (function (_Emitter) {

  /**
   * Constructor.
   *
   * @param {String} endpoint
   * @param {Object} oauth
   * @api public
   */

  function TwitterStreamingClient(endpoint, oauth) {
    _classCallCheck(this, TwitterStreamingClient);

    _get(Object.getPrototypeOf(TwitterStreamingClient.prototype), "constructor", this).call(this);

    this.oauth = oauth;
    this.endpoint = TwitterStreamingClient.formatEndpoint(endpoint);
    this.params = {};
    this.state = STATE_READING_LENGTH;
    this.length = 0;
    this.buffer = "";
    this.req = null;
  }

  _inherits(TwitterStreamingClient, _Emitter);

  _createClass(TwitterStreamingClient, [{
    key: "open",

    /**
     * Open the connect to `this.endpoint`.
     *
     * @return this
     * @api public
     */

    value: function open(params) {
      var _this = this;

      this.params = params || this.params;

      var obj = (0, _util.extend)({ url: this.endpoint, oauth: this.oauth }, this.params);

      this.req = _request2["default"].post(obj).on("data", function (data) {
        return _this.processData(data);
      }).on("response", function (response) {
        return _this.parseResponse(response);
      }).on("error", function (err) {
        return _this.emit("error", err);
      }).on("end", function () {
        return _this.emit("end");
      });

      return this;
    }
  }, {
    key: "close",

    /**
     * Close the connection.
     *
     * @return this
     * @api public
     */

    value: function close() {
      this.req.abort();
    }
  }, {
    key: "processData",

    /**
     * Process request's `data` event.
     *
     * @api private
     */

    value: function processData(data) {
      this.emit("data", data);

      data = data.toString("utf8");

      var idx = 0;

      while (idx < data.length) {
        switch (this.state) {
          case STATE_READING_LENGTH:
            idx = this.readLine(idx, data);

            if (idx === -1) {
              return this;
            }

            if (!this.isBlankLine()) {
              this.length = parseInt(this.buffer, 10);

              if (isNaN(this.length)) {
                this.lastError = new Error("length is not a number " + data);
                this.state = STATE_ABORT;
              } else {
                this.clearBuffer();
                this.state = STATE_READING_DATA;
              }
            } else {
              log("blank line...");
            }

            break;

          case STATE_READING_DATA:
            idx = this.readLength(idx, data);

            if (this.isDataEnd()) {
              var message = null;

              try {
                message = JSON.parse(this.buffer);
                this.emitMessage(message);
                this.state = STATE_READING_LENGTH;
              } catch (error) {
                this.lastError = error;
                this.state = STATE_ABORT;
              } finally {
                this.length = 0;
                this.clearBuffer();
              }
            }

            break;

          case STATE_ABORT:
            this.emit("error", this.lastError);
            return this;

          default:
            throw new Error("unknown state");
        }
      }

      if (this.state === STATE_ABORT) {
        this.emit("error", this.lastError);
      }

      return this;
    }
  }, {
    key: "parseResponse",

    /**
     * Parse `response`.
     *
     * @api private
     */

    value: function parseResponse(response) {
      if (response.statusCode === 200) {
        this.emit("response", response);
      } else if (response.statusCode === 420) {
        this.emit("error", new _twitterRateLimitError2["default"](response.statusText));
      } else if (response.statusCode === 401) {
        this.emit("error", new Error("Unauthorized"));
      } else {
        this.emit("error", new Error(response.statusText));
      }

      return this;
    }
  }, {
    key: "readLine",

    /**
     * Read one line into `this.buffer` from `idx` of `data`.
     *
     * @api private
     */

    value: function readLine(idx, data) {
      var end = data.indexOf("\r\n", idx);
      this.buffer = data.slice(idx, end + 1);
      return end === -1 ? end : end + 2;
    }
  }, {
    key: "readLength",

    /**
     * Read data into `this.buffer` from `idx` of `data`.
     *
     * @api private
     */

    value: function readLength(idx, data) {
      var end = this.length - this.buffer.length;
      this.buffer += data.slice(idx, idx + end);
      return idx + end;
    }
  }, {
    key: "isBlankLine",

    /**
     * Check if `this.buffer` contains a blank line.
     *
     * @api private
     */

    value: function isBlankLine() {
      return this.buffer.replace(/[\n\r]/g, "").length === 0;
    }
  }, {
    key: "isDataEnd",

    /**
     * Check if `this.buffer` contains the whole data.
     *
     * @api private
     */

    value: function isDataEnd() {
      return this.buffer.length === this.length;
    }
  }, {
    key: "clearBuffer",

    /**
     * Clear `this.buffer`.
     *
     * @api private
     */

    value: function clearBuffer() {
      this.buffer = "";
    }
  }, {
    key: "emitMessage",

    /**
     * Emit `message`.
     *
     * @api private
     */

    value: function emitMessage(message) {
      if (message.text) {
        this.emit("status", message);
      } else if (message["delete"]) {
        this.emit("delete", message);
      } else if (message.friends) {
        this.emit("friends", message);
      } else if (message.event) {
        if (message.event === "favorite") {
          this.emit("favorite", message);
        }
      }

      return this;
    }
  }, {
    key: "emit",

    // Override
    value: function emit(event) {
      log(event + " emitted");

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      _get(Object.getPrototypeOf(TwitterStreamingClient.prototype), "emit", this).apply(this, [event].concat(args));
      return this;
    }
  }], [{
    key: "formatEndpoint",

    /**
     * Format `endpoint`.
     *
     * @api public
     */

    value: function formatEndpoint(endpoint) {
      var parsed = _url2["default"].parse(endpoint, true);

      // ensure `delimited=length` option
      parsed.query.delimited = "length";

      return _url2["default"].format(parsed);
    }
  }]);

  return TwitterStreamingClient;
})(_componentEmitter2["default"]);

exports["default"] = TwitterStreamingClient;
module.exports = exports["default"];