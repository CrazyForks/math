import {
  TOK_EOF,
  TOK_NUM,
  TOK_IDENT,
  TOK_OP,
  TOK_CMD,
  TOK_SUB,
  TOK_SUP,
  TOK_LBRACE,
  TOK_RBRACE,
  TOK_LPAREN,
  TOK_RPAREN,
} from "./const/TOK.js";

const MASK_WHITESPACE = 9728,
  CHAR_DOT = 46,
  CHAR_TOK = {
    _: TOK_SUB,
    "^": TOK_SUP,
    "{": TOK_LBRACE,
    "}": TOK_RBRACE,
    "(": TOK_LPAREN,
    ")": TOK_RPAREN,
  },
  digit = (c) => c >= 48 && c <= 57,
  alpha = (c) => ((c | 32) - 97) >>> 0 < 26,
  skip = (str, idx, len) => {
    while (idx < len) {
      const code = str.charCodeAt(idx);
      if (code <= 32 && (code === 32 || (1 << code) & MASK_WHITESPACE)) {
        ++idx;
      } else {
        break;
      }
    }
    return idx;
  };

export default (str) => {
  const tokens = [],
    len = str.length;
  let idx = 0;
  while (idx < len) {
    idx = skip(str, idx, len);
    if (idx >= len) break;

    const code = str.charCodeAt(idx);
    if (code === 92) {
      const start = idx;
      ++idx;
      if (idx < len) {
        if (alpha(str.charCodeAt(idx))) {
          while (++idx < len && alpha(str.charCodeAt(idx)));
        } else {
          ++idx;
        }
      }
      const cmd = str.slice(start, idx);
      if (cmd === "\\text") {
        const temp_idx = skip(str, idx, len);
        if (str.charCodeAt(temp_idx) === 123) {
          let brace_count = 1,
            text_start = temp_idx + 1,
            text_idx = text_start;
          while (text_idx < len && brace_count) {
            const c_code = str.charCodeAt(text_idx);
            if (c_code === 123) {
              ++brace_count;
            } else if (c_code === 125) {
              --brace_count;
            }
            if (brace_count) {
              ++text_idx;
            }
          }
          if (!brace_count) {
            tokens.push(
              TOK_CMD,
              "\\text",
              TOK_LBRACE,
              "{",
              TOK_IDENT,
              str.slice(text_start, text_idx),
              TOK_RBRACE,
              "}",
            );
            idx = text_idx + 1;
            continue;
          }
        }
      }
      tokens.push(TOK_CMD, cmd);
      continue;
    }
    if (digit(code) || (code === CHAR_DOT && digit(str.charCodeAt(idx + 1)))) {
      const start = idx;
      if (code === CHAR_DOT) {
        idx += 2;
      } else {
        while (++idx < len && digit(str.charCodeAt(idx)));
        if (str.charCodeAt(idx) === CHAR_DOT && digit(str.charCodeAt(idx + 1))) {
          idx += 2;
        }
      }
      while (idx < len && digit(str.charCodeAt(idx))) ++idx;
      tokens.push(TOK_NUM, str.slice(start, idx));
      continue;
    }
    if (alpha(code)) {
      tokens.push(TOK_IDENT, str[idx]);
      ++idx;
      continue;
    }
    const char = str[idx];
    tokens.push(CHAR_TOK[char] ?? TOK_OP, char);
    ++idx;
  }
  tokens.push(TOK_EOF, "");
  return tokens;
};
