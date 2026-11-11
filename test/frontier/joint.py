import numpy as np, json, sys
from scipy.optimize import least_squares
R=np.load('R.npy'); good=np.load('good2.npy'); Gs=np.load(sys.argv[1] if len(sys.argv)>1 else 'Gs.npy'); groups=json.load(open('groups.json'))
n=len(groups)
def fit(mask, lam=0.02):
    A=Gs[:,:,mask].reshape(n,-1); b=R[:,mask].reshape(-1)
    keep=(A.sum(0)>np.percentile(A.sum(0),25))&(b>0); A=A[:,keep]; b=b[keep]
    A=A/b.mean(); b=b/b.mean()
    def res(x):
        g=np.exp(x[:n]); c=x[n]   # c: 전체 크기
        p=np.exp(c)*(g@A)+1e-6
        r=np.log(p)-np.log(b+1e-6)
        return np.concatenate([r/np.sqrt(len(r)), np.sqrt(lam)*x[:n]])
    x=least_squares(res,np.zeros(n+1),method='trf').x
    return 10*np.log10(np.exp(x[:n]))
T=R.shape[1]; h1=good.copy(); h1[T//2:]=False; h2=good.copy(); h2[:T//2]=False
a=fit(good); b1=fit(h1); b2=fit(h2)
a-=np.median(a); b1-=np.median(b1); b2-=np.median(b2)
for k,x,y,z in zip(groups,a,b1,b2): print(f'{k:22s} 전체 {x:+5.1f}  앞 {y:+5.1f}  뒤 {z:+5.1f}')
