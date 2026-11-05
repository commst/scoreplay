import json,collections
r=json.load(open('/home/claude/cmp/pairs.json'))
good=[p for p in r if p['ratio']>=0.6]
def pmap(ps):
    d=collections.defaultdict(set)
    for x in ps.split(','):
        if x: t,m=x.split('@'); d[t].add(int(m))
    return d
pairc=[]
for p in good:
    diffs=collections.Counter(); n=0
    for y in p['rows']:
        if not y['rok'] or y['pok']: continue
        a,b=pmap(y['pps']),pmap(y['sps'])
        for t in a:
            if t in b and a[t]!=b[t] and len(a[t])==1 and len(b[t])==1:
                diffs[next(iter(b[t]))-next(iter(a[t]))]+=1
        n+=1
    if n: pairc.append((n,p['group'][:10],p['pname'][:22],p['slabel'][:10],diffs.most_common(4)))
pairc.sort(reverse=True)
for x in pairc[:40]: print(x)
