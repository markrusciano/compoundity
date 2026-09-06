import numpy as np, json, math, ephem
from stars_src import S, DSO
from figures import FIG
W,H=3024,4032; cx,cy=(W-1)/2.,(H-1)/2.
R=np.load('R_fin.npy'); q=np.load('fit_q0.npy'); f=q[3]
DATE=ephem.Date('2026/09/06 04:22:25')
det=np.load('det4.npy'); DX,DY,DF,DP=det[:,0],det[:,1],det[:,2],det[:,3]
def hms(t): return (t[0]+t[1]/60+t[2]/3600)*15.0
def dms(t):
    s=-1 if (t[1]<0 or t[2]<0 or t[3]<0) else 1
    return s*(abs(t[1])+abs(t[2])/60+abs(t[3])/3600)
def apparent(ra,dec):
    b=ephem.FixedBody(); b._ra=math.radians(ra); b._dec=math.radians(dec); b._epoch=ephem.J2000
    b.compute(DATE); return math.degrees(float(b.ra)), math.degrees(float(b.dec))
def proj(ra,dec):
    rr,dd=math.radians(ra),math.radians(dec)
    u=np.array([math.cos(dd)*math.cos(rr),math.cos(dd)*math.sin(rr),math.sin(dd)]); v=u@R
    return None if v[2]<=1e-6 else (f*v[0]/v[2]+cx, f*v[1]/v[2]+cy)

stars={}
for name,bay,con,rat,dect,mag in S:
    ra2,dec2=hms(rat),dms(dect); ra,dec=apparent(ra2,dec2); p=proj(ra,dec)
    if p is None: continue
    x,y=p
    if not(-9000<x<9000 and -9000<y<9000): continue
    inf = 0<=x<W and 0<=y<H
    snapd=None
    if inf:
        d2=(DX-x)**2+(DY-y)**2; j=int(np.argmin(d2)); snapd=round(float(math.sqrt(d2[j])),1)
        if snapd<12: x,y=float(DX[j]),float(DY[j])     # use the measured star position
    stars[name]=dict(n=name,b=bay,c=con,ra=round(ra2,5),de=round(dec2,5),m=mag,
                     x=round(x,1),y=round(y,1),f=1 if inf else 0,d=snapd)
figs=[]
for cname,spec in FIG.items():
    segs=[]
    for a,b in spec['lines']:
        if a in stars and b in stars:
            A,B=stars[a],stars[b]
            if A['f'] or B['f']: segs.append([A['x'],A['y'],B['x'],B['y'],a,b])
    if segs: figs.append(dict(name=cname,nick=spec['nick'],segs=segs))
print("constellations drawn:",[ (g['name'],len(g['segs'])) for g in figs])
print("stars kept:",len(stars)," in frame:",sum(1 for s in stars.values() if s['f']))
bad=[(s['n'],s['d']) for s in stars.values() if s['f'] and s['d'] is not None and s['d']>12]
print("in-frame stars that did NOT snap to a source:",bad)
dsos=[]
for nm,desc,typ,rat,dect,mag,size in DSO:
    ra2,dec2=hms(rat),dms(dect); ra,dec=apparent(ra2,dec2); p=proj(ra,dec)
    if p is None: continue
    x,y=p
    if 0<=x<W and 0<=y<H:
        dsos.append(dict(n=nm,t=typ,d=desc,m=mag,s=size,ra=round(ra2,5),de=round(dec2,5),x=round(x,1),y=round(y,1)))
geom=json.load(open('geom.json')); photo=json.load(open('photo_stars.json'))
json.dump(dict(stars=list(stars.values()),figs=figs,dso=dsos,geom=geom,photo=photo['stars']),
          open('skydata.json','w'),separators=(',',':'))
import os; print("skydata.json %.1f KB"%(os.path.getsize('skydata.json')/1024))
print("DSOs in frame:",[d['n'] for d in dsos])
