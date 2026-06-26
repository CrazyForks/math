import { TYPE_IDENT, TYPE_OP, TYPE_FUNC, TYPE_SPACE } from "./TYPE.js";
import { ATTR_NORMAL, ATTR_BIN, ATTR_REL } from "./ATTR.js";

export const SYM_MAP = { __proto__: null };

const parseSymbols = (str, type, attr) => {
  str.replace(/([a-zA-Z]+)([^a-zA-Z]+)/g, (m, k, v) => {
    SYM_MAP[k] = attr ? [type, v, attr] : [type, v];
  });
};

parseSymbols(
  "alphaαbetaβgammaγthetaθpiπdeltaδepsilonϵzetaζetaηiotaιkappaκlambdaλmuμnuνxiξrhoρsigmaσtauτupsilonυphiϕchiχpsiψomegaωellℓhbarℏneg¬",
  TYPE_IDENT,
);
parseSymbols(
  "DeltaΔGammaΓThetaΘLambdaΛXiΞPiΠSigmaΣUpsilonΥPhiΦPsiΨOmegaΩinfty∞nabla∇partial∂forall∀exists∃emptyset∅",
  TYPE_IDENT,
  ATTR_NORMAL,
);
parseSymbols(
  "prime′cdot⋅times×pm±div÷sum∑int∫leftrightarrow↔Leftarrow⇐Rightarrow⇒Leftrightarrow⇔cdots⋯in∈notin∉subset⊂supset⊃subseteq⊆supseteq⊇cup∪cap∩to→rightarrow→leftarrow←gets←dots…ldots…le≤leq≤ge≥geq≥",
  TYPE_OP,
);
parseSymbols("neq≠ne≠", TYPE_OP, ATTR_NORMAL);
parseSymbols("mp∓lor∨land∧", TYPE_OP, ATTR_BIN);
parseSymbols("approx≈sim∼cong≅propto∝equiv≡ni∋perp⟂parallel∥", TYPE_OP, ATTR_REL);

// 函数名直接并入 SYM_MAP，消除 FUNC_NAMES
"sin cos tan cot sec csc log lg ln lim exp max min sup inf det gcd arcsin arccos arctan sinh cosh tanh coth deg arg".replace(
  /\w+/g,
  (e) => (SYM_MAP[e] = [TYPE_FUNC, e]),
);

// 空格命令直接并入 SYM_MAP，消除 SPACE_MAP
SYM_MAP.quad = [TYPE_SPACE, "16px"];
SYM_MAP.qquad = [TYPE_SPACE, "32px"];
