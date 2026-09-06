import numpy as np, json, math
W,H=3024,4032; cx,cy=(W-1)/2.,(H-1)/2.
det=np.load('det4.npy'); det=det[det[:,3]>20]
det=det[np.argsort(-det[:,2])]; DX,DY=det[:,0],det[:,1]
cat=json.load(open('cat.json')); names=[c[0] for c in cat]
ra=np.radians([c[1] for c in cat]); dec=np.radians([c[2] for c in cat]); mag=np.array([c[3] for c in cat])
U=np.stack([np.cos(dec)*np.cos(ra),np.cos(dec)*np.sin(ra),np.sin(dec)],1)
def ex(w):
    t=np.linalg.norm(w); K=np.array([[0,-w[2],w[1]],[w[2],0,-w[0]],[-w[1],w[0],0]])
    return np.eye(3)+K if t<1e-12 else np.eye(3)+math.sin(t)/t*K+(1-math.cos(t))/(t*t)*(K@K)
R0=np.load('R0.npy'); f0=json.load(open('sol0.json'))['f']

def run(ndist, label):
    npar=4+ndist
    def proj(q,Uc):
        V=Uc@(R0@ex(q[:3])); z=V[:,2]; ok=z>1e-6; zz=np.where(ok,z,1)
        xn,yn=V[:,0]/zz,V[:,1]/zz; r2=xn*xn+yn*yn; d=np.ones_like(r2)
        for i in range(ndist): d=d+q[4+i]*r2**(i+1)
        return q[3]*xn*d+cx, q[3]*yn*d+cy, ok
    q=np.zeros(npar); q[3]=f0
    for it,tol in enumerate([60,40,25,15,10,7,6,5,5,5]):
        px,py,ok=proj(q,U)
        ins=ok&(px>25)&(px<W-25)&(py>25)&(py<H-25)
        A=[];B=[]
        for k in np.nonzero(ins)[0]:
            d2=(DX-px[k])**2+(DY-py[k])**2; j=int(np.argmin(d2))
            if d2[j]<tol*tol: A.append(k);B.append(j)
        if len(A)<npar//2+2: return None
        A=np.array(A);B=np.array(B); obs=np.concatenate([DX[B],DY[B]])
        def rs(z_):
            a,b,_=proj(z_,U[A]); return np.concatenate([a,b])-obs
        r=rs(q); J=np.zeros((len(r),npar)); hs=[1e-7,1e-7,1e-7,0.5]+[1e-5]*ndist
        for i,h in enumerate(hs):
            z_=q.copy(); z_[i]+=h; J[:,i]=(rs(z_)-r)/h
        q=q+np.linalg.lstsq(J,-r,rcond=None)[0]
    rr=rs(q).reshape(2,-1); d=np.sqrt((rr**2).sum(0))
    print("%-18s n=%2d  mean %5.2f px  max %5.2f px  rms %5.2f  f=%7.1f  %s"%(
        label,len(A),d.mean(),d.max(),math.sqrt((d**2).mean()),q[3],
        " ".join("k%d=%+.5f"%(i+1,q[4+i]) for i in range(ndist))))
    return q,A,B,d,proj

out={}
for nd,lab in [(0,'rectilinear'),(1,'+k1'),(2,'+k1,k2')]:
    r=run(nd,lab)
    if r: out[nd]=r
np.save('fit_q0.npy',out[0][0]); np.save('fit_q1.npy',out[1][0])
q,A,B,d,proj=out[0]
R=R0@ex(q[:3]); ax=R[:,2]
RA0=math.degrees(math.atan2(ax[1],ax[0]))%360; DEC0=math.degrees(math.asin(np.clip(ax[2],-1,1)))
v=np.array([0,0,1.])@R
print("\n=== RECTILINEAR SOLUTION ===")
print("centre   RA %.4f = %02dh%05.2fm    Dec %+.4f"%(RA0,int(RA0/15),(RA0/15%1)*60,DEC0))
print("focal    %.1f px = %.2f mm equiv    FOV %.2f x %.2f deg"%(q[3],q[3]*36/4032,
      2*math.degrees(math.atan(cx/q[3])),2*math.degrees(math.atan(cy/q[3]))))
print("north PA %.2f deg"%(math.degrees(math.atan2(v[0],-v[1]))%360))
np.save('R_fin.npy',R)
print("\nmatched stars:")
for k,j,e in sorted(zip(A,B,d),key=lambda t:mag[t[0]]):
    print("  %-14s mag %5.2f  px(%6.1f,%6.1f)  resid %4.2f px"%(names[k],mag[k],DX[j],DY[j],e))
