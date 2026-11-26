"""Per-piece PDFs for the web app: page 1 front, page 2 back, cut size + 3 mm bleed. Pictures as JPEG to keep downloads small."""
import sys, os, json, io, contextlib
sys.path.insert(0, 'scripts'); sys.argv = ['x']
with contextlib.redirect_stdout(io.StringIO()): import build as B
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from PIL import Image
from padimg import padded
BL = 3.0; OUT = '/home/claude/web/export/pieces'; C = B.A + 'cards/'
def jpg(p, q=90):
    o = p.rsplit('.', 1)[0] + f'_q{q}.jpg'
    if not os.path.exists(o) or os.path.getmtime(o) < os.path.getmtime(p): Image.open(p).convert('RGB').save(o, quality=q)
    return o
man = {}
def card(pid, w, h, front, back, label, kind):
    path = f'{OUT}/{pid}.pdf'; c = canvas.Canvas(path, pagesize=((w+2*BL)*mm, (h+2*BL)*mm))
    for p in (front, back):
        c.drawImage(jpg(padded(p, w, h, BL)), 0, 0, (w+2*BL)*mm, (h+2*BL)*mm); c.showPage()
    c.save(); man[pid] = dict(kind=kind, w=w, h=h, label=label)
def board(pid, k, insert, label):
    w, h = (B.IL_, B.IW_) if insert else (B.BL_, B.BW_)
    path = f'{OUT}/{pid}.pdf'; c = canvas.Canvas(path, pagesize=((w+2*BL)*mm, (h+2*BL)*mm))
    for side in ('front', 'back'):
        col = B.LIGHT[k[0]] if insert else B.BG
        c.setFillColorRGB(*[v/255 for v in col]); c.rect(0, 0, (w+2*BL)*mm, (h+2*BL)*mm, stroke=0, fill=1)
        src = jpg(B.A + f'board_{k}_{side}.jpg', 88)
        iw, ih = Image.open(src).size; P = 24; sc = min(B.ART_L/(iw-2*P), B.ART_H/(ih-2*P)); dw, dh = iw*sc, ih*sc
        c.saveState(); c.translate((BL+w/2)*mm, (BL+h/2)*mm)
        if insert:
            ins = (max(v[0] for v in B.BANDS[k].values())+5)*sc
            p = c.beginPath(); p.rect((-dw/2+ins)*mm, (-dh/2+ins)*mm, (dw-2*ins)*mm, (dh-2*ins)*mm); c.clipPath(p, stroke=0, fill=0)
        c.drawImage(src, -dw/2*mm, -dh/2*mm, dw*mm, dh*mm)
        B.notch(c, h, (0.30, 0.31, 0.29) if not insert else tuple(v/255*0.80 for v in B.LIGHT[k[0]])) if False else None
        c.restoreState(); c.showPage()
    c.save(); man[pid] = dict(kind='insert' if insert else 'long', w=w, h=h, label=label)
def vector(pid, key):
    f, bk, label = B.LAMA[key]; w, h = B.BL_, B.BW_
    path = f'{OUT}/{pid}.pdf'; c = canvas.Canvas(path, pagesize=((w+2*BL)*mm, (h+2*BL)*mm))
    for fn in (f, bk):
        c.setFillColorRGB(*[v/255 for v in B.BG]); c.rect(0, 0, (w+2*BL)*mm, (h+2*BL)*mm, stroke=0, fill=1)
        c.saveState(); c.translate(BL*mm, BL*mm); fn(c, w, h); c.restoreState(); c.showPage()
    c.save(); man[pid] = dict(kind='long', w=w, h=h, label=label)
# tiles
TB = C + 'p132.png'
for f, lab in [('p018','Liberal policy'),('p005','Fascist policy'),('p104','Communist policy'),('p060','Anti-Fascist policy'),('p014','Anti-Communist policy'),
               ('p129','Social Democratic policy'),('pblank_liberal','Blank Liberal policy'),('pblank_fascist','Blank Fascist policy'),
               ('pblank_communist','Blank Communist policy'),('pblank_emergency','Blank emergency power')] + list(zip(B.EM, ['Emergency: '+n for n in B.EMN])):
    card('t_'+f, 44, 68, C+f+'.png', TB, lab, 'tile')
card('t_lobby', 44, 68, C+'lobby.png', C+'lobby.png', 'Lobby card (small)', 'tile')
# cards
arts = sorted({a for arts, k, n in B.ROLESET for a in arts})
for a in arts: card('c_h_'+a, 63.5, 88, C+'h_'+a+'.png', C+'200.png', 'Secret Role '+a, 'card')
for k in ('liberal','fascist','communist','neutral'): card('c_h_blank_'+k, 63.5, 88, C+'h_blank_'+k+'.png', C+'200.png', f'Blank Secret Role ({k})', 'card')
for f, lab in [('069','Liberal membership'),('086','Fascist membership'),('098','Communist membership'),('lobby','Lobby card'),('m_blank','Blank membership')]:
    card('c_'+f, 63.5, 88, C+f+'.png', C+'176.png', lab, 'card')
card('c_ballot', 63.5, 88, C+'015.png', C+'038.png', 'Ballot: Ja! / Nein', 'card')
card('c_ja', 63.5, 88, C+'015.png', C+'130.png', 'Ja! ballot', 'card')
card('c_nein', 63.5, 88, C+'038.png', C+'130.png', 'Nein ballot', 'card')
card('c_draw', 63.5, 88, C+'077.png', C+'077.png', 'Draw pile card', 'card')
card('c_discard', 63.5, 88, C+'079.png', C+'079.png', 'Discard pile card', 'card')
card('c_bback', 63.5, 88, C+'b_back.png', C+'b_back.png', 'Role Briefing back', 'card')
# boards, inserts, reference cards, placards
for k, n in [('liberal','Liberal board'),('fascist_5-6','Fascist board 5-6 players'),('fascist_7-8','Fascist board 7-8 players'),('fascist_9-10','Fascist board 9+ players'),('communist','Communist board')]:
    board('b_'+k, k, False, n); board('i_'+k, k, True, n+' (borderless)')
for key in B.LAMA: vector('r_'+key.lower(), key)
for nm in ('president', 'chancellor'):
    w, h = 104.5, 176.0; pid = 'pl_'+nm; c = canvas.Canvas(f'{OUT}/{pid}.pdf', pagesize=((w+2*BL)*mm, (h+2*BL)*mm))
    for side in (0, 1):
        c.setFillColorRGB(*[v/255 for v in B.OR]); c.rect(0, 0, (w+2*BL)*mm, (h+2*BL)*mm, stroke=0, fill=1)
        if side == 0:
            src = jpg(B.A+f'placard_{nm}.png'); iw, ih = Image.open(src).size; sc = min(w/iw, h/ih); dw, dh = iw*sc, ih*sc
            c.drawImage(src, (BL+(w-dw)/2)*mm, (BL+(h-dh)/2)*mm, dw*mm, dh*mm)
        c.showPage()
    c.save(); man[pid] = dict(kind='placard', w=w, h=h, label=nm.capitalize()+' placard')
json.dump(man, open('/home/claude/web/export/pieces.json', 'w'), indent=2)
tot = sum(os.path.getsize(f'{OUT}/{p}.pdf') for p in man)
print(len(man), 'pieces', round(tot/1e6, 1), 'MB')
