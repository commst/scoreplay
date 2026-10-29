# 뜯는·치는 악기 녹음(기본음계 여러 파일, 농현 여러 파일)을 음별로 잘라 mp3 뱅크로
# 사용: python3 extract_pluck.py 출력이름 p:파일:문턱 ... n:파일:문턱 ...
import numpy as np, scipy.io.wavfile as w, json, sys, subprocess
from scipy.signal import resample_poly
SR=44100
def load(f): sr,x=w.read(f); return x.astype(np.float64)/32768
def env(x,h=441): n=len(x)//h; return 20*np.log10(np.sqrt((x[:n*h].reshape(n,h)**2).mean(1))+1e-9)
def regions(E,thr):
    on=E>thr; regs=[];i=0;n=len(E)
    while i<n:
        if on[i]:
            j=i
            while j<n and on[j:j+40].any(): j+=1
            if (j-i)/100>0.5: regs.append((i,j))
            i=j
        else: i+=1
    return regs
def yin_free(seg):
    W=2048; tmax=int(SR/50); d=np.array([np.sum((seg[:W]-seg[t:t+W])**2) for t in range(tmax)])
    c=d.copy(); c[1:]=d[1:]*np.arange(1,tmax)/np.maximum(np.cumsum(d[1:]),1e-12)
    for t in range(int(SR/2000),tmax-1):
        if c[t]<0.2:
            while t+1<tmax-1 and c[t+1]<c[t]: t+=1
            return 69+12*np.log2(SR/t/440)
    return None
def rp(seg,e):
    W=2048; tmin=int(SR/(440*2**((e+1.5-69)/12))); tmax=int(SR/(440*2**((e-1.5-69)/12)))+2
    d=np.array([np.sum((seg[:W]-seg[t:t+W])**2) for t in range(tmax+2)])
    c=d.copy(); c[1:]=d[1:]*np.arange(1,len(d))/np.maximum(np.cumsum(d[1:]),1e-12)
    k=tmin+np.argmin(c[tmin:tmax]); a,b,cc=c[k-1],c[k],c[k+1]; p=k+0.5*(a-cc)/(a-2*b+cc+1e-12)
    return 69+12*np.log2(SR/p/440), c[k]
outn=sys.argv[1]; clips=[]
for spec in sys.argv[2:]:
    kind,f,thr=spec.split(':'); thr=float(thr)
    x=load(f); E=env(x); regs=regions(E,thr); prev=None
    for r,(i,j) in enumerate(regs):
        a0=max(0,(i-15)*441); seg=np.abs(x[a0:(i+30)*441]); pk=seg.max()
        a=max(0,a0+int(np.argmax(seg>pk*0.15))-int(0.003*SR))
        nxt=regs[r+1][0]*441-int(0.05*SR) if r+1<len(regs) else len(x)
        b=min(nxt, a+int(3.0*SR))
        rough=[yin_free(x[int(t*SR):int(t*SR)+5000]) for t in np.arange(a/SR+0.06,min(b/SR-0.1,a/SR+0.8),0.04)]
        rough=[q for q in rough if q]; e=float(np.median(rough))
        lo=[q for q in rough if q<min(rough)+1]
        if e-min(rough)>11 and len(lo)>=0.2*len(rough): e=float(np.median(lo))
        while prev is not None and e-prev>9: e-=12
        # 농현은 뜯은 직후 높이
        win=(0.05,0.3) if kind=='n' else (0.08,0.6)
        ms=[rp(x[int(t*SR):int(t*SR)+4600],e) for t in np.arange(a/SR+win[0],min(b/SR-0.1,a/SR+win[1]),0.03)]
        v=[m for m,c in ms if c<0.3]; m=float(np.median(v)) if v else e
        prev=m
        y=x[a:b].copy(); nf=int(0.25*SR); nf=min(nf,len(y)//3); y[-nf:]*=np.linspace(1,0,nf); y[:int(0.002*SR)]*=np.linspace(0,1,int(0.002*SR))
        y/=np.abs(y).max()/0.9
        clips.append((kind,round(m,3),y)); print(kind,round(m,2),round(len(y)/SR,2))
out=[np.zeros(int(0.12*32000),np.float32)]; meta=[]; pos=len(out[0])
for kind,m,y in clips:
    y32=resample_poly(y,320,441).astype(np.float32)
    meta.append([kind,m,round(pos/32000,4),round(len(y32)/32000,4)]); out+=[y32,np.zeros(int(0.12*32000),np.float32)]; pos+=len(y32)+int(0.12*32000)
allx=np.concatenate(out); w.write(outn+'.wav',32000,(allx*32767).astype(np.int16))
json.dump(meta,open(outn+'.json','w'))
subprocess.run(['ffmpeg','-v','error','-y','-i',outn+'.wav','-c:a','libmp3lame','-b:a','64k',outn+'.mp3'],check=True)
print('sec',len(allx)/32000)
