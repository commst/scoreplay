# zip 묶음을 풀어 샘플에 넣기: python3 ingest.py <zip...> → 새 PDF 목록을 /tmp/newN 에
import os,re,sys,hashlib,shutil,zipfile,collections
dst='/home/claude/samples'; have={f[:8] for f in os.listdir(dst)}
dec=lambda s: re.sub(r'#U([0-9a-fA-F]{4})',lambda m:chr(int(m.group(1),16)),s)
new=[];dup=0;seen=set();per=collections.Counter()
for z in sys.argv[1:]:
    with zipfile.ZipFile(z) as zf:
        for info in zf.infolist():
            n=info.filename
            if not (info.flag_bits & 0x800):
                try: n=n.encode('cp437').decode('utf-8')
                except Exception:
                    try: n=n.encode('cp437').decode('cp949')
                    except Exception: pass
            n=dec(n)
            if not n.lower().endswith('.pdf') or '__MACOSX' in n: continue
            data=zf.read(info); h=hashlib.md5(data).hexdigest()[:8]
            if h in seen: continue
            seen.add(h)
            if h in have: dup+=1; continue
            base=os.path.basename(n); folder=n.split('/')[0] if '/' in n else os.path.basename(z)
            p=f'{dst}/{h}-{base}'; open(p,'wb').write(data); new.append(p); per[folder]+=1
for k,v in per.items(): print(f'{k}: {v}')
print('new',len(new),'dup',dup,'total',len(os.listdir(dst)))
open('/tmp/newN','w').write('\n'.join(new))
