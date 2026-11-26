"""roles.json: one entry per role, feeding both the rulebook role sections and the Role Briefing cards."""
import sys, json, re
sys.path.insert(0, 'scripts')
import briefing as BR
RB = json.load(open('/tmp/roleboxes.json'))
ART = {'liberal': ['061','062','063','064','065','067','068'], 'fascist': ['080','081','082','083'], 'hitler': ['085'],
       'communist': ['093','094','095','097'], 'centrist': ['r_centrist_a','r_centrist_b']}
#            module        seat (whose place the role takes)  rulebook "add it when" table
META = {
 'liberal':     dict(module='base', party='liberal', regular=True),
 'fascist':     dict(module='base', party='fascist', regular=True),
 'hitler':      dict(module='base', party='fascist', regular=True),
 'communist':   dict(module='communists', party='communist', regular=True),
 'centrist':    dict(module='roles', seat='liberal', seatLabel='Liberals', party='liberal', count=4, countLabel='2 to 4', addWhenTable='Big games: the Liberals get a small group that trusts each other.', withCommunists=True),
 'capitalist':  dict(module='roles', seat='liberal', seatLabel='A Liberal', party='liberal', addWhenTable='<b>Communist policies pass too quickly</b>, or Radicalisation is too easy.', withCommunists=True, needsCommunists=True,
                     membership={'liberal': 1, 'fascist': 1, 'lobby': 1}),
 'monarchist':  dict(module='roles', seat='fascist', seatLabel='A Fascist', party='fascist', addWhenTable='<b>The Fascists win too often.</b>', withCommunists=True),
 'anarchist':   dict(module='roles', seat='communist', seatLabel='A Communist', party='communist', addWhenTable='The group knows the Communists well and <b>wants a wild card</b>.', withCommunists=True, needsCommunists=True),
 'bodyguard':   dict(module='roles', seat='fascist', seatLabel='A Fascist', party='fascist', addWhenTable='<b>Hitler is found and executed too often.</b>'),
 'fascist_spy': dict(module='roles', seat='fascist', seatLabel='A Fascist', party='fascist', addWhenTable='You want a <b>hidden duel</b>. Always add both.', pair='liberal_spy'),
 'liberal_spy': dict(module='roles', seat='liberal', seatLabel='A Liberal', party='liberal', addWhenTable='You want a <b>hidden duel</b>. Always add both.', pair='fascist_spy'),
 'jester':      dict(module='roles', seat='liberal', seatLabel='A Liberal', party='fascist', addWhenTable='<b>Executions happen too easily.</b>', membership={'fascist': 1}),
 'propagandist':dict(module='roles', seat='any', seatLabel='Any party (usually Fascist)', party='any', addWhenTable='Elections are <b>too predictable</b>.', membership={'fascist': 1}),
 'bureaucrat':  dict(module='roles', seat='any', seatLabel='Any party (usually Liberal)', party='any', addWhenTable='Liberals are <b>fooled about discards</b> too often.', membership={'liberal': 1}),
 'detective':   dict(module='roles', seat='liberal', seatLabel='A Liberal; party drawn at setup', party='drawn', addWhenTable='You want <b>stronger investigations</b>.',
                     membership={'liberal': 2, 'fascist': 1, 'communist': 1}),
}
def html(t):
    t = re.sub(r'<b>(.*?)</b>', r'<b>\1</b>', t)
    return t
roles = []
for key, r in BR.ROLES.items():
    m = META[key]
    art = ART.get(key, ['r_' + key])
    e = dict(id=key, name=r['name'], module=m['module'], palette=r['team'], party=m['party'],
             regular=m.get('regular', False), seat=m.get('seat'), seatLabel=m.get('seatLabel'), count=m.get('count', 1), countLabel=m.get('countLabel'),
             pair=m.get('pair'), withCommunists=m.get('withCommunists', False), needsCommunists=m.get('needsCommunists', False),
             extraMembership=m.get('membership'),
             art=['h_' + a for a in art], portrait='n_' + art[0], crop=list(BR.CROP[key]),
             briefing=dict(side=r['side'], card=r['card'], sections=[dict(label=l, items=list(items)) for l, items in r['secs']]),
             rulebook=dict(RB[key], addWhenTable=m.get('addWhenTable'), seatLabel=m.get('seatLabel')) if key in RB else None)
    roles.append(e)
pal = {k: dict(header=v[0], headerText=v[1], accent=v[2], paper=v[3]) for k, v in BR.TEAM.items()}
json.dump(dict(palettes=pal, roles=roles,
               blank=dict(sections=[dict(label='YOU WIN IF', lines=3), dict(label='YOU KNOW', lines=2), dict(label='YOUR POWER', lines=3)])),
          open('/home/claude/web/export/roles.json', 'w'), indent=2, ensure_ascii=False)
print(len(roles), 'roles;', 'palettes', list(pal))
