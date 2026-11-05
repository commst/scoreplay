#!/bin/bash
# regall.sh <이전 해석기 폴더> → /tmp/rv_*.txt, 요약
cd /home/claude/scoreplay
rm -f /tmp/rg?? /tmp/rg??.rv
split -n l/8 /tmp/readable /tmp/rg
for x in /tmp/rg??; do (tr '\n' '\0' < $x | xargs -0 -n 15 node --max-old-space-size=4000 ${TOOL:-test/regrv.mjs} $1/score-parser.js 2>/dev/null | grep -E '^[0-9a-f]{8} |^TOTAL' > $x.rv) & done; wait
cat /tmp/rg??.rv | grep -v 'changed 0 \|TOTAL' > /tmp/rvall.txt
python3 -c "
import json,glob,collections
t=collections.Counter()
for f in glob.glob('/tmp/rg??.rv'):
  for l in open(f):
    if l.startswith('TOTAL'): d=json.loads(l[6:]); t.update(d)
print(t)"
