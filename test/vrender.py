import verovio, sys, re
src, out, mfrom, mto = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
parts = sys.argv[5].split(',') if len(sys.argv) > 5 else None
s = open(src, encoding='utf-8').read()
# 필요한 마디만 남기기 (첫 마디의 attributes는 유지하기 위해 1마디 attributes를 복사)
def trim(body):
    ms = re.findall(r'<measure number="[^"]+">.*?</measure>\n', body, re.S)
    first_attr = re.search(r'<attributes>.*?</attributes>', ms[0], re.S).group(0)
    keep = []; last_attr = {}
    for m in ms:
        n = int(re.search(r'number="(\d+)', m).group(1))
        for k in ('key', 'time', 'staves'):
            g = re.search(r'<%s>.*?</%s>' % (k, k), m, re.S)
            if g: last_attr[k] = g.group(0)
        cl = re.findall(r'<clef[^>]*>.*?</clef>', m, re.S)
        if cl: last_attr['clef'] = ''.join(cl)
        if mfrom <= n <= mto:
            if not keep:
                m = re.sub(r'<attributes>.*?</attributes>\n?', '', m, flags=re.S)
                attr = '<attributes><divisions>96</divisions>' + last_attr.get('key', '') + last_attr.get('time', '') + last_attr.get('staves', '') + last_attr.get('clef', '') + '</attributes>\n'
                m = re.sub(r'(<measure number="[^"]+">\n)', r'\1' + attr.replace('\\', '\\\\'), m, count=1)
            keep.append(m)
    return ''.join(keep)
names = dict(re.findall(r'<score-part id="(P\d+)"><part-name>([^<]*)', s))
def part_sub(mo):
    pid = mo.group(1)
    if parts and not any(p in names[pid] for p in parts): return ''
    return '<part id="%s">\n' % pid + trim(mo.group(2)) + '</part>\n'
s2 = re.sub(r'<part id="(P\d+)">\n(.*?)</part>\n', part_sub, s, flags=re.S)
if parts:
    s2 = re.sub(r'<score-part id="(P\d+)">.*?</score-part>\n', lambda mo: mo.group(0) if any(p in names[mo.group(1)] for p in parts) else '', s2, flags=re.S)
tk = verovio.toolkit(); tk.setOptions({'pageWidth': 2400, 'pageHeight': 3000, 'scale': 40, 'adjustPageHeight': True, 'breaks': 'auto'})
tk.loadData(s2)
open(out, 'w').write(tk.renderToSVG(1))
print('pages', tk.getPageCount())
