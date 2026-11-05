import json,collections
from fractions import Fraction as F
r=json.load(open('/home/claude/cmp/pairs.json'))
good=[p for p in r if p['ratio']>=0.6]
def ev(rs): 
    d={}
    for x in rs.split(','):
        if x: t,u=x.split('~'); d.setdefault(F(t),set()).add(F(u))
    return d
C=collections.Counter(); ex=collections.defaultdict(list)
for p in good:
    for y in p['rows']:
        if y['rok']: continue
        a,b=ev(y['prs']),ev(y['srs'])
        side=('P' if y['pw'] else '')+('S' if y['sw'] else '') or 'none'
        if not a or not b: k='한쪽 빈 마디'
        elif y['plen']!=y['slen']: k='마디 길이 다름'
        elif set(a)==set(b): k='시작 같고 길이만 다름'
        elif set(a)<set(b) or set(b)<set(a): k='한쪽에 음이 더 있음'
        else:
            k='시작 위치 다름'
        C[(k,side)]+=1; ex[(k,side)].append((p['part'],p['pline'],y['pn'],p['score'],p['sline'],y['sn']))
for k,v in sorted(C.items(),key=lambda x:-x[1]): print(v,k,ex[k][:2])
json.dump({f'{k[0]}|{k[1]}':v for k,v in ex.items()},open('/home/claude/cmp/rex.json','w'),ensure_ascii=False)
