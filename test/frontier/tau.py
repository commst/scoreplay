import numpy as np, librosa, sys
sr=22050; h=256
synT=np.load('synT.npy'); good=np.load('good2.npy'); H=2048
def penv(y): return librosa.feature.rms(y=y,frame_length=1024,hop_length=h)[0]**2
def smear(p,tau):
    if tau<=0: return p
    a=np.exp(-h/sr/tau); o=np.empty_like(p); s=0
    for i,x in enumerate(p): s=a*s+(1-a)*x; o[i]=s
    return o
def fit(target,dry,mask):
    best=None
    for tau in [0,0.05,0.1,0.15,0.2,0.3,0.4,0.5,0.7,1.0,1.4,2.0]:
        m=smear(dry,tau)
        # 직접음 + 잔향 섞기: target ≈ a*dry + b*smear
        for mixr in [0.1,0.2,0.35,0.5,0.7]:
            p=(1-mixr)*dry+mixr*m
            c=np.corrcoef(np.log(p[mask]+1e-9),np.log(target[mask]+1e-9))[0,1]
            if best is None or c>best[0]: best=(c,tau,mixr)
    return best
syn,_=librosa.load('st0/all.wav',sr=sr,mono=True); ps=penv(syn)
rec,_=librosa.load('rec.wav',sr=sr,mono=True); pr=penv(rec)
recT=np.arange(len(pr))*h/sr
sT=np.interp(recT,np.arange(len(synT))*H/sr,synT); gd=np.interp(recT,np.arange(len(good))*H/sr,good.astype(float))>0.99
psw=np.interp(sT*sr/h,np.arange(len(ps)),ps)
print('음원 vs 우리(잔향 없음):',fit(pr,psw,gd))
for f in sys.argv[1:]:
    y,_=librosa.load(f,sr=sr,mono=True); pw=penv(y)
    n=min(len(pw),len(ps)); print(f,'vs 우리 잔향없음:',fit(pw[:n],ps[:n],np.ones(n,bool)))
