#!/bin/bash
# reg2.sh <prev dir> <tool> : 2개씩 나눠 회귀
cd /home/claude/scoreplay
rm -f /tmp/rq?? /tmp/rq??.rv
split -n l/2 /tmp/readable /tmp/rq
for x in /tmp/rq??; do (tr '\n' '\0' < $x | xargs -0 -n 12 node --max-old-space-size=3000 $2 $1/score-parser.js 2>/dev/null | grep -E '^[0-9a-f]{8} |^TOTAL' > $x.rv) & done; wait
python3 -c "
import json,glob,collections
t=collections.Counter()
for f in glob.glob('/tmp/rq??.rv'):
  for l in open(f):
    if l.startswith('TOTAL'): t.update(json.loads(l[6:]))
print(dict(t))"
grep -hv TOTAL /tmp/rq??.rv > /tmp/rvall.txt
