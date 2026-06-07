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
import { STYLE_BOX, STYLE_CANCEL, STYLE_SOUT } from "./const/STYL.js";
import { NOTATION_BOX, NOTATION_CANCEL, NOTATION_SOUT } from "./const/NOTATION.js";
import { LIMITS_DISPLAY, LIMITS_INLINE } from "./const/LIMITS.js";
import lex from "./lex.js";
import parse from "./parse.js";

const ENV_DELIMS = {
    __proto__: null,
    pmatrix: ["(", ")"],
    bmatrix: ["[", "]"],
    vmatrix: ["|", "|"],
    Vmatrix: ["‖", "‖"],
    cases: ["{", ""],
  },
  MROW = "mrow",
  NOTATION_STYLE_MAP = {
    [NOTATION_BOX]: STYLE_BOX,
    [NOTATION_CANCEL]: STYLE_CANCEL,
    [NOTATION_SOUT]: STYLE_SOUT,
  },
  ESC_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  },
  esc = (str) => (/[&<>"]/.test(str) ? str.replace(/[&<>"]/g, (m) => ESC_MAP[m]) : str),
  wrap = (tag_name, inner, attr) =>
    "<" + tag_name + (attr ?? "") + ">" + inner + "</" + tag_name + ">",
  tag = (name, val, attr) => wrap(name, esc(val), attr),
  nest = (name, n1, n2, n3) => wrap(name, row(n1) + row(n2) + (n3 ? row(n3) : "")),
  row = (n) => {
    if (!n) return wrap(MROW, "");
    const [type, val] = n;
    return type === TYPE_GROUP
      ? val[1]
        ? wrap(MROW, val.map(show).join(""))
        : row(val[0])
      : type === TYPE_FUNC
        ? wrap(MROW, show(n))
        : show(n);
  },
  scriptTag = ([type, val], limits, display, inline) =>
    limits === LIMITS_DISPLAY ||
    (limits !== LIMITS_INLINE &&
      (val === "∑" ||
        (type === TYPE_FUNC &&
          (val === "lim" || val === "max" || val === "min" || val === "sup" || val === "inf"))))
      ? display
      : inline,
  SHOW_MAP = {
    [TYPE_IDENT]: ([_, val, attr]) => tag("mi", val, attr),
    [TYPE_NUM]: ([_, val]) => tag("mn", val),
    [TYPE_OP]: ([_, val, attr]) => tag("mo", val, attr),
    [TYPE_FUNC]: ([_, val]) => tag("mi", val) + "<mo>\u2061</mo>",
    [TYPE_GROUP]: ([_, val]) => val.map(show).join(""),
    [TYPE_FRAC]: ([_, n1, n2]) => nest("mfrac", n1, n2),
    [TYPE_SUP]: ([_, n1, n2, limits]) => nest(scriptTag(n1, limits, "mover", "msup"), n1, n2),
    [TYPE_SUB]: ([_, n1, n2, limits]) => nest(scriptTag(n1, limits, "munder", "msub"), n1, n2),
    [TYPE_SUPSUB]: ([_, n1, n2, n3, limits]) =>
      nest(scriptTag(n1, limits, "munderover", "msubsup"), n1, n2, n3),
    [TYPE_TEXT]: ([_, val]) => tag("mtext", val.replace(/ /g, "\u00A0")),
    [TYPE_SPACE]: ([_, val]) => '<mspace width="' + val + '"></mspace>',
    [TYPE_MSQRT]: ([_, n1]) => wrap("msqrt", row(n1)),
    [TYPE_MROOT]: ([_, n1, n2]) => nest("mroot", n1, n2),
    [TYPE_LEFT_RIGHT]: ([_, val]) => wrap(MROW, val.map(show).join("")),
    [TYPE_OVERLINE]: ([_, n1]) => nest("mover", n1, [TYPE_OP, "¯"]),
    [TYPE_MENCLOSE]: ([_, notation, n1]) => {
      const style = NOTATION_STYLE_MAP[notation];
      return style ? "<mrow" + style + ">" + row(n1) + "</mrow>" : row(n1);
    },
    [TYPE_MPHANTOM]: ([_, n1]) => wrap("mphantom", row(n1)),
    [TYPE_MATRIX]: ([_, env_name, rows_cells]) => {
      const inner = rows_cells
          .map((row_cells) =>
            wrap(
              "mtr",
              row_cells
                .map((cell_nodes) => {
                  const inner_html = cell_nodes.map(show).join("");
                  return wrap("mtd", cell_nodes[1] ? wrap(MROW, inner_html) : inner_html);
                })
                .join(""),
            ),
          )
          .join(""),
        m_table = wrap("mtable", inner),
        delims = ENV_DELIMS[env_name];
      return delims
        ? wrap(
            MROW,
            (delims[0] ? tag("mo", delims[0]) : "") +
              m_table +
              (delims[1] ? tag("mo", delims[1]) : ""),
          )
        : m_table;
    },
    [TYPE_LINEBREAK]: () => '<mspace linebreak="newline"></mspace>',
  },
  show = (n) => (n ? SHOW_MAP[n[0]](n) : "");

export default (tex, block) => {
  const clean = tex.includes("\n") || tex.includes("\r") ? tex.replace(/[\r\n]+/g, " ") : tex;
  return (
    '<math xmlns="http://www.w3.org/1998/Math/MathML"' +
    (block ? ' display="block"' : "") +
    "><semantics><mrow>" +
    parse(lex(clean), [0]).map(show).join("") +
    '</mrow><annotation encoding="application/x-tex">' +
    esc(clean) +
    "</annotation></semantics></math>"
  );
};
