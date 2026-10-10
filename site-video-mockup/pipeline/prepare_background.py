import json, sys, numpy as np
from PIL import Image, ImageFilter
bg=Image.open(sys.argv[1]).convert('RGB')
import os
# tight framing on the monitor (source pixels x,y,w,h); the standard look since 2026-10-09
if os.environ.get('CROP'): x,y,w,h=map(int,os.environ['CROP'].split(',')); bg=bg.crop((x,y,x+w,y+h))
W=1080; H=1920
bg=bg.resize((W, round(bg.height*W/bg.width)), Image.LANCZOS)
top=(bg.height-H)//2; bg=bg.crop((0,top,W,top+H))
a=np.asarray(bg).astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
gm=np.clip((g-np.maximum(r,b)-30)/60,0,1)          # soft green key
m=Image.fromarray((gm*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))
hard=gm>0.5; ys,xs=np.nonzero(hard); s=xs+ys; d=xs-ys
tl=(xs[s.argmin()],ys[s.argmin()]); br=(xs[s.argmax()],ys[s.argmax()])
tr=(xs[d.argmax()],ys[d.argmax()]); bl=(xs[d.argmin()],ys[d.argmin()])
# expand quad 2px outward so it fills under the dilated mask
cx=(tl[0]+tr[0]+br[0]+bl[0])/4; cy=(tl[1]+tr[1]+br[1]+bl[1])/4
quad=[(x+(2 if x>cx else -2), y+(2 if y>cy else -2)) for x,y in (tl,tr,br,bl)]
print('quad',quad)
def coeffs(dst, src):
    A=[];B=[]
    for (x,y),(u,v) in zip(dst,src):
        A+= [[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]; B+=[u,v]
    return np.linalg.solve(np.array(A,float),np.array(B,float)).tolist()
sw,sh=1280,800
c=coeffs(quad,[(0,0),(sw,0),(sw,sh),(0,sh)])
bg.save('bg.png'); m.save('mask.png'); json.dump(c,open('coeffs.json','w'))
