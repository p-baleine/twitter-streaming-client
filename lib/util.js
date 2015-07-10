/**
 * Extends `obj` with rest arguments.
 *
 * @param obj
 * @return extended obj
 * @api public
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extend = extend;

function extend(obj) {
  if (typeof obj !== "object") {
    return obj;
  }

  var args = [].slice.call(arguments, 1);

  for (var i = 0, l = args.length; i < l; ++i) {
    var src = args[i];
    var props = Object.keys(src);

    for (var j = 0, k = props.length; j < k; ++j) {
      obj[props[j]] = src[props[j]];
    }
  }

  return obj;
}