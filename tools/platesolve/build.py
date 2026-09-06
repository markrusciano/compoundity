import numpy as np, json, math, ephem
from stars_src import S, DSO
W,H=3024,4032; cx,cy=(W-1)/2.,(H-1)/2.
q=np.load('fit_q0.npy'); R=np.load('R_fin.npy'); f=q[3]
det=np.load('det4.npy'); DX,DY,DF,DP=det[:,0],det[:,1],det[:,2],det[:,3]
DATE=ephem.Date('2026/09/06 04:22:25')

def hms(t): return (t[0]+t[1]/60+t[2]/3600)*15.0
def dms(t):
    sgn = -1 if (t[1]<0 or t[2]<0 or t[3]<0) else 1
    return sgn*(abs(t[1])+abs(t[2])/60+abs(t[3])/3600)
def apparent(ra_deg, dec_deg):
    b=ephem.FixedBody(); b._ra=math.radians(ra_deg); b._dec=math.radians(dec_deg); b._epoch=ephem.J2000
    b.compute(DATE); return math.degrees(float(b.ra)), math.degrees(float(b.dec))
def proj(ra,dec):
    rr,dd=math.radians(ra),math.radians(dec)
    u=np.array([math.cos(dd)*math.cos(rr),math.cos(dd)*math.sin(rr),math.sin(dd)])
    v=u@R
    if v[2]<=1e-6: return None
    return f*v[0]/v[2]+cx, f*v[1]/v[2]+cy
def snap(x,y,rad=40):
    d2=(DX-x)**2+(DY-y)**2; j=int(np.argmin(d2))
    return (j, math.sqrt(d2[j])) if d2[j]<rad*rad else (None,math.sqrt(d2[j]))

rows=[]; print("%-14s %-14s %5s %8s %8s  %6s  %s"%("name","bayer","mag","px","py","snap","note"))
for name,bay,con,rat,dect,mag in S:
    ra2,dec2=hms(rat),dms(dect)
    ra,dec=apparent(ra2,dec2)
    p=proj(ra,dec)
    if p is None: continue
    x,y=p
    inframe = -80<x<W+80 and -80<y<H+80
    if not inframe: continue
    j,dist=snap(x,y)
    note=""
    if j is None: note="NO SOURCE (%.0f px)"%dist
    elif dist>10: note="loose %.1f px"%dist
    rows.append(dict(name=name,bayer=bay,con=con,ra2000=ra2,dec2000=dec2,mag=mag,
                     x=round(x,1),y=round(y,1),snapx=None if j is None else round(float(DX[j]),1),
                     snapy=None if j is None else round(float(DY[j]),1),
                     snapd=round(dist,1),flux=None if j is None else float(DF[j])))
    print("%-14s %-14s %5.2f %8.1f %8.1f  %6.1f  %s"%(name,bay,mag,x,y,dist,note))
print("\n%d catalogue stars project into (or just outside) the frame"%len(rows))
json.dump(rows,open('field_stars.json','w'),indent=0)

print("\n=== deep-sky objects ===")
drows=[]
for nm,desc,typ,rat,dect,mag,size in DSO:
    ra2,dec2=hms(rat),dms(dect); ra,dec=apparent(ra2,dec2); p=proj(ra,dec)
    if p is None: continue
    x,y=p
    if not(-40<x<W+40 and -40<y<H+40): continue
    drows.append(dict(name=nm,desc=desc,type=typ,ra2000=ra2,dec2000=dec2,mag=mag,size=size,x=round(x,1),y=round(y,1)))
    print("  %-10s %-28s %-9s mag %4.1f  px(%6.0f,%6.0f)"%(nm,desc,typ,mag,x,y))
json.dump(drows,open('field_dso.json','w'),indent=0)
