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
  SPACE_MAP = {
    __proto__: null,
    quad: "16px",
    qquad: "32px",
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
  },
  DELIM_MAP = {
    __proto__: null,
    "\\{": "{",
    "\\}": "}",
    "<": "⟨",
    ">": "⟩",
  },
  ident = (val) => [TYPE_IDENT, val],
  num = (val) => [TYPE_NUM, val],
  op = (val) => CHAR_MAP[val] ?? [TYPE_OP, val],
  lparen = () => CHAR_MAP["("],
  rparen = () => CHAR_MAP[")"],
  delim = (tokens, state_ref) => {
    const idx = state_ref[0],
      type = tokens[idx];
    if (type == null) return null;
    state_ref[0] += 2;
    const val = tokens[idx + 1];
    if (val === ".") return [TYPE_OP, "", ' fence="true" stretchy="true" symmetric="true"'];
    return [TYPE_OP, DELIM_MAP[val] ?? (val?.startsWith("\\") ? val.slice(1) : val)];
  },
  opt = (tokens, state_ref, check_num) => {
    if (tokens[state_ref[0]] === TOK_OP && tokens[state_ref[0] + 1] === "[") {
      if (!check_num || tokens[state_ref[0] + 2] === TOK_NUM) {
        state_ref[0] += 2;
        while (
          tokens[state_ref[0]] !== TOK_EOF &&
          !(tokens[state_ref[0]] === TOK_OP && tokens[state_ref[0] + 1] === "]")
        ) {
          state_ref[0] += 2;
        }
        if (tokens[state_ref[0]] === TOK_OP) state_ref[0] += 2;
      }
    }
  },
  brace = (tokens, state_ref) => {
    if (tokens[state_ref[0]] === TOK_LBRACE) {
      state_ref[0] += 2;
      let str = "";
      while (tokens[state_ref[0]] !== TOK_EOF && tokens[state_ref[0]] !== TOK_RBRACE) {
        str += tokens[state_ref[0] + 1];
        state_ref[0] += 2;
      }
      if (tokens[state_ref[0]] === TOK_RBRACE) state_ref[0] += 2;
      return str;
    }
    return "";
  },
  rows = (tokens, state_ref, is_end_check, env_name) => {
    const rows = [];
    let current_row = [],
      current_cell = [];
    while (state_ref[0] < tokens.length) {
      const next_type = tokens[state_ref[0]],
        next_val = tokens[state_ref[0] + 1];
      if (next_type === TOK_EOF) break;
      if (!is_end_check && next_type === TOK_RBRACE) break;
      if (is_end_check && next_type === TOK_CMD && next_val === "\\end") {
        const saved_idx = state_ref[0];
        state_ref[0] += 2;
        const end_name = brace(tokens, state_ref);
        if (end_name === env_name) {
          break;
        }
        state_ref[0] = saved_idx;
      }
      if (next_type === TOK_OP && next_val === "&") {
        state_ref[0] += 2;
        current_row.push(current_cell);
        current_cell = [];
        continue;
      }
      if (next_type === TOK_CMD && next_val === "\\\\") {
        state_ref[0] += 2;
        opt(tokens, state_ref, 1);
        current_row.push(current_cell);
        current_cell = [];
        rows.push(current_row);
        current_row = [];
        continue;
      }
      const node = grab(tokens, state_ref);
      if (node) current_cell.push(node);
    }
    if (current_cell.length || current_row.length) {
      current_row.push(current_cell);
      rows.push(current_row);
    }
    if (rows.length) {
      const last_row = rows[rows.length - 1];
      if (!last_row[1] && !last_row[0][0]) {
        rows.pop();
      }
    }
    return rows;
  },
  matrix = (tokens, state_ref, name) => {
    if (tokens[state_ref[0]] === TOK_LBRACE) {
      state_ref[0] += 2;
      const matrix_rows = rows(tokens, state_ref, 0, name);
      if (tokens[state_ref[0]] === TOK_RBRACE) state_ref[0] += 2;
      return [TYPE_MATRIX, name, matrix_rows];
    }
    const node = read(tokens, state_ref, 1);
    return node ? [TYPE_MATRIX, name, [[[node]]]] : null;
  },
  txt = (tokens, state_ref) => {
    if (tokens[state_ref[0]] === TOK_LBRACE) {
      const text_val = brace(tokens, state_ref);
      if (text_val === "") return [TYPE_GROUP, []];
      const parts = text_val.split("\\\\");
      if (parts.length > 1) {
        const nodes = [];
        parts.forEach((p, i) => {
          if (i > 0) nodes.push([TYPE_LINEBREAK]);
          if (p) nodes.push([TYPE_TEXT, p]);
        });
        return [TYPE_GROUP, nodes];
      }
      return [TYPE_TEXT, text_val];
    }
    const next_node = read(tokens, state_ref, 1);
    if (next_node) {
      return [TYPE_TEXT, next_node[1]];
    }
    throw [ERR_MISSING_BRACE, "text"];
  },
  parseBegin = (tokens, state_ref, val) => {
    if (tokens[state_ref[0]] === TOK_LBRACE) {
      const env_name = brace(tokens, state_ref);
      if (env_name === "array") {
        opt(tokens, state_ref);
        if (tokens[state_ref[0]] === TOK_LBRACE) {
          brace(tokens, state_ref);
        } else if (tokens[state_ref[0]] !== TOK_EOF) {
          state_ref[0] += 2;
        }
      }
      const array_rows = rows(tokens, state_ref, 1, env_name);
      return [TYPE_MATRIX, env_name, array_rows];
    }
    return [TYPE_IDENT, val];
  },
  sqrt = (tokens, state_ref) => {
    if (tokens[state_ref[0]] === TOK_OP && tokens[state_ref[0] + 1] === "[") {
      state_ref[0] += 2;
      const index_nodes = [];
      while (
        tokens[state_ref[0]] !== TOK_EOF &&
        !(tokens[state_ref[0]] === TOK_OP && tokens[state_ref[0] + 1] === "]")
      ) {
        const node = grab(tokens, state_ref);
        if (node) index_nodes.push(node);
      }
      if (tokens[state_ref[0]] === TOK_OP) state_ref[0] += 2;
      return [TYPE_MROOT, read(tokens, state_ref, 1), [TYPE_GROUP, index_nodes]];
    }
    return [TYPE_MSQRT, read(tokens, state_ref, 1)];
  },
  fence = (tokens, state_ref) => {
    const left_delim = delim(tokens, state_ref),
      body = parse(tokens, state_ref);
    if (tokens[state_ref[0]] === TOK_CMD && tokens[state_ref[0] + 1] === "\\right") {
      state_ref[0] += 2;
      return [TYPE_LEFT_RIGHT, [left_delim, ...body, delim(tokens, state_ref)].filter(Boolean)];
    }
    throw [ERR_MISSING_RIGHT, left_delim];
  },
  over = (tokens, state_ref) => [TYPE_OVERLINE, read(tokens, state_ref, 1)],
  frac = (tokens, state_ref) => [TYPE_FRAC, read(tokens, state_ref, 1), read(tokens, state_ref, 1)],
  phantom = (tokens, state_ref) => [TYPE_MPHANTOM, read(tokens, state_ref, 1)],
  pmod = (tokens, state_ref) => [
    TYPE_GROUP,
    [
      [TYPE_SPACE, "8px"],
      [TYPE_OP, "(", ATTR_STRETCHY_FALSE],
      [TYPE_TEXT, "mod"],
      [TYPE_SPACE, "4px"],
      read(tokens, state_ref, 1),
      [TYPE_OP, ")", ATTR_STRETCHY_FALSE],
    ],
  ],
  CMD_MAP = {
    __proto__: null,
    "\\": (tokens, state_ref) => {
      if (tokens[state_ref[0]] === TOK_OP && tokens[state_ref[0] + 1] === "*") {
        state_ref[0] += 2;
      }
      opt(tokens, state_ref, 1);
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
    begin: parseBegin,
    end: (tokens, state_ref, val, name) => {
      throw [ERR_EXTRA_END, name];
    },
    right: (tokens, state_ref, val, name) => {
      throw [ERR_EXTRA_RIGHT, name];
    },
  },
  TOK_MAP = {
    [TOK_IDENT]: ident,
    [TOK_OP]: op,
    [TOK_LPAREN]: lparen,
    [TOK_RPAREN]: rparen,
    [TOK_NUM]: num,
    [TOK_LBRACE]: (val, tokens, state_ref) => {
      const res = [TYPE_GROUP, parse(tokens, state_ref)];
      if (tokens[state_ref[0]] === TOK_RBRACE) state_ref[0] += 2;
      return res;
    },
    [TOK_CMD]: (val, tokens, state_ref) => {
      const name = val.slice(1),
        handler = CMD_MAP[name];
      if (handler) return handler(tokens, state_ref, val, name);
      if (ENV_NAMES.has(name)) {
        return matrix(tokens, state_ref, name) ?? ident(val);
      }
      const space = SPACE_MAP[name];
      if (space) return [TYPE_SPACE, space];
      const notation = MENCLOSE_MAP[name];
      if (notation) return [TYPE_MENCLOSE, notation, read(tokens, state_ref, 1)];
      if (FUNC_NAMES.has(name)) return [TYPE_FUNC, name];
      return SYM_MAP[name] ?? ident(val);
    },
  },
  read = (tokens, state_ref, split_num) => {
    const idx = state_ref[0],
      type = tokens[idx];
    if (type == null) return null;
    state_ref[0] += 2;
    let val = tokens[idx + 1];
    if (split_num && type === TOK_NUM && val[1]) {
      tokens.splice(state_ref[0], 0, TOK_NUM, val.slice(1));
      val = val[0];
    }
    return TOK_MAP[type]?.(val, tokens, state_ref) ?? null;
  },
  grab = (tokens, state_ref) => {
    const base = read(tokens, state_ref);
    if (!base) return null;
    let limits = LIMITS_DEFAULT;
    if (tokens[state_ref[0]] === TOK_CMD) {
      const limits_val = LIMITS_MAP[tokens[state_ref[0] + 1]];
      if (limits_val !== undefined) {
        limits = limits_val;
        state_ref[0] += 2;
      }
    }
    let sub = null,
      sup = null,
      type;
    while ((type = tokens[state_ref[0]]) != null) {
      if (type !== TOK_SUB && type !== TOK_SUP) break;
      state_ref[0] += 2;
      const val = read(tokens, state_ref, 1);
      if (type === TOK_SUB) sub = val;
      else sup = val;
    }
    return sub && sup
      ? [TYPE_SUPSUB, base, sub, sup, limits]
      : sub
        ? [TYPE_SUB, base, sub, limits]
        : sup
          ? [TYPE_SUP, base, sup, limits]
          : base;
  },
  parse = (tokens, state_ref) => {
    const nodes = [];
    let type;
    while ((type = tokens[state_ref[0]]) != null) {
      if (type === TOK_EOF || type === TOK_RBRACE) break;
      if (type === TOK_CMD && tokens[state_ref[0] + 1] === "\\right") break;
      const node = grab(tokens, state_ref);
      if (node) nodes.push(node);
    }
    return nodes;
  };

export default parse;
