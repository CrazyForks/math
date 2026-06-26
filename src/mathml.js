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
import lex from "./lex.js";
import parse from "./parse.js";

const MROW = "mrow",
  STYLES = [null, STYLE_BOX, STYLE_CANCEL, STYLE_SOUT],
  ESC_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  },
  esc = (str) => str.replace(/[&<>"]/g, (m) => ESC_MAP[m]),
  wrap = (tag_name, inner, attr) =>
    "<" + tag_name + (attr || "") + ">" + inner + "</" + tag_name + ">",
  tag = (name, val, attr) => wrap(name, esc(val), attr),
  nest = (name, ...ns) => wrap(name, ns.map(row).join("")),
  row = (n) => {
    if (!n) return wrap(MROW, "");
    const [type, val] = n;
    return type === TYPE_GROUP && !val[1]
      ? row(val[0])
      : type === TYPE_GROUP || type === TYPE_FUNC
        ? wrap(MROW, show(n))
        : show(n);
  },
  script = (n1, limits, display, inline) =>
    limits === 1 ||
    (!limits && (n1[1] === "∑" || (n1[0] === TYPE_FUNC && /^(lim|max|min|sup|inf)$/.test(n1[1]))))
      ? display
      : inline,
  SHOW_MAP = {
    [TYPE_IDENT]: (n) => tag("mi", n[1], n[2]),
    [TYPE_NUM]: (n) => tag("mn", n[1]),
    [TYPE_OP]: (n) => tag("mo", n[1], n[2]),
    [TYPE_FUNC]: (n) => tag("mi", n[1]) + "<mo>\u2061</mo>",
    [TYPE_GROUP]: (n) => n[1].map(show).join(""),
    [TYPE_FRAC]: (n) => nest("mfrac", n[1], n[2]),
    [TYPE_SUP]: (n) => nest(script(n[1], n[3], "mover", "msup"), n[1], n[2]),
    [TYPE_SUB]: (n) => nest(script(n[1], n[3], "munder", "msub"), n[1], n[2]),
    [TYPE_SUPSUB]: (n) => nest(script(n[1], n[4], "munderover", "msubsup"), n[1], n[2], n[3]),
    [TYPE_TEXT]: (n) => tag("mtext", n[1].replace(/ /g, "\u00A0")),
    [TYPE_SPACE]: (n) => '<mspace width="' + n[1] + '"></mspace>',
    [TYPE_MSQRT]: (n) => wrap("msqrt", row(n[1])),
    [TYPE_MROOT]: (n) => nest("mroot", n[1], n[2]),
    [TYPE_LEFT_RIGHT]: (n) => wrap(MROW, n[1].map(show).join("")),
    [TYPE_OVERLINE]: (n) => nest("mover", n[1], [TYPE_OP, "¯"]),
    [TYPE_MENCLOSE]: (n) => {
      const style = STYLES[n[1]];
      return style ? "<mrow" + style + ">" + row(n[2]) + "</mrow>" : row(n[2]);
    },
    [TYPE_MPHANTOM]: (n) => wrap("mphantom", row(n[1])),
    [TYPE_MATRIX]: (n) => {
      const is_cases = n[1] === "cases",
        has_rel =
          is_cases &&
          n[2].every((r) => {
            const node = r[1]?.[0];
            return !node || (node[0] === TYPE_OP && "=<≤≥≠≈≡∝>".includes(node[1]));
          }),
        inner = n[2]
          .map((r) =>
            wrap(
              "mtr",
              r
                .map((c, i) => {
                  const html = c.map(show).join("");
                  return wrap(
                    "mtd",
                    c[1] ? wrap(MROW, html) : html,
                    is_cases
                      ? ' style="text-align:left' +
                          (has_rel ? (i ? ";padding-left:0" : ";padding-right:0") : "") +
                          '"'
                      : "",
                  );
                })
                .join(""),
            ),
          )
          .join(""),
        tbl = wrap(
          "mtable",
          inner,
          is_cases
            ? ' columnalign="left" rowspacing=".2em" columnspacing="' +
                (has_rel ? "0" : "1em") +
                '"'
            : "",
        ),
        idx = "pbvVc".indexOf(n[1][0]);
      if (idx >= 0) {
        const d0 = "([|‖{"[idx],
          d1 = ")]‖‖"[idx] || "";
        return wrap(MROW, (d0 ? tag("mo", d0) : "") + tbl + (d1 ? tag("mo", d1) : ""));
      }
      return tbl;
    },
    [TYPE_LINEBREAK]: () => '<mspace linebreak="newline"></mspace>',
  },
  show = (n) => (n ? SHOW_MAP[n[0]](n) : "");

export default (tex, block) => {
  const clean = tex.replace(/[\r\n]+/g, " ");
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
