import json,collections,re
r=json.load(open('/home/claude/cmp/pairs.json'))
good=[p for p in r if p['ratio']>=0.6]
c=collections.Counter(); wkinds=collections.Counter(); tot=0
pw_bars=sw_bars=0
for p in good:
    for y in p['rows']:
        tot+=1
        pw_bars+=bool(y['pw']); sw_bars+=bool(y['sw'])
        if y['rok'] and y['pok']: continue
        kind='rhythm' if not y['rok'] else 'pitch'
        side=('P' if y['pw'] else '')+('S' if y['sw'] else '') or 'none'
        c[(kind,side)]+=1
print('짝',len(good),'마디',tot,'파트 경고 마디',pw_bars,'총보 경고 마디',sw_bars)
for k,v in sorted(c.items()): print(k,v)
