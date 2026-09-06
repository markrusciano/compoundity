import numpy as np
from PIL import Image
IMG='/root/.claude/uploads/b2e9b31c-abda-597e-bff0-c9669c007828/d24fa548-image.jpg'
rgb=np.asarray(Image.open(IMG).convert('RGB'),dtype=np.float32)
a=rgb.mean(2); H,W=a.shape
bs=63; hb,wb=H//bs,W//bs
t=a[:hb*bs,:wb*bs].reshape(hb,bs,wb,bs).transpose(0,2,1,3).reshape(hb,wb,-1)
p50=np.percentile(t,50,axis=2); p16=np.percentile(t,16,axis=2)
bgc=p50; sdc=np.maximum(p50-p16,0.7)          # robust: lower half is star-free
def up(c):
    yi=(np.arange(H)/bs-.5).clip(0,hb-1.001); xi=(np.arange(W)/bs-.5).clip(0,wb-1.001)
    y0=yi.astype(int);x0=xi.astype(int);fy=(yi-y0)[:,None];fx=(xi-x0)[None,:]
    return (c[y0][:,x0]*(1-fy)*(1-fx)+c[y0+1][:,x0]*fy*(1-fx)+c[y0][:,x0+1]*(1-fy)*fx+c[y0+1][:,x0+1]*fy*fx)
bg=up(bgc); sd=up(sdc); sub=a-bg; snr=sub/sd
print("noise: %.2f .. %.2f (median %.2f)"%(sdc.min(),sdc.max(),np.median(sdc)))
pad=np.pad(snr,1,constant_values=-1e9); ismax=np.ones((H,W),bool)
for dy in(-1,0,1):
    for dx in(-1,0,1):
        if dy or dx: ismax&=snr>=pad[1+dy:1+dy+H,1+dx:1+dx+W]
ys,xs=np.nonzero(ismax&(snr>5.)&(sub>3.5))
print("candidates:",len(ys))
R=7; det=[]
for y,x in zip(ys,xs):
    if x<R+2 or y<R+2 or x>=W-R-2 or y>=H-R-2: continue
    win=sub[y-R:y+R+1,x-R:x+R+1]; pk=sub[y,x]
    ring=np.concatenate([win[0],win[-1],win[:,0],win[:,-1]])
    if np.median(ring)>0.5*pk: continue
    w=np.clip(sub[y-2:y+3,x-2:x+3],0,None); s=w.sum()
    gy,gx=np.mgrid[y-2:y+3,x-2:x+3]
    cy_,cx_=((gy*w).sum()/s,(gx*w).sum()/s) if s>0 else (y,x)
    det.append((cx_,cy_,float(np.clip(win,0,None).sum()),float(pk)))
det.sort(key=lambda d:-d[2]); keep=[]
for d in det:
    if all((d[0]-k[0])**2+(d[1]-k[1])**2>36 for k in keep): keep.append(d)
arr=np.array(keep); np.save('det4.npy',arr); print("sources:",len(arr))
s=arr[(np.abs(arr[:,0]-2237)<15)&(np.abs(arr[:,1]-1743)<15)]
print("Scheat now detected:",s)
