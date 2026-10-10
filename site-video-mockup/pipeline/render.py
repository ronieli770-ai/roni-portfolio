import json, subprocess, bisect, os
from PIL import Image, ImageFilter, ImageDraw
c=json.load(open('coeffs.json')); bg=Image.open('bg.png'); m=Image.open('mask.png')
d=json.load(open('frames8.json')); fr=d['frames']; t0=d['marks']['load']; L=d['marks']['len']; F=d['marks']['film']
ts=[f[1] for f in fr]
K=Image.open(fr[0][0]).width/1280
x,y,w,h=[round(v*K) for v in F['stage']]
cardmask=Image.new('L',(w,h),0); ImageDraw.Draw(cardmask).rounded_rectangle((0,0,w-1,h-1),radius=35*K,fill=255)
keep=Image.new("L",Image.open(fr[0][0]).size,0); dk=ImageDraw.Draw(keep)
for key in ('dock','fabs'):
    if F.get(key):
        a,b,cw,ch=[v*K for v in F[key]]; dk.rounded_rectangle((a-2,b-2,a+cw+2,b+ch+2),radius=ch/2+2,fill=255)
films=sorted(os.listdir('filmframes'))
out=os.environ['OUT']; FPS=30; N=int(L*FPS)
ff=subprocess.Popen([os.path.expanduser('~/bin/ffmpeg'),'-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1920','-r',str(FPS),'-i','-','-c:v','libx264','-preset','slow','-crf','14','-pix_fmt','yuv420p','-movflags','+faststart',out],stdin=subprocess.PIPE)
last=None
for i in range(N):
    t=t0+i/FPS; k=max(0,bisect.bisect_right(ts,t)-1)
    fi=None
    if F['holdStart']<=t<=F['holdEnd']:
        fi=min(len(films)-1,int((t-F['holdStart'])*24))
    key=(k,fi)
    if key!=last:
        scr=Image.open(fr[k][0]).convert('RGB')
        if fi is not None:
            orig=scr.copy()
            fimg=Image.open('filmframes/'+films[fi]).convert('RGB').resize((w,h),Image.LANCZOS)
            scr.paste(fimg,(x,y),cardmask)
            scr=Image.composite(orig,scr,keep)
        scr=scr.resize((1280,800),Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2,60,0))
        img=Image.composite(scr.transform(bg.size,Image.PERSPECTIVE,c,Image.BICUBIC),bg,m); last=key
    ff.stdin.write(img.tobytes())
ff.stdin.close(); ff.wait(); print('done',N/FPS)
