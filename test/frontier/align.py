import librosa, numpy as np, json, sys
sr=22050; H=512
rec,_=librosa.load('rec.wav',sr=sr,mono=True)
syn,_=librosa.load(sys.argv[1] if len(sys.argv)>1 else 'st0/all.wav',sr=sr,mono=True)
print('rec',len(rec)/sr,'syn',len(syn)/sr)
def feat(y):
    c=librosa.feature.chroma_cqt(y=y,sr=sr,hop_length=H)
    o=librosa.onset.onset_strength(y=y,sr=sr,hop_length=H)
    return c,o
cr,orr=feat(rec); cs,os_=feat(syn)
D,wp=librosa.sequence.dtw(X=cs,Y=cr,metric='cosine',subseq=False)
wp=wp[::-1]
np.save('wp.npy',wp)
ts=wp[:,0]*H/sr; tr=wp[:,1]*H/sr
# 마디 시각 매핑 표: syn 시각 → rec 시각 (단조 보간)
u,idx=np.unique(ts,return_index=True)
m=np.interp(np.arange(0,ts.max(),1.0),u,tr[idx])
print('syn->rec every 10s', [round(x,1) for x in m[::10]])
print('cost',D[-1,-1]/len(wp))
