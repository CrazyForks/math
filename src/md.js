const DOLLAR = "$",
  BACKTICK = "`",
  BACKSLASH = "\\";

export default (md, compile) => {
  const len = md.length;
  let res = "",
    idx = 0;

  while (idx < len) {
    const char = md[idx];

    if (char === BACKTICK) {
      const is_block = md[idx + 1] === BACKTICK && md[idx + 2] === BACKTICK,
        delim = is_block ? "```" : "`",
        step = is_block ? 3 : 1,
        end_pos = md.indexOf(delim, idx + step);
      if (end_pos === -1) {
        res += md.slice(idx);
        break;
      }
      res += md.slice(idx, end_pos + step);
      idx = end_pos + step;
      continue;
    }

    if (char === DOLLAR) {
      const is_block = md[idx + 1] === DOLLAR,
        delim = is_block ? "$$" : "$",
        step = is_block ? 2 : 1;
      let pos = idx + step;

      while (pos < len) {
        const cc = md[pos];
        if (cc === BACKSLASH) {
          pos += 2;
        } else if (md.startsWith(delim, pos)) {
          break;
        } else {
          ++pos;
        }
      }

      if (pos >= len) {
        res += md.slice(idx);
        break;
      }

      const content = md.slice(idx + step, pos);
      try {
        res += compile(content, is_block);
      } catch {
        res += delim + content + delim;
      }
      idx = pos + step;
      continue;
    }

    if (char === BACKSLASH && md[idx + 1] === DOLLAR) {
      res += DOLLAR;
      idx += 2;
      continue;
    }

    res += char;
    ++idx;
  }

  return res;
};
