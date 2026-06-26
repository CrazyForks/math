export default (md, compile) => {
  const len = md.length;
  let res = "",
    idx = 0;

  while (idx < len) {
    const char = md[idx];

    if (char === "`") {
      const block = md[idx + 1] === "`" && md[idx + 2] === "`",
        delim = block ? "```" : "`",
        step = block ? 3 : 1,
        end = md.indexOf(delim, idx + step);
      if (end === -1) {
        res += md.slice(idx);
        break;
      }
      res += md.slice(idx, end + step);
      idx = end + step;
      continue;
    }

    if (char === "$") {
      const block = md[idx + 1] === "$",
        delim = block ? "$$" : "$",
        step = block ? 2 : 1;
      let pos = idx + step;

      while (pos < len) {
        const cc = md[pos];
        if (cc === "\\") pos += 2;
        else if (md.startsWith(delim, pos)) break;
        else ++pos;
      }

      if (pos >= len) {
        res += md.slice(idx);
        break;
      }

      const content = md.slice(idx + step, pos);
      try {
        res += compile(content, block);
      } catch {
        res += delim + content + delim;
      }
      idx = pos + step;
      continue;
    }

    if (char === "\\" && md[idx + 1] === "$") {
      res += "$";
      idx += 2;
      continue;
    }

    res += char;
    ++idx;
  }

  return res;
};
