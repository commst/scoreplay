# python3 show.py <파트 접두어> [줄] [rhythm|pitch] [개수] → 다른 마디와 crop 명령
import json,sys,subprocess
r=json.load(open('/home/claude/cmp/pairs.json'))
pre=sys.argv[1]; pl=int(sys.argv[2]) if len(sys.argv)>2 else 0; kind=sys.argv[3] if len(sys.argv)>3 else 'any'; n=int(sys.argv[4]) if len(sys.argv)>4 else 3
p=[x for x in r if x['part']==pre and x['pline']==pl][0]
print(p['pname'],'#',pl,'↔',p['score'],'줄',p['sline'],p['slabel'],f"{p['ratio']:.0%}")
k=0
for y in p['rows']:
    bad=(not y['rok']) if kind=='rhythm' else (y['rok'] and not y['pok']) if kind=='pitch' else not(y['rok'] and y['pok'])
    if not bad: continue
    print(f" P{y['pn']} S{y['sn']} len {y['plen']}/{y['slen']} pw={y['pw']} sw={y['sw']}\n   P {y['pps'] if kind=='pitch' else y['prs']}\n   S {y['sps'] if kind=='pitch' else y['srs']}")
    k+=1
    if k>=n: break
