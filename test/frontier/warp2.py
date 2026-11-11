import numpy as np, json, librosa
sr=22050; H=2048
wp=np.load('wp.npy'); ts=wp[:,0]*512/sr; tr=wp[:,1]*512/sr
R=np.load('R.npy'); T=R.shape[1]; recT=np.arange(T)*H/sr
# rec 시각 → syn 시각: 경로를 6초 창 국소 직선으로 매끈하게
synT=np.zeros(T); good=np.zeros(T,bool)
for k,t in enumerate(recT):
    m=np.abs(tr-t)<3
    if m.sum()<20: continue
    a,b=np.polyfit(tr[m],ts[m],1)
    synT[k]=a*t+b; good[k]=0.8<a<1.35
# 미세 지연: 10초마다 에너지 포락선 상호상관으로 ±0.4초 보정
meta=json.load(open('st0/meta.json'))
yall,_=librosa.load('st0/all.wav',sr=sr,mono=True)
rec,_=librosa.load('rec.wav',sr=sr,mono=True)
h=256
ea=librosa.onset.onset_strength(y=yall,sr=sr,hop_length=h); er=librosa.onset.onset_strength(y=rec,sr=sr,hop_length=h)
fa=lambda t: np.interp(t*sr/h, np.arange(len(ea)), ea)
corr=[]
for k0 in range(0,T,int(10*sr/H)):
    sl=np.arange(k0,min(T,k0+int(10*sr/H)))
    if good[sl].mean()<0.8: corr.append((recT[k0],None,None)); continue
    tt=np.arange(recT[sl[0]],recT[sl[-1]],h/sr)
    st=np.interp(tt,recT,synT); r=np.interp(tt*sr/h,np.arange(len(er)),er)
    best=(-1,0)
    for lag in np.arange(-0.4,0.41,0.02):
        c=np.corrcoef(fa(st+lag),r)[0,1]
        if c>best[0]: best=(c,lag)
    corr.append((recT[k0],best[0],best[1]))
    synT[sl]+=best[1]
for t,c,l in corr: print(f'{t:5.0f}s', 'skip' if c is None else f'onset corr {c:.2f} lag {l:+.2f}')
np.save('synT.npy',synT); np.save('good2.npy',good)
