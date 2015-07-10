/**
 * Extends `obj` with rest arguments.
 *
 * @param obj
 * @return extended obj
 * @api public
 */

export function extend(obj) {
  if (typeof obj !== "object") {
    return obj;
  }

  var args = [].slice.call(arguments, 1);

  for (let i = 0, l = args.length; i < l; ++i) {
    let src = args[i];
    let props = Object.keys(src);

    for (let j = 0, k = props.length; j < k; ++j) {
      obj[props[j]] = src[props[j]];
    }
  }

  return obj;
}
