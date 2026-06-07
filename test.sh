#!/usr/bin/env bash

set -e
DIR=$(realpath $0) && DIR=${DIR%/*}
cd $DIR
set -x

./sh/check.js
bun x oxfmt
bun minify.js
bun x oxlint
bun test test/compare.test.js --only-failures
