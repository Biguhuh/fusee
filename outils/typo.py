"""Typographie française dans le texte des chaînes JS et de index.html :
espaces insécables (normale avant « : », fine avant « ; ! ? », entre nombre et unité, dans les guillemets),
apostrophes courbes. Ne touche jamais le code : seulement le texte des littéraux '…', "…", `…`
(hors ${…}, traités récursivement comme du code).
Usage : python3 typo.py <racine> [--sec]   (--sec : n'écrit rien, affiche les changements)"""
import re, sys, os

NBSP, FINE = '\u00a0', '\u202f'   # espace insécable, espace fine insécable (écrites en code, jamais en dur)
TROU = ''   # place d'une interpolation ${…} dans le texte d'un gabarit
L = r"A-Za-zÀ-ÖØ-öø-ÿœŒæÆ"
UNITES = r"(?:km/s|km/h|km|m/s²|m/s|mm/s²|mm|cm|m|s|h|min|j|t|kg|kN|MN|°C|K|bar|kPa|Pa|%|UA|Sv|mSv|µSv|g|W|ans|an|années-lumière|année-lumière|jours|jour|mois)"
journal = []

def typo_texte(t, guillemet=None):
    avant = t
    # Apostrophes : lettre ' lettre (ou \' dans une chaîne entre apostrophes)
    t = re.sub(rf"(?<=[{L}])\\'(?=[{L}])", '’', t) if guillemet == "'" else t
    t = re.sub(rf"(?<=[{L}])'(?=[{L}])", '’', t)
    # Espace avant « : » (suivi d'une espace, d'une fin, d'une interpolation ou d'une balise)
    t = re.sub(rf" :(?=[ \n{TROU}<]|$|\\n)", NBSP + ':', t)
    # Espace fine avant ; ! ?
    t = re.sub(rf" ([;!?])(?=[ \n{TROU}<)»]|$|\\n)", FINE + r'\1', t)
    # Guillemets
    t = t.replace('« ', '«' + NBSP).replace(' »', NBSP + '»')
    # Nombre (ou interpolation) + unité
    t = re.sub(rf"(?<![A-Z]-\d)(?<=[\d{TROU}]) (?={UNITES}(?![{L}\d’'/]))", NBSP, t)
    t = re.sub(rf"(?<=[\d{TROU}]) (?={UNITES}/(?:jour|j|s)\b)", NBSP, t)
    # Début de chaîne : « ' km' » collé à un nombre calculé avant
    t = re.sub(rf"^ (?={UNITES}(?![{L}\d’'/]))", NBSP, t)
    if t != avant: journal.append((avant, t))
    return t

AVANT_REGEX = '(,=:[!&|?{};+-*%<>~^'

def fin_regex(src, j):
    """src[j] == '/' ouvre une regex : renvoie l'indice juste après ses drapeaux."""
    n = len(src); j += 1; cls = False
    while j < n and src[j] != '\n':
        if src[j] == '\\': j += 2; continue
        if src[j] == '[': cls = True
        elif src[j] == ']': cls = False
        elif src[j] == '/' and not cls: break
        j += 1
    j += 1
    while j < n and src[j].isalpha(): j += 1
    return j

def fin_gabarit(src, j):
    """src[j] == '`' : renvoie l'indice juste après le ` fermant."""
    n = len(src); j += 1
    while j < n and src[j] != '`':
        if src[j] == '\\': j += 2; continue
        if src.startswith('${', j): j = fin_expr(src, j + 2) + 1; continue
        j += 1
    return j + 1

def fin_expr(src, k):
    """Code d'une interpolation qui commence en k : renvoie l'indice de l'accolade fermante."""
    n = len(src); prof = 1; prev = '('
    while k < n:
        ch = src[k]
        if ch in '\'"':
            k += 1
            while k < n and src[k] != ch:
                if src[k] == '\\': k += 1
                k += 1
            k += 1; prev = 'x'; continue
        if ch == '`': k = fin_gabarit(src, k); prev = 'x'; continue
        if ch == '/' and prev in AVANT_REGEX and not src.startswith('//', k): k = fin_regex(src, k); prev = 'x'; continue
        if ch == '{': prof += 1
        elif ch == '}':
            prof -= 1
            if prof == 0: return k
        if not ch.isspace(): prev = ch
        k += 1
    raise ValueError('interpolation non fermée')

def transformer_code(src):
    out, i, n = [], 0, len(src)
    prev = ''
    while i < n:
        c = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i); j = n if j < 0 else j
            out.append(src[i:j]); i = j; continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2) + 2
            out.append(src[i:j]); i = j; continue
        if c == '/' and prev in '(,=:[!&|?{};+-*%<>~^' or (c == '/' and prev == ''):
            j = i + 1; cls = False
            while j < n and src[j] != '\n':
                if src[j] == '\\': j += 2; continue
                if src[j] == '[': cls = True
                elif src[j] == ']': cls = False
                elif src[j] == '/' and not cls: break
                j += 1
            j += 1
            while j < n and src[j].isalpha(): j += 1
            out.append(src[i:j]); i = j; prev = 'x'; continue
        if c in '\'"':
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == '\\': j += 1
                j += 1
            corps = src[i + 1:j]
            out.append(c + typo_texte(corps, c) + c); i = j + 1; prev = 'x'; continue
        if c == '`':
            j = i + 1; textes, exprs, buf = [], [], []
            while j < n and src[j] != '`':
                if src[j] == '\\': buf.append(src[j:j + 2]); j += 2; continue
                if src.startswith('${', j):
                    k = fin_expr(src, j + 2)
                    textes.append(''.join(buf)); buf = []
                    exprs.append(src[j + 2:k]); j = k + 1; continue
                buf.append(src[j]); j += 1
            textes.append(''.join(buf))
            joint = TROU.join(textes)
            joint = typo_texte(joint, '`')
            parts = joint.split(TROU)
            assert len(parts) == len(textes), 'interpolation perdue'
            res = ['`']
            for k, p in enumerate(parts):
                res.append(p)
                if k < len(exprs): res.append('${' + transformer_code(exprs[k]) + '}')
            res.append('`')
            out.append(''.join(res)); i = j + 1; prev = 'x'; continue
        if not c.isspace(): prev = c
        out.append(c); i += 1
    return ''.join(out)

def transformer_html(src):
    # Texte entre les balises, hors <script> et <style>.
    morceaux = re.split(r'(<script.*?</script>|<style.*?</style>|<[^>]*>)', src, flags=re.S)
    return ''.join(m if m.startswith('<') else typo_texte(m) for m in morceaux)

racine = sys.argv[1]; sec = '--sec' in sys.argv
fichiers = [('index.html', transformer_html)] + [(f'js/{f}', transformer_code) for f in sorted(os.listdir(os.path.join(racine, 'js'))) if f.endswith('.js') and f != 'donnees-jpl.js']
for nom, fn in fichiers:
    chemin = os.path.join(racine, nom)
    src = open(chemin, encoding='utf-8').read()
    avant = len(journal)
    neuf = fn(src)
    if neuf != src:
        print(f'{nom} : {len(journal) - avant} chaînes modifiées')
        if not sec: open(chemin, 'w', encoding='utf-8').write(neuf)
if sec:
    for a, b in journal[:4000]:
        print(repr(a)[:150]); print('  →', repr(b)[:150])
