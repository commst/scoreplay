# 해금 녹음(기본음계·농현)을 음별로 잘라 하나의 mp3 뱅크로 만든다
import numpy as np, scipy.io.wavfile as w, json, sys, subprocess
from scipy.signal import resample_poly
SR=44100; EXP=[56,58,60,61,63,65,67,68,70,72,73,75,77,79]
def load(f): sr,x=w.read(f); return x.astype(np.float64)/32768
def env(x,h=441): n=len(x)//h; return 20*np.log10(np.sqrt((x[:n*h].reshape(n,h)**2).mean(1))+1e-9)
def regions(E):
    on=E>E.max()-30; regs=[];i=0;n=len(E)
    while i<n:
        if on[i]:
            j=i
            while j<n and on[j:j+15].any(): j+=1
            if (j-i)/100>0.4: regs.append((i,j))
            i=j
        else: i+=1
    return regs
def rp(seg,e):
    W=2048; tmin=int(SR/(440*2**((e+2-69)/12))); tmax=int(SR/(440*2**((e-2-69)/12)))+2
    d=np.array([np.sum((seg[:W]-seg[t:t+W])**2) for t in range(tmax+2)])
    c=d.copy(); c[1:]=d[1:]*np.arange(1,len(d))/np.maximum(np.cumsum(d[1:]),1e-12)
    k=tmin+np.argmin(c[tmin:tmax]); a,b,cc=c[k-1],c[k],c[k+1]; p=k+0.5*(a-cc)/(a-2*b+cc+1e-12)
    return 69+12*np.log2(SR/p/440), c[k]
clips=[]
for f,kind,Lmax in [(sys.argv[1],'p',3.2),(sys.argv[2],'n',3.4)]:
    x=load(f); E=env(x); regs=regions(E)
    assert len(regs)==14, (f,len(regs))
    for (i,j),e in zip(regs,EXP):
        med=np.median(E[i:j])
        # 활을 긋기 시작한 곳 (소리가 10%를 넘는 곳 조금 앞)
        a0=max(0,(i-10)*441); seg=np.abs(x[a0:(i+40)*441]); pk=np.percentile(np.abs(x[i*441:j*441]),99.5)
        a=a0+int(np.argmax(seg>pk*0.1))-int(0.015*SR)
        # 활을 떼기 전까지 (끝 부분 소리 줄어드는 곳 빼기)
        k=j-1
        while k>i and E[k]<med-6: k-=1
        b=min(k*441, a+int(Lmax*SR))
        y=x[a:b].copy(); nf=int(0.06*SR); y[-nf:]*=np.linspace(1,0,nf); y[:int(0.005*SR)]*=np.linspace(0,1,int(0.005*SR))
        y/=np.abs(y).max()/0.9
        ms=[rp(x[int(t*SR):int(t*SR)+4600],e) for t in (np.arange(a/SR+0.3,b/SR-0.2,0.05) if kind=='p' else np.arange(a/SR+0.08,a/SR+0.45,0.03))]
        v=[m for m,c in ms if c<0.3]; m=float(np.median(v)) if v and kind=='p' else float(e)   # 농현은 떨림이 커서 의도한 음(음계)으로
        clips.append((kind,round(m,3),y)); print(kind,e,round(m,2),round(len(y)/SR,2))
out=[np.zeros(int(0.12*32000),np.float32)]; meta=[]; pos=len(out[0])
for kind,m,y in clips:
    y32=resample_poly(y,320,441).astype(np.float32)
    meta.append([kind,m,round(pos/32000,4),round(len(y32)/32000,4)]); out+=[y32,np.zeros(int(0.12*32000),np.float32)]; pos+=len(y32)+int(0.12*32000)
allx=np.concatenate(out); w.write('haegeum-bank.wav',32000,(allx*32767).astype(np.int16))
json.dump(meta,open(sys.argv[3]+'.json','w'))
subprocess.run(['ffmpeg','-v','error','-y','-i','haegeum-bank.wav','-c:a','libmp3lame','-b:a','64k',sys.argv[3]+'.mp3'],check=True)
print('sec',len(allx)/32000)
