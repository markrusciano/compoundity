import numpy as np, json, math, ephem
W,H=3024,4032; cx,cy=(W-1)/2.,(H-1)/2.
R=np.load('R_fin.npy'); q=np.load('fit_q0.npy'); f=q[3]
LAT,LON=38.898688,-77.019391
DATE=ephem.Date('2026/09/06 04:22:25')
det=np.load('det4.npy'); DX,DY,DF,DP=det[:,0],det[:,1],det[:,2],det[:,3]

def unproj(x,y):
    v=np.array([x-cx,y-cy,f]); v/=np.linalg.norm(v); u=R@v
    return math.degrees(math.atan2(u[1],u[0]))%360, math.degrees(math.asin(np.clip(u[2],-1,1)))
def proj(ra,dec):
    rr,dd=math.radians(ra),math.radians(dec)
    u=np.array([math.cos(dd)*math.cos(rr),math.cos(dd)*math.sin(rr),math.sin(dd)]); v=u@R
    return None if v[2]<=1e-6 else (f*v[0]/v[2]+cx, f*v[1]/v[2]+cy)

# ---- photometric zero point from unsaturated named stars ----
stars=json.load(open('field_stars.json'))
pts=[(s['mag'],s['flux']) for s in stars if s['flux'] and s['snapd']<8]
zp=[]
for m,fl in pts:
    j=int(np.argmin((DX-0)**2)) # noop
for s in stars:
    if s['flux'] and s['snapd']<8:
        k=int(np.argmin((DX-s['snapx'])**2+(DY-s['snapy'])**2))
        if DP[k]<235: zp.append(s['mag']+2.5*math.log10(s['flux']))
zp=np.array(zp)
print("unsaturated calibrators:",len(zp)," zero point %.3f +/- %.3f"%(zp.mean() if len(zp) else 0, zp.std() if len(zp) else 0))
ZP = float(np.median(zp)) if len(zp) else 21.0
est = ZP-2.5*np.log10(np.maximum(DF,1e-3))
print("estimated limiting magnitude (faintest 1%%): %.2f ; median %.2f"%(np.percentile(est,99),np.median(est)))

# ---- field geometry ----
corners=[unproj(0,0),unproj(W,0),unproj(W,H),unproj(0,H)]
c_ra,c_dec=unproj(cx,cy)
o=ephem.Observer(); o.lat=str(LAT); o.lon=str(LON); o.elevation=20; o.date=DATE
def altaz(ra,dec):
    b=ephem.FixedBody(); b._ra=math.radians(ra); b._dec=math.radians(dec); b._epoch=DATE
    b.compute(o); return math.degrees(float(b.alt)), math.degrees(float(b.az))
alt_c,az_c=altaz(c_ra,c_dec)
alt_t,az_t=altaz(*unproj(cx,0))            # top-of-frame direction
print("\ncentre  RA %.4f Dec %+.4f  ->  alt %.2f  az %.2f"%(c_ra,c_dec,alt_c,az_c))
print("phone tilt from vertical: %.2f deg"%(90-alt_c))
print("top of the photo faced azimuth %.1f deg (%s)"%(az_t, ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][int((az_t+11.25)%360//22.5)]))
for i,(a,b) in enumerate(corners): print("  corner %d: RA %8.3f Dec %+7.3f"%(i,a,b))

# ---- galactic equator & grid ----
def gal_to_eq(l,b):
    g=ephem.Galactic(math.radians(l),math.radians(b),epoch=ephem.J2000)
    e=ephem.Equatorial(g,epoch=DATE); return math.degrees(float(e.ra)), math.degrees(float(e.dec))
def polyline(pts):
    out=[];cur=[]
    for ra,dec in pts:
        p=proj(ra,dec)
        if p and -600<p[0]<W+600 and -600<p[1]<H+600: cur.append([round(p[0],1),round(p[1],1)])
        else:
            if len(cur)>1: out.append(cur)
            cur=[]
    if len(cur)>1: out.append(cur)
    return out
galeq=polyline([gal_to_eq(l,0) for l in np.arange(0,360.25,0.25)])
galb=[polyline([gal_to_eq(l,bb) for l in np.arange(0,360.25,0.5)]) for bb in (-10,10)]
grid={'ra':[],'dec':[]}
for rah in range(0,24):
    seg=polyline([(rah*15,d) for d in np.arange(-20,89.5,0.5)])
    if seg: grid['ra'].append({'label':'%dh'%rah,'segs':seg})
for dd in range(-20,90,10):
    seg=polyline([(ra,dd) for ra in np.arange(0,360.5,0.5)])
    if seg: grid['dec'].append({'label':'%+d'%dd,'segs':seg})
print("\ngalactic equator segments in frame:",len(galeq))

# ---- brightest detections as a real catalogue of the photo ----
idx=np.argsort(-DF)[:1800]
sky=[]
for k in idx:
    ra,dec=unproj(DX[k],DY[k])
    sky.append([round(ra,4),round(dec,4),round(float(est[k]),2),round(float(DX[k]),1),round(float(DY[k]),1)])
print("photo star catalogue exported:",len(sky))
json.dump({'zp':ZP,'stars':sky},open('photo_stars.json','w'))
json.dump({'center':{'ra':c_ra,'dec':c_dec,'alt':alt_c,'az':az_c},
           'corners':[{'ra':a,'dec':b} for a,b in corners],
           'top_az':az_t,'focal_px':float(f),'W':W,'H':H,
           'galeq':galeq,'galb':galb,'grid':grid,
           'lat':LAT,'lon':LON,'date':str(DATE)},open('geom.json','w'))
