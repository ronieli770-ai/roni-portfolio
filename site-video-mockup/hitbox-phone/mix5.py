# Vivaldi Winter Drill from its 808 drop, plus tap ticks and whip whooshes on the grid -> mix5.wav
import json, subprocess
FF = '/Users/ronieliyahu/bin/ffmpeg'
ev = json.load(open('ev5.json')); LEN = ev['T']; off = ev['songOffset']
taps, whips = ev['taps'], [w[0] for w in ev['whips']]
fc = [f"[0:a]atrim={off}:{off+LEN},asetpts=PTS-STARTPTS,afade=t=out:st={LEN-.5}:d=0.5[mus]",
      f"[1:a]asplit={len(taps)}" + ''.join(f'[k{i}]' for i in range(len(taps))),
      f"[2:a]asplit={len(whips)}" + ''.join(f'[w{i}]' for i in range(len(whips)))]
lab = ['[mus]']
for i, t in enumerate(taps): fc.append(f"[k{i}]volume=0.55,adelay={int(t*1000)}|{int(t*1000)}[tk{i}]"); lab.append(f'[tk{i}]')
for i, t in enumerate(whips): fc.append(f"[w{i}]volume=0.4,adelay={int(t*1000)}|{int(t*1000)}[wh{i}]"); lab.append(f'[wh{i}]')
fc.append(''.join(lab) + f"amix=inputs={len(lab)}:normalize=0,atrim=0:{LEN},alimiter=limit=0.95[out]")
subprocess.run([FF, '-loglevel', 'error', '-y', '-i', 'song/song48.wav', '-i', 'sfx/tick.wav', '-i', 'sfx/whoosh.wav',
                '-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-ac', '2', 'mix5.wav'], check=True)
print('mix5', round(LEN, 2))
