const FALSE = ' stretchy="false"',
  space = (n) => ' lspace="' + n + 'px" rspace="' + n + 'px"';

export const ATTR_NORMAL = ' mathvariant="normal"',
  ATTR_STRETCHY_FALSE = FALSE,
  ATTR_BAR = FALSE + space(0),
  ATTR_BIN = space(4),
  ATTR_REL = space(5);
