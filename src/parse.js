import {
  TYPE_IDENT,
  TYPE_NUM,
  TYPE_OP,
  TYPE_SUP,
  TYPE_SUB,
  TYPE_SUPSUB,
  TYPE_FRAC,
  TYPE_GROUP,
  TYPE_FUNC,
  TYPE_MSQRT,
  TYPE_MROOT,
  TYPE_LEFT_RIGHT,
  TYPE_OVERLINE,
  TYPE_MATRIX,
  TYPE_LINEBREAK,
  TYPE_TEXT,
  TYPE_SPACE,
  TYPE_MENCLOSE,
  TYPE_MPHANTOM,
} from "./const/TYPE.js";
import {
  ERR_EXTRA_END,
  ERR_MISSING_RIGHT,
  ERR_EXTRA_RIGHT,
  ERR_MISSING_BRACE,
} from "./const/ERR.js";
import { ATTR_NORMAL, ATTR_STRETCHY_FALSE, ATTR_BAR } from "./const/ATTR.js";
import { ENV_NAMES } from "./const/ENV.js";
import { FUNC_NAMES } from "./const/FUNC.js";
import { SYM_MAP } from "./const/SYM.js";
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
import { NOTATION_BOX, NOTATION_CANCEL, NOTATION_SOUT } from "./const/NOTATION.js";
import { LIMITS_DEFAULT, LIMITS_DISPLAY, LIMITS_INLINE } from "./const/LIMITS.js";

const LIMITS_MAP = {
    "\\limits": LIMITS_DISPLAY,
    "\\nolimits": LIMITS_INLINE,
  },
  MENCLOSE_MAP = {
    __proto__: null,
    boxed: NOTATION_BOX,
    cancel: NOTATION_CANCEL,
    sout: NOTATION_SOUT,
  },
  CHAR_MAP = {
    "-": [TYPE_OP, "−"],
    "*": [TYPE_OP, "∗"],
    "/": [TYPE_OP, "/", ATTR_NORMAL],
    "(": [TYPE_OP, "(", ATTR_STRETCHY_FALSE],
    ")": [TYPE_OP, ")", ATTR_STRETCHY_FALSE],
    "[": [TYPE_OP, "[", ATTR_STRETCHY_FALSE],
    "]": [TYPE_OP, "]", ATTR_STRETCHY_FALSE],
    "|": [TYPE_OP, "|", ATTR_BAR],
    ".": [TYPE_OP, ".", ATTR_NORMAL],
    "'": [TYPE_OP, "′"],
  },
  delim = (tokens, ref) => {
    const idx = ref[0];
    if (tokens[idx] == null) return null;
    ref[0] += 2;
    const val = tokens[idx + 1];
    if (val === ".") return [TYPE_OP, "", ' fence="true" stretchy="true" symmetric="true"'];
    return [TYPE_OP, val === "<" ? "⟨" : val === ">" ? "⟩" : val[0] === "\\" ? val.slice(1) : val];
  },
  opt = (tokens, ref, check_num) => {
    let idx = ref[0];
    if (tokens[idx] === TOK_OP && tokens[idx + 1] === "[") {
      if (!check_num || tokens[idx + 2] === TOK_NUM) {
        idx += 2;
        while (tokens[idx] > 0 && (tokens[idx] !== TOK_OP || tokens[idx + 1] !== "]")) {
          idx += 2;
        }
        tokens[idx] === TOK_OP && (idx += 2);
        ref[0] = idx;
      }
    }
  },
  brace = (tokens, ref) => {
    let idx = ref[0];
    if (tokens[idx] === TOK_LBRACE) {
      idx += 2;
      let str = "";
      while (tokens[idx] > 0 && tokens[idx] !== TOK_RBRACE) {
        str += tokens[idx + 1];
        idx += 2;
      }
      tokens[idx] === TOK_RBRACE && (idx += 2);
      ref[0] = idx;
      return str;
    }
    return "";
  },
  rows = (tokens, ref, end_check, env) => {
    const rows = [];
    let row = [],
      cell = [];
    while (tokens[ref[0]] > 0) {
      const type = tokens[ref[0]],
        val = tokens[ref[0] + 1];
      if (!end_check && type === TOK_RBRACE) break;
      if (end_check && type === TOK_CMD && val === "\\end") {
        const pos = ref[0];
        ref[0] += 2;
        const end = brace(tokens, ref);
        if (end === env) {
          break;
        }
        ref[0] = pos;
      }
      if ((type === TOK_OP && val === "&") || (type === TOK_CMD && val === "\\\\")) {
        ref[0] += 2;
        const is_row = val === "\\\\";
        is_row && opt(tokens, ref, 1);
        row.push(cell);
        cell = [];
        if (is_row) {
          rows.push(row);
          row = [];
        }
        continue;
      }
      const node = grab(tokens, ref);
      if (node) cell.push(node);
    }
    (cell.length || row.length) && (row.push(cell), rows.push(row));
    if (rows.length && !rows[rows.length - 1][1] && !rows[rows.length - 1][0][0]) {
      rows.pop();
    }
    return rows;
  },
  matrix = (tokens, ref, name) => {
    if (tokens[ref[0]] === TOK_LBRACE) {
      ref[0] += 2;
      const res = rows(tokens, ref, 0, name);
      if (tokens[ref[0]] === TOK_RBRACE) ref[0] += 2;
      return [TYPE_MATRIX, name, res];
    }
    const node = read(tokens, ref, 1);
    return node ? [TYPE_MATRIX, name, [[[node]]]] : null;
  },
  txt = (tokens, ref) => {
    if (tokens[ref[0]] === TOK_LBRACE) {
      const val = brace(tokens, ref);
      if (val === "") return [TYPE_GROUP, []];
      const parts = val.split("\\\\");
      if (parts.length > 1) {
        const nodes = [];
        parts.forEach(
          (p, i) => (i && nodes.push([TYPE_LINEBREAK]), p && nodes.push([TYPE_TEXT, p])),
        );
        return [TYPE_GROUP, nodes];
      }
      return [TYPE_TEXT, val];
    }
    const node = read(tokens, ref, 1);
    if (node) {
      return [TYPE_TEXT, node[1]];
    }
    throw [ERR_MISSING_BRACE, "text"];
  },
  begin = (tokens, ref, val) => {
    if (tokens[ref[0]] === TOK_LBRACE) {
      const env = brace(tokens, ref);
      if (env === "array") {
        opt(tokens, ref);
        tokens[ref[0]] === TOK_LBRACE
          ? brace(tokens, ref)
          : tokens[ref[0]] !== TOK_EOF && (ref[0] += 2);
      }
      const res = rows(tokens, ref, 1, env);
      return [TYPE_MATRIX, env, res];
    }
    return [TYPE_IDENT, val];
  },
  sqrt = (tokens, ref) => {
    if (tokens[ref[0]] === TOK_OP && tokens[ref[0] + 1] === "[") {
      ref[0] += 2;
      const nodes = [];
      while (tokens[ref[0]] > 0 && (tokens[ref[0]] !== TOK_OP || tokens[ref[0] + 1] !== "]")) {
        const node = grab(tokens, ref);
        if (node) nodes.push(node);
      }
      if (tokens[ref[0]] === TOK_OP) ref[0] += 2;
      return [TYPE_MROOT, read(tokens, ref, 1), [TYPE_GROUP, nodes]];
    }
    return [TYPE_MSQRT, read(tokens, ref, 1)];
  },
  fence = (tokens, ref) => {
    const left = delim(tokens, ref),
      body = parse(tokens, ref);
    if (tokens[ref[0]] === TOK_CMD && tokens[ref[0] + 1] === "\\right") {
      ref[0] += 2;
      return [TYPE_LEFT_RIGHT, [left, ...body, delim(tokens, ref)].filter(Boolean)];
    }
    throw [ERR_MISSING_RIGHT, left];
  },
  over = (tokens, ref) => [TYPE_OVERLINE, read(tokens, ref, 1)],
  frac = (tokens, ref) => [TYPE_FRAC, read(tokens, ref, 1), read(tokens, ref, 1)],
  phantom = (tokens, ref) => [TYPE_MPHANTOM, read(tokens, ref, 1)],
  pmod = (tokens, ref) => [
    TYPE_GROUP,
    [
      [TYPE_SPACE, "8px"],
      [TYPE_OP, "(", ATTR_STRETCHY_FALSE],
      [TYPE_TEXT, "mod"],
      [TYPE_SPACE, "4px"],
      read(tokens, ref, 1),
      [TYPE_OP, ")", ATTR_STRETCHY_FALSE],
    ],
  ],
  CMD_MAP = {
    __proto__: null,
    "\\": (tokens, ref) => {
      tokens[ref[0]] === TOK_OP && tokens[ref[0] + 1] === "*" && (ref[0] += 2);
      opt(tokens, ref, 1);
      return [TYPE_LINEBREAK];
    },
    text: txt,
    frac,
    overline: over,
    bar: over,
    sqrt,
    left: fence,
    phantom,
    pmod,
    begin,
    end: (tokens, ref, val, name) => {
      throw [ERR_EXTRA_END, name];
    },
    right: (tokens, ref, val, name) => {
      throw [ERR_EXTRA_RIGHT, name];
    },
  },
  TOK_MAP = {
    [TOK_IDENT]: (val) => [TYPE_IDENT, val],
    [TOK_OP]: (val) => CHAR_MAP[val] ?? [TYPE_OP, val],
    [TOK_LPAREN]: () => CHAR_MAP["("],
    [TOK_RPAREN]: () => CHAR_MAP[")"],
    [TOK_NUM]: (val) => [TYPE_NUM, val],
    [TOK_LBRACE]: (val, tokens, ref) => {
      const res = [TYPE_GROUP, parse(tokens, ref)];
      tokens[ref[0]] === TOK_RBRACE && (ref[0] += 2);
      return res;
    },
    [TOK_CMD]: (val, tokens, ref) => {
      const name = val.slice(1),
        handler = CMD_MAP[name];
      return handler
        ? handler(tokens, ref, val, name)
        : ENV_NAMES[name]
          ? (matrix(tokens, ref, name) ?? [TYPE_IDENT, val])
          : MENCLOSE_MAP[name]
            ? [TYPE_MENCLOSE, MENCLOSE_MAP[name], read(tokens, ref, 1)]
            : FUNC_NAMES[name]
              ? [TYPE_FUNC, name]
              : (SYM_MAP[name] ?? [TYPE_IDENT, val]);
    },
  },
  read = (tokens, ref, split_num) => {
    const idx = ref[0],
      type = tokens[idx];
    if (!type) return null;
    let val = tokens[idx + 1];
    const offset = ref[1];
    offset && (val = val.slice(offset));
    if (split_num && type === TOK_NUM && val[1]) {
      ref[1] = (offset || 0) + 1;
      val = val[0];
    } else {
      ref[0] += 2;
      ref[1] = 0;
    }
    return TOK_MAP[type]?.(val, tokens, ref) ?? null;
  },
  grab = (tokens, ref) => {
    const base = read(tokens, ref);
    if (!base) return null;
    let limits = LIMITS_DEFAULT;
    const idx = ref[0];
    if (tokens[idx] === TOK_CMD) {
      const lim = LIMITS_MAP[tokens[idx + 1]];
      if (lim) {
        limits = lim;
        ref[0] += 2;
      }
    }
    let sub = null,
      sup = null,
      type;
    while ((type = tokens[ref[0]]) > 0) {
      if (type === TOK_OP && tokens[ref[0] + 1] === "'") {
        let count = 0;
        while (tokens[ref[0]] === TOK_OP && tokens[ref[0] + 1] === "'") (count++, (ref[0] += 2));
        sup = [TYPE_OP, "′".repeat(count)];
        continue;
      }
      if (type !== TOK_SUB && type !== TOK_SUP) break;
      ref[0] += 2;
      if (type === TOK_SUB) sub = read(tokens, ref, 1);
      else sup = read(tokens, ref, 1);
    }
    return sub
      ? sup
        ? [TYPE_SUPSUB, base, sub, sup, limits]
        : [TYPE_SUB, base, sub, limits]
      : sup
        ? [TYPE_SUP, base, sup, limits]
        : base;
  },
  parse = (tokens, ref) => {
    const nodes = [];
    let type;
    while ((type = tokens[ref[0]]) > 0) {
      if (type === TOK_RBRACE) break;
      if (type === TOK_CMD && tokens[ref[0] + 1] === "\\right") break;
      const node = grab(tokens, ref);
      if (node) nodes.push(node);
    }
    return nodes;
  };

export default parse;
