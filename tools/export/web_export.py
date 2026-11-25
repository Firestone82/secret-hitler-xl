"""Export the rulebook and the roles to JSON for the web app (no PDF is built)."""
import os, re, sys, json
sys.argv = ['x', '/tmp/_unused.pdf']
OUT = '/home/claude/web/export'
src = open('scripts/rules3.py').read()
src = src[:src.index('ORDER=None')]                       # everything but the build calls
ns = {'__name__': 'rules3_export'}
exec(compile(src, 'rules3.py', 'exec'), ns)
from reportlab.lib import colors

def hexcol(c):
    try: return '#' + c.hexval()[2:]
    except Exception: return None
def html(t):
    t = ns['V'](str(t))
    t = re.sub(r'<font name="Jost-Bold"(?: color="([^"]+)")?>(.*?)</font>', lambda m: f'<b style="color:{m.group(1)}">{m.group(2)}</b>' if m.group(1) else f'<b>{m.group(2)}</b>', t, flags=re.S)
    t = re.sub(r'<font color="([^"]+)">(.*?)</font>', r'<span style="color:\1">\2</span>', t, flags=re.S)
    t = re.sub(r'<font[^>]*>(.*?)</font>', r'\1', t, flags=re.S)
    t = re.sub(r'<link href="([^"]+)">(.*?)</link>', r'<a href="\1" target="_blank">\2</a>', t, flags=re.S)
    return t.replace('<br/>', '<br>')
img = lambda p: os.path.basename(str(p))
B = []                                                     # rulebook blocks
def add(**b): B.append(b)
ns.update(
    H1=lambda t: add(type='h1', text=html(t)),
    H2=lambda t: add(type='h2', text=html(t)),
    H3=lambda t: add(type='h3', text=html(t)),
    P=lambda t, st=None: add(type='p', html=html(t)),
    BUL=lambda items, num=False: add(type='list', ordered=bool(num), items=[html(i) for i in items]),
    TAB=lambda rows, widths, caption=None, **kw: add(type='table', rows=[[html(c) for c in r] for r in rows], caption=html(caption) if caption else None, center=bool(kw.get('center'))),
    SCRIPT=lambda title, lines: add(type='script', title=html(title), lines=[html(l) for l in lines]),
    NOTE=lambda label, text, accent=None: add(type='note', label=html(label), html=html(text)),
    FIG=lambda paths, caption, h=None, labels=None, gap=None, maxw=None: add(type='figure', images=[img(p) for p in paths], labels=[html(l) for l in labels] if labels else None, caption=html(caption)),
    FIGP=lambda pairs, caption, h=None, gap=None: add(type='pairs', pairs=[{'a': img(a), 'b': img(b), 'label': html(l)} for a, b, l in pairs], caption=html(caption)),
    WIDE=lambda path, caption, w=None: add(type='wide', image=img(path), caption=html(caption)),
    PART=lambda num, title, sub, color: add(type='part', num=num, title=title, sub=html(sub), color=hexcol(color)),
    ICONLIST=lambda items, size=10, prefix='it_', ext='.png': add(type='icons', items=[{'icon': prefix + i + ext, 'name': html(n), 'html': html(d)} for i, n, d in items]),
    WINPANELS=lambda items: add(type='wins', panels=[{'name': n, 'who': html(w), 'color': hexcol(c), 'items': [html(x) for x in ws]} for n, w, c, ws in items]),
    LEGIS=lambda: add(type='legislative'),
    CREDITS=lambda: add(type='credits'),
)
ROLEBOXES = {}
def ROLEBOX(image, name, team, paras, addwhen):
    key = {'Centrists': 'centrist'}.get(name) or name.replace('The ', '').lower().replace(' ', '_')
    ROLEBOXES[key] = dict(title=name, teamLabel=team, image=img(image), paragraphs=[html(p) for p in paras], addWhen=html(addwhen))
    add(type='role', role=key)
ns['ROLEBOX'] = ROLEBOX
class _S(list):
    def append(self, x): pass                               # page breaks and spacers do not matter on the web
ns['S'] = _S()
content = ns['CONTENT'].replace(ns['_rolebox_src'](), '\n')
exec(content, ns)
for b in B:                                                 # ids for the table of contents
    if b['type'] in ('h1', 'h2', 'part'):
        b['id'] = re.sub(r'[^a-z0-9]+', '-', re.sub('<[^>]+>', '', b.get('text') or b.get('title')).lower()).strip('-')
json.dump({'blocks': B}, open(f'{OUT}/rulebook.json', 'w'), indent=1, ensure_ascii=False)
print('rulebook blocks', len(B), 'roles in rulebook', len(ROLEBOXES))
json.dump(ROLEBOXES, open('/tmp/roleboxes.json', 'w'), indent=1, ensure_ascii=False)
