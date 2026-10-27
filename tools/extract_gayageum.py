import numpy as np, scipy.io.wavfile as w, json
from scipy.signal import resample_poly
import noisereduce as nr
SR=44100
def load(f): sr,x=w.read(f); return x.astype(np.float32)/32768
def env(x,hop=441):
    n=len(x)//hop; return 20*np.log10(np.sqrt(np.mean(x[:n*hop].reshape(n,hop)**2,axis=1))+1e-9)
def yin(seg,sr=SR,fmin=70,fmax=1500,th=0.15):
    s=seg.astype(np.float64); W=len(s)//2; tmax=int(sr/fmin); tmin=int(sr/fmax)
    e=np.cumsum(s**2); d=np.zeros(tmax)
    for t in range(1,tmax): d[t]=e[W-1]+(e[t+W-1]-e[t-1])-2*np.dot(s[:W],s[t:t+W])
    c=d[1:]*np.arange(1,tmax)/np.maximum(np.cumsum(d[1:]),1e-12)
    for t in range(tmin,tmax-2):
        if c[t]<th:
            while t+1<tmax-2 and c[t+1]<c[t]: t+=1
            a,b,cc=c[t-1],c[t],c[t+1]; p=t+0.5*(a-cc)/(a-2*b+cc+1e-12)
            return 69+12*np.log2(SR/(p+1)/440)
    return None
def pitch(x,a,t0,t1,step=0.05):
    ms=[yin(x[int((a+t)*SR):int((a+t)*SR)+4096]) for t in np.arange(t0,t1,step)]
    ms=[m for m in ms if m]; return float(np.median(ms)) if ms else None
def attack(x,E,t0,back=0.8,fwd=0.5):
    i0=max(0,int((t0-back)*100)); i1=int((t0+fwd)*100)
    pk=i0+np.argmax(E[i0:i1])
    k=pk
    while k>i0 and E[k-1]>E[pk]-18: k-=1
    lo=max(i0,k-3); d=[E[i+3]-E[i] for i in range(lo,pk+1)]
    k=lo+int(np.argmax(d))
    while k+1<=pk and E[k+1]<E[k]+3: k+=1
    return k/100-0.004, E[pk]
clips=[];PL={}
def take(x,a,L,fade,bank,m,expect):
    if m is not None and abs(m-12-expect)<0.7: m-=12
    if bank=='n': m=PL.get(expect,m)
    if m is None or abs(m-expect)>0.7: m=expect+0.12
    y=x[int(a*SR):int((a+L)*SR)].copy()
    nf=int(fade*SR); y[-nf:]*=np.linspace(1,0,nf)
    ni=int(0.002*SR); y[:ni]*=np.linspace(0,1,ni)
    y/=np.abs(y).max()/0.9
    print(bank,expect,round(m,2)) if abs(m-expect)>0.4 else None
    clips.append((bank,round(m,3),y))
    if bank=='p': PL[expect]=m
# 1) 기본음 (scale)
x=load('scale.wav'); E=env(x)
starts=[2.45,14.0,26.75,40.1,53.4,66.05,79.3,93.45,106.0,117.95,127.2,139.45,152.3,164.75,176.7,187.5,201.7,214.95,226.0,236.4,245.8,254.2,263.55,272.75,281.85]
exp=[39,41,43,44,46,48,50,51,53,55,56,58,60,62,63,65,67,68,70,72,74,75,77,79,80]
for k,(t0,e) in enumerate(zip(starts,exp)):
    a,pk=attack(x,E,t0)
    L=float(np.interp(e,[39,80],[4.5,2.4]))
    nxt=starts[k+1]-0.9 if k+1<len(starts) else len(x)/SR
    # 소리가 충분히 줄면 거기서 끝
    i=int(a*100)+40; j=i
    while j<len(E)-1 and j<int((a+L)*100) and E[j]>pk-48: j+=1
    L=min(max(1.6,j/100-a+0.1),L,nxt-a)
    take(x,a,L,0.25,'p',pitch(x,a,0.08,0.5),e)
# 2) 농현
x=load('nong.wav'); E=env(x)
ns=[0.1,9.3,21.0,32.0,43.0,51.0,59.1,68.3,78.0,87.0,97.5,109.9,120.2,130.2,137.1,145.2,155.5,163.4,171.4,178.1,184.9,190.7,198.1,203.7,210.5]
for k,(t0,e) in enumerate(zip(ns,exp)):
    if k%2: continue
    a,pk=attack(x,E,t0,back=0.6 if k else 0.1)
    nxt=ns[k+1]-0.6 if k+1<len(ns) else len(x)/SR
    L=min(float(np.interp(e,[39,80],[3.2,2.4])),nxt-a)
    take(x,a,L,0.3,'n',pitch(x,a,0.06,0.2,0.03),e)
# 3) 트레몰로 (잡음 줄임)
x=load('trem.wav')
noise=np.concatenate([x[int(29.5*SR):int(31.8*SR)],x[int(42.5*SR):int(45.5*SR)]])
x=nr.reduce_noise(y=x,sr=SR,y_noise=noise,stationary=True,prop_decrease=0.85).astype(np.float32)
E=env(x)
ts=[0.7,14.4,32.8,46.8,62.3,77.0,92.8,112.8,132.2,151.8,166.7,183.2,201.5,217.4,233.1,245.6,259.4,272.3,283.9,294.0,306.4,330.4,340.5,349.9]
te=[13.1,28.9,40.4,58.0,72.5,88.5,107.5,127.3,146.7,163.8,178.4,197.4,213.7,230.3,242.6,256.9,270.1,281.9,291.8,302.1,316.9,338.1,348.5,356.5]
for k,(t0,t1,e) in enumerate(zip(ts,te,exp[::-1][:24])):
    if k%2: continue
    a,pk=attack(x,E,t0,back=0.5,fwd=0.6)
    L=min(2.4,t1-a)
    take(x,a,L,0.15,'t',pitch(x,a,0.3,min(L-0.2,2.5),0.1),e)
# 묶기
gap=np.zeros(int(0.12*SR),np.float32); out=[gap]; meta=[]; pos=len(gap)
for b,m,y in clips:
    y32=resample_poly(y,320,441).astype(np.float32)
    meta.append([b,m,round(pos/32000,4),round(len(y32)/32000,4)]); out+= [y32,np.zeros(int(0.12*32000),np.float32)]; pos+=len(y32)+int(0.12*32000)
    out[0]=gap if len(out)>3 else resample_poly(gap,320,441).astype(np.float32)
allx=np.concatenate([resample_poly(np.zeros(int(0.12*SR),np.float32),320,441)]+out[1:])
w.write('bank.wav',32000,(allx*32767).astype(np.int16))
json.dump(meta,open('bank.json','w'))
for b in 'pnt': print(b,[ (round(m,2),L) for bb,m,s,L in meta if bb==b])
print('total sec',len(allx)/32000)
