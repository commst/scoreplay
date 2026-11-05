import sys,re
src,dst,k=sys.argv[1],sys.argv[2],float(sys.argv[3])
s=open(src,encoding='utf-8').read()
mm=float(re.search(r'<millimeters>([^<]*)',s).group(1))
def sc(tag):
    global s
    s=re.sub(r'<%s>([\d.]+)</%s>'%(tag,tag), lambda m:'<%s>%.1f</%s>'%(tag,float(m.group(1))/k,tag), s)
for t in ('page-height','page-width','left-margin','right-margin','top-margin','bottom-margin','system-distance','top-system-distance','staff-distance'): sc(t)
s=re.sub(r' width="([\d.]+)"', lambda m:' width="%.1f"'%(float(m.group(1))/k), s)
s=s.replace('<millimeters>%s'%re.search(r'<millimeters>([^<]*)',s).group(1), '<millimeters>%.4f'%(mm*k))
open(dst,'w',encoding='utf-8').write(s)
