import compile from "./mathml.js";

const DOLLAR = "$",
  STATE_TEXT = 0,
  STATE_INLINE_CODE = 1,
  STATE_BLOCK_CODE = 2,
  STATE_INLINE_MATH = 3,
  STATE_BLOCK_MATH = 4,
  find = (str, start, is_md) => {
    const len = str.length;
    for (let i = start; i < len; ++i) {
      const c = str[i];
      if (c === "\\" || c === DOLLAR || (is_md && c === "`")) return i;
    }
    return -1;
  };

export default (md) => {
  let result = "",
    idx = 0,
    state = STATE_TEXT,
    math_start = 0;

  const len = md.length;

  while (idx < len) {
    if (state === STATE_TEXT) {
      const match_idx = find(md, idx, 1);
      if (match_idx === -1) {
        result += md.slice(idx);
        break;
      }
      result += md.slice(idx, match_idx);
      const char = md[match_idx];
      if (char === "\\") {
        const is_esc = md[match_idx + 1] === DOLLAR;
        result += is_esc ? DOLLAR : "\\";
        idx = match_idx + (is_esc ? 2 : 1);
      } else if (char === DOLLAR) {
        const block = md[match_idx + 1] === DOLLAR;
        state = block ? STATE_BLOCK_MATH : STATE_INLINE_MATH;
        idx = match_idx + (block ? 2 : 1);
        math_start = idx;
      } else {
        const block = md[match_idx + 1] === "`" && md[match_idx + 2] === "`";
        result += block ? "```" : "`";
        state = block ? STATE_BLOCK_CODE : STATE_INLINE_CODE;
        idx = match_idx + (block ? 3 : 1);
      }
    } else if (state >= STATE_INLINE_MATH) {
      const match_idx = find(md, idx, 0);
      if (match_idx === -1) {
        idx = len;
        break;
      }
      if (md[match_idx] === "\\") {
        idx = match_idx + (md[match_idx + 1] ? 2 : 1);
      } else {
        const is_inline = state === STATE_INLINE_MATH;
        if (is_inline || md[match_idx + 1] === DOLLAR) {
          const content = md.slice(math_start, match_idx),
            delim = is_inline ? DOLLAR : DOLLAR + DOLLAR;
          try {
            result += compile(content, !is_inline);
          } catch {
            result += delim + content + delim;
          }
          state = STATE_TEXT;
          idx = match_idx + (is_inline ? 1 : 2);
        } else {
          idx = match_idx + 1;
        }
      }
    } else {
      const is_inline = state === STATE_INLINE_CODE,
        delim = is_inline ? "`" : "```",
        match_idx = md.indexOf(delim, idx);
      if (match_idx === -1) {
        result += md.slice(idx);
        break;
      }
      result += md.slice(idx, match_idx) + delim;
      state = STATE_TEXT;
      idx = match_idx + delim.length;
    }
  }

  return state >= STATE_INLINE_MATH
    ? result + (state === STATE_INLINE_MATH ? DOLLAR : DOLLAR + DOLLAR) + md.slice(math_start)
    : result;
};
