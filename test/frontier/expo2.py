import librosa, numpy as np, json
sr=22050; NM=48
R=np.load('R.npy'); good=np.load('good2.npy'); Gs=np.load('Gs.npy'); groups=json.load(open('groups.json'))
fr=librosa.mel_frequencies(NM,fmin=60,fmax=10000)
tot=Gs.sum(0)+1e-12        # (NM,T)
share=Gs/tot
bands=[(60,250),(250,500),(500,1000),(1000,2000),(2000,4000),(4000,10000)]
ratio=10*np.log10((R+1e-12)/tot)
# 전체 기준: 모든 good 칸의 중앙값 (곡 전체 크기 차이)
base=np.median(ratio[:,good][tot[:,good]>np.percentile(tot[:,good],30)])
TH=float(__import__('sys').argv[1]) if len(__import__('sys').argv)>1 else 0.6
print('기준 칸 음원/우리 dB', round(base,1), 'TH',TH)
out={}
for gi,k in enumerate(groups):
    row=[];cnt=[]
    for a,b in bands:
        bm=(fr>=a)&(fr<b)
        m=(share[gi][bm]>TH)&good[None,:]&(tot[bm]>np.percentile(tot[bm],30))
        v=ratio[bm][m]
        row.append(float(np.median(v))-base if len(v)>=20 else None); cnt.append(int(m.sum()))
    vals=[x for x,c in zip(row,cnt) if x is not None]
    if not vals: print(f'{k:22s} 부족 {cnt}'); continue
    w=[c for x,c in zip(row,cnt) if x is not None]
    lvl=float(np.average(vals,weights=w))
    out[k]=dict(lvl=lvl,bands=[None if x is None else float(x) for x in row],cnt=cnt)
    print(f'{k:22s} 전체 {lvl:+5.1f}dB | '+' '.join('   .' if x is None else f'{x:+4.0f}' for x in row)+f' | 칸 {cnt}')
json.dump(out,open('expo2.json','w'),ensure_ascii=False)
