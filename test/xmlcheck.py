import sys, json, re
import xml.etree.ElementTree as ET
from fractions import Fraction as F
STEP = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def check(pre):
    root = ET.parse(f'xmlout/{pre}.musicxml').getroot()
    js = json.load(open(f'xmlout/{pre}.json'))
    names = {sp.get('id'): sp.findtext('part-name') for sp in root.iter('score-part')}
    jparts = [p for p in js['parts'] if p['role'] in ('melody', 'perc')]
    bars = js['measures']
    probs = []; tot = miss = extra = 0; stat = dict(notype=0, acc=0, beam=0, tup=0, grace=0, v2=0, twostaff=0)
    ji = 0
    for part in root.iter('part'):
        stv = part.find('measure/attributes/staves'); n = int(stv.text) if stv is not None else 1
        if n == 2: stat['twostaff'] += 1
        jl = jparts[ji:ji + n]; ji += n
        pname = names[part.get('id')]
        if any(j.get('name', '') not in pname and pname not in j.get('name', '') for j in jl): probs.append(f'part map {pname} vs {[j.get("name") for j in jl]}')
        for mi, me in enumerate(part.iter('measure')):
            b = bars[mi]; L = round(F(b['barLen']['n'], b['barLen']['d']) * 384)
            pos = 0; vend = {}; got = {}; last = 0
            for el in me:
                if el.tag == 'backup': pos -= int(el.findtext('duration')); continue
                if el.tag != 'note': continue
                if el.find('grace') is not None: stat['grace'] += 1; continue
                d = int(el.findtext('duration')); v = el.findtext('voice'); stf = int(el.findtext('staff') or 1)
                if int(v) % 4 == 2: stat['v2'] += 1
                if el.find('type') is None and not (el.find('rest') is not None and el.find('rest').get('measure') == 'yes'): stat['notype'] += 1
                if el.find('accidental') is not None: stat['acc'] += 1
                if el.find('beam') is not None: stat['beam'] += 1
                if el.find('notations/tuplet') is not None: stat['tup'] += 1
                if el.find('chord') is not None: st = last
                else: st = pos; last = pos; pos += d; vend[(stf, v)] = max(vend.get((stf, v), 0), pos)
                p = el.find('pitch')
                if p is not None and not any(t.get('type') == 'stop' for t in el.findall('tie')):
                    m = (int(p.findtext('octave')) + 1) * 12 + STEP[p.findtext('step')] + int(p.findtext('alter') or 0)
                    got.setdefault(stf, []).append((st, m))
            for k, e in vend.items():
                if e != L: probs.append(f'{pname} m{b["number"]} staff/voice {k} len {e} != {L}')
            for si, jp in enumerate(jl):
                if jp['role'] != 'melody': continue
                key = str(jp['id']); want = []
                def cont(e, mm):   # 앞 음과 이어지는 붙임줄인가 (이을 앞 음이 없으면 새 음)
                    t = F(e['t']['n'], e['t']['d'])
                    for k, bb in ((0, b), (1, bars[mi - 1] if mi > 0 else None)):
                        if not bb: continue
                        off = F(bb['barLen']['n'], bb['barLen']['d']) if k else 0
                        for p in bb['events']:
                            if p is e or p.get('line') != key or not p.get('midis') or mm not in p['midis']: continue
                            d = p.get('sus') or p['dur']
                            if F(p['t']['n'], p['t']['d']) + F(d['n'], d['d']) - off == t: return True
                    return False
                for e in b['events']:
                    if e.get('line') != key or not e.get('midis'): continue
                    if e.get('tie') and all(cont(e, mm) for mm in e['midis']): continue
                    st = round(F(e['t']['n'], e['t']['d']) * 384)
                    if st >= L: continue
                    for mm in set(e['midis']):
                        if e.get('tie') and cont(e, mm): continue
                        want.append((st, mm + 12 * (jp['settings'].get('oct') or 0)))
                ws, gs = sorted(set(want)), sorted(set(got.get(si + 1, []))); tot += len(ws)
                mi_ = [x for x in ws if x not in gs]; ex_ = [x for x in gs if x not in ws]
                miss += len(mi_); extra += len(ex_)
                if (mi_ or ex_) and len(probs) < 40: probs.append(f'{pname}/{si+1} m{b["number"]} missing {mi_[:4]} extra {ex_[:4]}')
    print(f'{pre}: notes {tot} missing {miss} extra {extra} | {stat} | problems {len(probs)}')
    for x in probs[:8]: print('   ', x)
for pre in sys.argv[1:]: check(pre)
