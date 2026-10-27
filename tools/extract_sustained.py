# 부는·켜는 악기 녹음(기본음, 요성/농현)을 음별로 잘라 mp3 뱅크로 만든다
# 사용: python3 extract_sustained.py 기본음.wav 요성.wav 출력이름 [기본음문턱dB 요성문턱dB 최대길이 요성최대길이 비트레이트]
import numpy as np, scipy.io.wavfile as w, json, sys, subprocess
from scipy.signal import resample_poly
SR=44100
base,yo,outn=sys.argv[1:4]; th=[float(v) for v in sys.argv[4:6]] if len(sys.argv)>5 else [None,None]
Lp=float(sys.argv[6]) if len(sys.argv)>6 else 3.0; Ln=float(sys.argv[7]) if len(sys.argv)>7 else 3.4; br=sys.argv[8] if len(sys.argv)>8 else '64k'
def load(f): sr,x=w.read(f); return x.astype(np.float64)/32768
def env(x,h=441): n=len(x)//h; return 20*np.log10(np.sqrt((x[:n*h].reshape(n,h)**2).mean(1))+1e-9)
def regions(E,thr):
    on=E>thr; regs=[];i=0;n=len(E)
    while i<n:
        if on[i]:
            j=i
            while j<n and on[j:j+40].any(): j+=1
            if (j-i)/100>0.8: regs.append((i,j))
            i=j
        else: i+=1
    return regs
def yin_free(seg):
    W=2048; tmax=int(SR/60); d=np.array([np.sum((seg[:W]-seg[t:t+W])**2) for t in range(tmax)])
    c=d.copy(); c[1:]=d[1:]*np.arange(1,tmax)/np.maximum(np.cumsum(d[1:]),1e-12)
    for t in range(int(SR/2000),tmax-1):
        if c[t]<0.15:
            while t+1<tmax-1 and c[t+1]<c[t]: t+=1
            return 69+12*np.log2(SR/t/440)
    return None
def rp(seg,e):
    W=2048; tmin=int(SR/(440*2**((e+1.5-69)/12))); tmax=int(SR/(440*2**((e-1.5-69)/12)))+2
    d=np.array([np.sum((seg[:W]-seg[t:t+W])**2) for t in range(tmax+2)])
    c=d.copy(); c[1:]=d[1:]*np.arange(1,len(d))/np.maximum(np.cumsum(d[1:]),1e-12)
    k=tmin+np.argmin(c[tmin:tmax]); a,b,cc=c[k-1],c[k],c[k+1]; p=k+0.5*(a-cc)/(a-2*b+cc+1e-12)
    return 69+12*np.log2(SR/p/440), c[k]
clips=[]
for f,kind,Lmax,thr in [(base,'p',Lp,th[0]),(yo,'n',Ln,th[1])]:
    x=load(f); E=env(x); thr=thr if thr is not None else np.percentile(E,25)+15
    for i,j in regions(E,thr):
        med=np.median(E[i:j])
        a0=max(0,(i-10)*441); seg=np.abs(x[a0:(i+60)*441]); pk=np.percentile(np.abs(x[i*441:j*441]),99.5)
        a=max(0,a0+int(np.argmax(seg>pk*0.1))-int(0.015*SR))
        k=j-1
        while k>i and E[k]<med-6: k-=1
        b=min(k*441, a+int(Lmax*SR))
        basep=[c[1] for c in clips if c[0]=='p']
        rough=[yin_free(x[int(t*SR):int(t*SR)+4200]) for t in np.arange(a/SR+0.4,b/SR-0.2,0.1)]
        rough=[r for r in rough if r]; e=float(np.median(rough))
        lo=[r for r in rough if r < min(rough)+1]
        if e-min(rough)>11 and len(lo)>=0.2*len(rough): e=float(np.median(lo))   # 배음을 잘못 잡은 경우 낮은 쪽
        prev=[c[1] for c in clips if c[0]==kind]
        while prev and e-prev[-1]>9: e-=12   # 음계는 차례로 올라가므로 한 옥타브 위로 잘못 잰 것 바로잡기
        k_n=len(prev)
        if kind=='n' and len(basep)==len(regions(E,thr)) and abs(basep[k_n]-e)<0.4:
            e=basep[k_n]   # 요성·농현은 떨림이 커서 같은 순서의 기본음 높이로 (같은 음일 때만)
        n_from_base = kind=='n' and e in basep
        ms=[rp(x[int(t*SR):int(t*SR)+4600],e) for t in np.arange(a/SR+0.3,b/SR-0.2,0.05)]
        v=[m for m,c in ms if c<0.3]; m=float(np.median(v)) if v and not n_from_base else e
        if kind=='n':
            # 농음·요성이 늦게(몇 초 뒤) 시작하는 녹음: 앞부분(소리 내기) + 떨림이 시작된 부분을 이어 붙인다
            region_end=k*441; st=None; tr=[]
            for tt in np.arange(a/SR+0.3, region_end/SR-0.3, 0.05):
                mm,cc=rp(x[int(tt*SR):int(tt*SR)+4600],e); tr.append((tt,mm if cc<0.35 else None))
            for q in range(10,len(tr)-10):
                win=[v for _,v in tr[q:q+10] if v is not None]
                if len(win)>6 and 0.25<np.ptp(win)<3: st=tr[q][0]; break
            if st is not None and st-a/SR>1.0:
                head=x[a:a+int(0.45*SR)].copy(); xf=int(0.12*SR)
                tail=x[int((st-0.25)*SR):min(region_end,int((st-0.25)*SR)+int((Lmax-0.45+0.12)*SR))].copy()
                g=np.linspace(0,np.pi/2,xf); head[-xf:]=head[-xf:]*np.cos(g)+tail[:xf]*np.sin(g)
                spliced=np.concatenate([head,tail[xf:]]); print('  splice',kind,round(e,2),'vib@',round(st-a/SR,2))
                b=a+len(spliced); xs=spliced
            else: xs=None
        else: xs=None
        y=(xs if xs is not None else x[a:b]).copy(); nf=int(0.06*SR); y[-nf:]*=np.linspace(1,0,nf); y[:int(0.005*SR)]*=np.linspace(0,1,int(0.005*SR))
        y/=np.abs(y).max()/0.9
        clips.append((kind,round(m,3),y)); print(kind,round(m,2),round(len(y)/SR,2))
out=[np.zeros(int(0.12*32000),np.float32)]; meta=[]; pos=len(out[0])
for kind,m,y in clips:
    y32=resample_poly(y,320,441).astype(np.float32)
    meta.append([kind,m,round(pos/32000,4),round(len(y32)/32000,4)]); out+=[y32,np.zeros(int(0.12*32000),np.float32)]; pos+=len(y32)+int(0.12*32000)
allx=np.concatenate(out); w.write(outn+'.wav',32000,(allx*32767).astype(np.int16))
json.dump(meta,open(outn+'.json','w'))
subprocess.run(['ffmpeg','-v','error','-y','-i',outn+'.wav','-c:a','libmp3lame','-b:a',br,outn+'.mp3'],check=True)
print('sec',len(allx)/32000)
