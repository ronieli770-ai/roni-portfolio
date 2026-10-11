# Cut page stalls out of the recording: a gap in the scroll log during a run means the page froze.
import json, shutil
shutil.copy('rec.json', 'rec_raw.json')
d = json.load(open('rec.json')); m = d['marks']
sc = [a for a, _ in m['scroll']]
stalls = [(sc[i], sc[i+1] - sc[i] - 1/60) for i in range(len(sc)-1) if .12 < sc[i+1] - sc[i] < 1 and m['tlRun']['start'] < sc[i] < m['tlRun']['end']]
print('stalls', [(round(a - m['T0'], 2), round(g, 3)) for a, g in stalls])
def fix(t):
    return t - sum(g for a, g in stalls if t > a + .001)
d['frames'] = [[n, fix(t)] for n, t in d['frames']]
m['scroll'] = [[fix(a), y] for a, y in m['scroll']]
m['tiles'] = [[fix(p[0])] + p[1:] for p in m['tiles']]
for t in m['taps']: t['t'] = fix(t['t'])
for k in ['grid', 'quiz', 'swipe', 'objs', 'tlRun']:
    for f in ['start', 'end', 'resultT']:
        if f in m.get(k, {}): m[k][f] = fix(m[k][f])
m['endStart'] = fix(m['endStart']); m['holds'] = [[h[0], fix(h[1]), fix(h[2])] for h in m['holds']]
json.dump(d, open('rec.json', 'w'))
