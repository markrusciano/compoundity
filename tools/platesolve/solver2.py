import numpy as np, json, itertools, math
W,H = 3024,4032; cx,cy=(W-1)/2.,(H-1)/2.

det=np.load('det.npy')
m=(det[:,3]>25) & ~((det[:,0]<420)&(det[:,1]>3750))
det=det[m][np.argsort(-det[m][:,2])]
DX,DY,DF = det[:,0],det[:,1],det[:,2]
print("sources:",len(det))

cat=json.load(open('cat.json'))
names=[c[0] for c in cat]
ra=np.radians([c[1] for c in cat]); dec=np.radians([c[2] for c in cat]); mag=np.array([c[3] for c in cat])
U=np.stack([np.cos(dec)*np.cos(ra),np.cos(dec)*np.sin(ra),np.sin(dec)],1)

def cam_vec(x,y,f):
    v=np.array([x-cx,y-cy,f],float); return v/np.linalg.norm(v)
def solve_f(x1,y1,x2,y2,cosa):
    A=(x1-cx)*(x2-cx)+(y1-cy)*(y2-cy); r1=(x1-cx)**2+(y1-cy)**2; r2=(x2-cx)**2+(y2-cy)**2
    lo=np.full_like(cosa,200.); hi=np.full_like(cosa,40000.)
    for _ in range(50):
        mid=.5*(lo+hi); f2=mid*mid
        g=(A+f2)/np.sqrt((r1+f2)*(r2+f2)); t=g<cosa
        lo=np.where(t,mid,lo); hi=np.where(t,hi,mid)
    return .5*(lo+hi)
def rot(v1,v2,u1,u2):
    a1=v1; a2=v2-v2@a1*a1; n=np.linalg.norm(a2)
    if n<1e-9: return None
    a2/=n; b1=u1; b2=u2-u2@b1*b1; n2=np.linalg.norm(b2)
    if n2<1e-9: return None
    b2/=n2
    return np.stack([b1,b2,np.cross(b1,b2)],1)@np.stack([a1,a2,np.cross(a1,a2)],1).T

# --- verification uses BRIGHT catalog stars vs BRIGHT detections only ---
TOPN=250; TOL=13.0
bx,by = DX[:TOPN],DY[:TOPN]
CELL=40; grid={}
for i in range(TOPN): grid.setdefault((int(bx[i]//CELL),int(by[i]//CELL)),[]).append(i)
def near(px,py):
    g=(int(px//CELL),int(py//CELL)); best=None; bd=TOL*TOL
    for a in range(g[0]-1,g[0]+2):
        for b in range(g[1]-1,g[1]+2):
            for i in grid.get((a,b),()):
                d=(bx[i]-px)**2+(by[i]-py)**2
                if d<bd: bd=d; best=i
    return best
BRIGHT=np.nonzero(mag<3.6)[0]
def verify(R,f):
    V=U[BRIGHT]@R; z=V[:,2]; ok=z>1e-6
    px=f*V[:,0]/np.where(ok,z,1)+cx; py=f*V[:,1]/np.where(ok,z,1)+cy
    ins=ok&(px>20)&(px<W-20)&(py>20)&(py<H-20)
    hits=[]
    for k in np.nonzero(ins)[0]:
        j=near(px[k],py[k])
        if j is not None: hits.append((int(BRIGHT[k]),j))
    return int(ins.sum()),hits

BANDS=[("ultrawide 13mm",1330,1620),("main 24-26mm",2550,3250),("tele 2x",5100,6500)]
pc=[(i,j) for i in range(len(cat)) for j in range(len(cat)) if i!=j]
ci=np.array([p[0] for p in pc]); cj=np.array([p[1] for p in pc])
ca=np.clip((U[ci]*U[cj]).sum(1),-1,1); sepd=np.degrees(np.arccos(ca))
v=(sepd>1.5)&(sepd<80); ci,cj,ca=ci[v],cj[v],ca[v]

K=30; res=[]
for a,b in itertools.combinations(range(K),2):
    x1,y1,x2,y2=DX[a],DY[a],DX[b],DY[b]
    if math.hypot(x2-x1,y2-y1)<300: continue
    fs=solve_f(x1,y1,x2,y2,ca)
    for bn,f0,f1 in BANDS:
        for t in np.nonzero((fs>f0)&(fs<f1))[0]:
            f=fs[t]
            R=rot(cam_vec(x1,y1,f),cam_vec(x2,y2,f),U[ci[t]],U[cj[t]])
            if R is None: continue
            ax=R[:,2]; d0=math.degrees(math.asin(np.clip(ax[2],-1,1)))
            if not (15<d0<62): continue
            nin,h=verify(R,f)
            if len(h)>=6:
                res.append((len(h),nin,f,d0,math.degrees(math.atan2(ax[1],ax[0]))%360,bn,R,h))
res.sort(key=lambda r:(-r[0],r[1]))
print("\ncandidates with >=6 bright-star matches:",len(res))
for r in res[:15]:
    exp=r[1]*TOPN*math.pi*TOL*TOL/(W*H)
    print("  hits=%2d/%2d in-frame  exp_random=%.2f  f=%5.0f (%s)  RA=%6.2f Dec=%+6.2f" % (
        r[0],r[1],exp,r[2],r[5],r[4],r[3]))
    print("      ", ", ".join(names[i] for i,_ in r[7]))
if res:
    np.save('R0.npy',res[0][6]); json.dump({'f':float(res[0][2]),'hits':[[int(i),int(j)] for i,j in res[0][7]]},open('sol0.json','w'))
