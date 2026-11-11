import librosa, numpy as np, json
sr=22050; H=2048; NM=48
meta=json.load(open('st0/meta.json')); R=np.load('R.npy'); synT=np.load('synT.npy'); good=np.load('good2.npy')
def mel(y): return librosa.feature.melspectrogram(y=y,sr=sr,n_fft=4096,hop_length=H,n_mels=NM,fmin=60,fmax=10000,power=2.0)
key=lambda m: m['inst'] if m['role']=='melody' else 'perc:'+m['name'].split('/')[0].strip()
groups=[]; [groups.append(key(m)) for m in meta if key(m) not in groups]
G={}
for m in meta:
    y,_=librosa.load(m['file'],sr=sr,mono=True); M=mel(y)
    fi=np.clip(np.round(synT*sr/H).astype(int),0,M.shape[1]-1)
    G[key(m)]=G.get(key(m),0)+M[:,fi]
Gs=np.array([G[k] for k in groups]); np.save('Gs.npy',Gs); json.dump(groups,open('groups.json','w'))
tot=Gs.sum(0).sum(0)+1e-12; share=Gs.sum(1)/tot   # (n,T)
fr=librosa.mel_frequencies(NM,fmin=60,fmax=10000)
Rt=R.sum(0)
res={}
for gi,k in enumerate(groups):
    m=good&(share[gi]>0.7)&(tot>np.percentile(tot[tot>1e-9],20))
    n=int(m.sum())
    if n<15: print(f'{k:22s} 프레임 {n} (부족)'); continue
    lvl=10*np.log10(Rt[m]/tot[m])
    # 대역 모양: 각 프레임 정규화 후 평균 (dB)
    rs=10*np.log10(R[:,m]/R[:,m].sum(0)+1e-9).mean(1); ss=10*np.log10(Gs[gi][:,m]/Gs[gi][:,m].sum(0)+1e-9).mean(1)
    d=rs-ss
    bands=[(60,250),(250,500),(500,1000),(1000,2000),(2000,4000),(4000,10000)]
    bd=[float(np.mean(d[(fr>=a)&(fr<b)])) for a,b in bands]
    res[k]=dict(n=n,lvl=float(np.median(lvl)),iqr=float(np.subtract(*np.percentile(lvl,[75,25]))),bands=bd)
lv=np.median([v['lvl'] for v in res.values()])
for k,v in res.items():
    print(f"{k:22s} 프레임{v['n']:4d}  음원/우리 {v['lvl']-lv:+5.1f}dB (흩어짐 {v['iqr']:.0f})  대역 60-250 {v['bands'][0]:+.0f} 250-500 {v['bands'][1]:+.0f} 0.5-1k {v['bands'][2]:+.0f} 1-2k {v['bands'][3]:+.0f} 2-4k {v['bands'][4]:+.0f} 4-10k {v['bands'][5]:+.0f}")
json.dump(res,open('expo.json','w'),ensure_ascii=False)
