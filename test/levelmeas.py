# 음량 시험 악보 줄별 WAV(test/levelstems.mjs 출력 폴더)의 크기: K 가중 0.1·0.4초 창 상위 10%.  python3 test/levelmeas.py <폴더>  (/tmp/levelref.musicxml.json 사용)
import soundfile as sf, numpy as np, json, pyloudnorm as pyln, sys
d=sys.argv[1]; parts=json.load(open('/tmp/levelref.musicxml.json'))
def kw(y,sr):
    m=pyln.Meter(sr); 
    # K 가중 필터만 적용
    for f in m._filters.values(): y=f.apply_filter(y)
    return y
res={}
for i,pt in enumerate(parts):
    y,sr=sf.read(f'{d}/{i:02d}.wav'); y=y if y.ndim==1 else y.mean(1)
    k=kw(y,sr)
    out=[]
    for w in (0.1,0.4):
        W=int(w*sr); e=np.array([np.mean(k[j:j+W]**2) for j in range(0,len(k)-W,W//2)])
        e=e[e>1e-9]; out.append(10*np.log10(np.percentile(e,90))-0.691)
    res[pt['name']]=dict(t100=out[0],t400=out[1])
    print(f"{pt['name']:12s} 0.1초 상위10% {out[0]:6.1f}   0.4초 {out[1]:6.1f}   차 {out[0]-out[1]:4.1f}")
json.dump(res,open(f'{d}/k.json','w'),ensure_ascii=False)
