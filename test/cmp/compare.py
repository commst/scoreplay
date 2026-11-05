# 총보↔파트보 마디 대조. python3 compare.py → 요약 출력, /home/claude/cmp/pairs.json(마디별 결과)
import json,os,re,difflib,collections
from fractions import Fraction as Fr
man=json.load(open('/home/claude/manifest.json'))
D=os.environ.get('DUMP','/home/claude/dump')
def load(h):
    p=f'{D}/{h}.json'
    return json.load(open(p)) if os.path.exists(p) else None
def group_of(path,zipn):
    d=os.path.dirname(path) or zipn
    top=d.split('/')[0]
    if top.startswith('24. 멋으로사는세상'): return d
    return top
groups=collections.OrderedDict()
seen=set()
for m in man:
    g=group_of(m['path'],m['zip'])
    if (g,m['md5']) in seen: continue
    seen.add((g,m['md5'])); groups.setdefault(g,[]).append(m)
SCORE_RE=re.compile(r'총보|score|스코|full ?score',re.I)
def is_score(m,j):
    b=os.path.basename(m['path'])
    nl=len(j['lines'])
    if re.search(r'full score\s*-\s*\S',b,re.I): return False   # '…Full Score - 대금' = 파트보
    return nl>=7 or (SCORE_RE.search(b) and nl>=3)
NE=lambda b: b['ne']>0
def seqsig(bars): return [b['rs'] if NE(b) else 'REST' for b in bars]
def match(pbars,sbars):
    a=seqsig(pbars); b=seqsig(sbars)
    sm=difflib.SequenceMatcher(None,a,b,autojunk=False)
    pairs=[]
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag in('equal','replace') and (i2-i1)==(j2-j1):
            pairs+= [(i1+k,j1+k) for k in range(i2-i1)]
    # 마디 번호로 맞대기도 해 보고 일치가 더 많은 쪽 (반복이 많은 곡에서 서열 정렬이 비슷한 마디끼리 엇갈리는 것)
    idx={x['n']:j for j,x in enumerate(sbars)}
    pn=[(i,idx[x['n']]) for i,x in enumerate(pbars) if x['n'] in idx]
    okn=sum(1 for i,j in pn if NE(pbars[i]) and a[i]==b[j])
    ok0=sum(1 for i,j in pairs if NE(pbars[i]) and a[i]==b[j])
    if okn>=ok0: pairs=pn
    ok=sum(1 for i,j in pairs if NE(pbars[i]) and a[i]==b[j])
    okp=sum(1 for i,j in pairs if NE(pbars[i]) and a[i]==b[j] and pbars[i]['ps']==sbars[j]['ps'])
    tot=sum(1 for b_ in pbars if NE(b_)) or 1
    return ok/tot,pairs,okp/tot
def merge2(bars,off=0):
    # 두 마디를 한 마디로 (판마다 마디를 두 배로 나눈 경우: Flowers of K 총보 3/2 ↔ 파트보 3/4)
    out=list(bars[:off])
    for i in range(off,len(bars)-1,2):
        a,b=bars[i],bars[i+1]; L=Fr(a['len'])
        sh=lambda sig,sep: [x for x in sig.split(',') if x]
        def shift(sig,sep):
            r=[]
            for x in sig.split(','):
                if not x: continue
                t,rest=x.split(sep,1); r.append(str(Fr(t)+L).replace(' ','')+sep+rest)
            return r
        rs=sorted(set(sh(a['rs'],'~')+shift(b['rs'],'~'))); ps=sorted(set(sh(a['ps'],'@')+shift(b['ps'],'@')))
        out.append({'n':a['n'],'len':str(L+Fr(b['len'])),'rs':','.join(rs),'ps':','.join(ps),'w':a['w']+b['w'],'k':a['k'],'ne':a['ne']+b['ne']})
    return out
EXTRA_SCORES={'15. 아침을 두드리는 소리':['5693b576']}
res=[];summary=[]
for g,ms in groups.items():
    js={m['md5']:load(m['md5']) for m in ms}
    js={k:v for k,v in js.items() if v and 'lines' in v}
    names={m['md5']:os.path.basename(m['path']) for m in ms}
    scores=[h for h in js if is_score(next(m for m in ms if m['md5']==h),js[h])]
    for h in EXTRA_SCORES.get(g,[]):
        if load(h): js[h]=load(h); scores.append(h)
    parts=[h for h in js if h not in scores]
    if g.startswith('19. 신뱃놀이'):
        scores=[h for h in scores if '신뱃놀이' in names[h]]; parts=[h for h in parts if names[h].startswith('신뱃놀이')]
    if not scores:
        summary.append((g,'(총보 없음: 학습용)',len(parts),'','')); continue
    for ph in parts:
        for pl,pline in enumerate(js[ph]['lines']):
            best=None
            for sh in scores:
                for sl,sline in enumerate(js[sh]['lines']):
                    for mg in (False,0,1):
                        pbars=merge2(pline['bars'],mg) if mg is not False else pline['bars']
                        r,pairs,rp=match(pbars,sline['bars'])
                        r=r+0.3*rp   # 리듬이 같은 줄이 여럿이면 음높이도 맞는 줄 (대금↔피리 같은 제창)
                        if mg is not False: r-=0.05   # 합치지 않은 쪽을 먼저
                        if not best or r>best[0]: best=(r,sh,sl,pairs,mg)
            r,sh,sl,pairs,mg=best
            r,_,_=match(merge2(pline['bars'],mg) if mg is not False else pline['bars'],js[sh]['lines'][sl]['bars'])
            pb=merge2(pline['bars'],mg) if mg is not False else pline['bars']; sb=js[sh]['lines'][sl]['bars']
            rows=[]
            for i,j in pairs:
                x,y=pb[i],sb[j]
                if not (NE(x) or NE(y)): continue
                rows.append({'pn':x['n'],'sn':y['n'],'rok':x['rs']==y['rs'],'pok':x['ps']==y['ps'],'pw':x['w'],'sw':y['w'],'prs':x['rs'],'srs':y['rs'],'pps':x['ps'],'sps':y['ps'],'plen':x['len'],'slen':y['len']})
            res.append({'group':g,'part':ph,'pname':names[ph],'pline':pl,'plabel':pline['name'],'score':sh,'sline':sl,'slabel':js[sh]['lines'][sl]['name'],'ratio':r,'merged':mg,'nbars':len(pb),'sbars':len(sb),'rows':rows})
json.dump(res,open('/home/claude/cmp/pairs.json','w'),ensure_ascii=False)
# 요약
for g in groups:
    rr=[x for x in res if x['group']==g]
    if not rr:
        s=[x for x in summary if x[0]==g]; print(f'{g}: {s[0][1] if s else "읽을 악보 없음"}'); continue
    good=[x for x in rr if x['ratio']>=0.6]; 
    rows=[y for x in good for y in x['rows']]
    rd=sum(1 for y in rows if not y['rok']); pd=sum(1 for y in rows if y['rok'] and not y['pok'])
    print(f"{g}: 파트줄 {len(rr)} (일치율≥60% {len(good)}), 마디 {len(rows)}, 리듬 다름 {rd}, 음높이만 다름 {pd} | 낮은 짝: "+', '.join(f"{x['pname'][:14]}{'#'+str(x['pline']) if x['pline'] else ''}={x['ratio']:.0%}" for x in rr if x['ratio']<0.6)[:200])
