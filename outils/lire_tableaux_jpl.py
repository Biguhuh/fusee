import sys, json, re
from html.parser import HTMLParser

class T(HTMLParser):
    def __init__(self, table_id):
        super().__init__()
        self.id = table_id; self.inside = False; self.rows = []; self.row = None; self.cell = None; self.depth = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'table' and a.get('id') == self.id:
            self.inside = True
        if not self.inside: return
        if tag == 'tr': self.row = []
        if tag == 'td':
            if self.cell is not None and self.row is not None: self.row.append(self.cell)
            self.cell = ''
    def handle_endtag(self, tag):
        if not self.inside: return
        if tag == 'td' and self.cell is not None:
            self.row.append(self.cell); self.cell = None
        if tag == 'tr' and self.row is not None:
            if self.cell is not None: self.row.append(self.cell); self.cell = None
            if self.row: self.rows.append([re.sub(r'\s+', ' ', c).strip() for c in self.row])
            self.row = None
        if tag == 'table': self.inside = False
    def handle_data(self, d):
        if self.inside and self.cell is not None: self.cell += d

def num(s):
    try: return float(s)
    except: return None

phys_p = T('sat_phys_par'); phys_p.feed(open(sys.argv[1], encoding='utf-8').read())
elem_p = T('sat_elem'); elem_p.feed(open(sys.argv[2], encoding='utf-8').read())
out = {}
for r in phys_p.rows:
    if len(r) < 9: continue
    planet, name, code = r[0], r[1], r[2]
    out[code] = {'planete': planet, 'nom': name, 'code': code, 'gm': num(r[3]), 'rayon': num(r[6]), 'densite': num(r[9]) if len(r) > 9 else None}
elems = {}
for r in elem_p.rows:
    if len(r) < 14: continue
    # ID, Planet, Satellite, Code, Ephem, Frame, Epoch, a, e, w, M, i, node, P
    code = r[3]
    if code in elems: continue
    elems[code] = {'planete': r[1], 'nom': r[2], 'a': num(r[7]), 'e': num(r[8]), 'w': num(r[9]), 'M': num(r[10]), 'i': num(r[11]), 'node': num(r[12]), 'P': num(r[13]), 'frame': r[5]}
for code, e in elems.items():
    d = out.setdefault(code, {'planete': e['planete'], 'nom': e['nom'], 'code': code, 'gm': None, 'rayon': None, 'densite': None})
    d.update({k: e[k] for k in ('a', 'e', 'w', 'M', 'i', 'node', 'P', 'frame')})
print(json.dumps(sorted(out.values(), key=lambda x: (x['planete'], -(x['rayon'] or 0))), ensure_ascii=False))
print(len(phys_p.rows), len(elem_p.rows), len(out), file=sys.stderr)
