# 내보낸 MusicXML의 짜임 검사: 붙임줄·이음줄·셋잇단 짝, 성부 길이, <type> 없는 음
import sys, xml.etree.ElementTree as ET, collections
tot = collections.Counter()
for f in sys.argv[1:]:
    root = ET.parse(f).getroot(); c = collections.Counter()
    for part in root.iter('part'):
        open_t = {}; open_s = collections.Counter()
        div = 96
        for me in part.iter('measure'):
            tup = {}
            for n in me.iter('note'):
                stf = n.findtext('staff') or '1'; v = (stf, n.findtext('voice'))
                p = n.find('pitch')
                if p is not None:
                    key = (stf, p.findtext('step'), p.findtext('alter'), p.findtext('octave'))
                    ts = [t.get('type') for t in n.findall('tie')]
                    if 'stop' in ts:
                        c['ties'] += 1
                        if key in open_t: open_t.pop(key)
                        else: c['tie_stop_orphan'] += 1
                    if 'start' in ts: open_t[key] = 1
                for sl in n.iter('slur'):
                    if sl.get('type') == 'start': open_s[stf] += 1; c['slurs'] += 1
                    else: open_s[stf] -= 1
                if n.find('chord') is None and n.find('grace') is None:
                    for t in n.iter('tuplet'):
                        if t.get('type') == 'start':
                            if tup.get(v): c['tuplet_nested'] += 1
                            tup[v] = 1
                        else:
                            if not tup.get(v): c['tuplet_stop_orphan'] += 1
                            tup[v] = 0
                if n.find('type') is None and n.find('grace') is None and not (n.find('rest') is not None and n.find('rest').get('measure') == 'yes'): c['no_type'] += 1
            c['tuplet_open_at_bar_end'] += sum(1 for x in tup.values() if x)
        c['tie_start_orphan'] += len(open_t)
        c['slur_unbalanced'] += sum(abs(x) for x in open_s.values())
    tot.update(c)
    bad = {k: v for k, v in c.items() if k not in ('ties', 'slurs') and v}
    if bad: print(f.split('/')[-1], dict(c))
print('TOTAL', dict(tot))
