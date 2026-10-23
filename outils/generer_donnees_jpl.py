import json, sys, glob, os

sats = json.load(open(sys.argv[1]))
dossier = os.path.join(os.path.dirname(sys.argv[1]), 'jpl')

# Rayons moyens (km) de lunes absentes du tableau physique JPL (valeurs publiées, arrondies).
RAYONS = {
    'Elara': 43, 'Pasiphae': 30, 'Carme': 23, 'Sinope': 19, 'Lysithea': 18, 'Ananke': 14, 'Leda': 10,
    'Themisto': 4.5, 'Callirrhoe': 4.3, 'Megaclite': 2.7, 'Magaclite': 2.7, 'Taygete': 2.5, 'Kalyke': 2.6,
    'Harpalyke': 2.2, 'Iocaste': 2.6, 'Chaldene': 1.9, 'Praxidike': 3.4, 'Isonoe': 1.9, 'Erinome': 1.6,
    'Autonoe': 2, 'Thyone': 2, 'Hermippe': 2, 'Aitne': 1.5, 'Eurydome': 1.5, 'Euanthe': 1.5, 'Euporie': 1,
    'Orthosie': 1, 'Sponde': 1, 'Kale': 1, 'Pasithee': 1, 'Hegemone': 1.5, 'Mneme': 1, 'Aoede': 2,
    'Thelxinoe': 1, 'Arche': 1.5, 'Kallichore': 1, 'Helike': 2, 'Carpo': 1.5, 'Eukelade': 2, 'Cyllene': 1,
    'Kore': 1, 'Herse': 1, 'Dia': 2, 'Valetudo': 0.5, 'Ersa': 1.5, 'Pandia': 1.5, 'Eupheme': 1,
    'Philophrosyne': 1,
    'Daphnis': 3.8, 'Aegaeon': 0.3, 'Methone': 1.5, 'Anthe': 0.9, 'Pallene': 2.2, 'Telesto': 12.4,
    'Calypso': 10.7, 'Polydeuces': 1.3, 'Kiviuq': 8, 'Ijiraq': 6, 'Paaliaq': 11, 'Siarnaq': 20, 'Tarvos': 7.5,
    'Albiorix': 16, 'Erriapus': 5, 'Ymir': 9, 'Skathi': 4, 'Mundilfari': 3.5, 'Suttungr': 3.5, 'Thrymr': 3.5,
    'Narvi': 3.5, 'Bebhionn': 3, 'Bergelmir': 3, 'Bestla': 3.5, 'Farbauti': 2.5, 'Fenrir': 2, 'Fornjot': 3,
    'Hati': 3, 'Hyrrokkin': 4, 'Kari': 3.5, 'Loge': 3, 'Skoll': 3, 'Surtur': 3, 'Jarnsaxa': 3, 'Greip': 3,
    'Tarqeq': 3.5, 'Aegir': 3,
    'Cordelia': 20, 'Ophelia': 21, 'Bianca': 26, 'Cressida': 40, 'Desdemona': 32, 'Juliet': 47, 'Portia': 68,
    'Rosalind': 36, 'Cupid': 9, 'Belinda': 40, 'Perdita': 15, 'Puck': 81, 'Mab': 12, 'Francisco': 11,
    'Caliban': 36, 'Stephano': 16, 'Trinculo': 9, 'Sycorax': 75, 'Margaret': 10, 'Prospero': 25, 'Setebos': 24,
    'Ferdinand': 10,
    'Hippocamp': 17, 'Halimede': 31, 'Sao': 22, 'Laomedeia': 21, 'Psamathe': 20, 'Neso': 30,
}
# Petites lunes sans mesure : taille typique de leur famille (estimation).
DEFAUT = {'Jupiter': 1.5, 'Saturn': 2, 'Uranus': 4, 'Neptune': 8, 'Mars': 5, 'Pluto': 5, 'Earth': 5}

lignes = []
for s in sats:
    r, estime = s.get('rayon'), 0
    if not r:
        if s['nom'] in RAYONS: r = RAYONS[s['nom']]
        else: r, estime = DEFAUT[s['planete']], 1
    lignes.append([s['code'], s['planete'], s['nom'], s.get('gm'), r, estime, s.get('densite'),
                   s['a'], s['e'], s['w'], s['M'], s['i'], s['node'], s['P']])

ast = []
for f in sorted(glob.glob(os.path.join(dossier, 'sb_*.json'))):
    d = json.load(open(f))
    el = {e['name']: float(e['value']) for e in d['orbit']['elements'] if e['value'] is not None}
    ph = {p['name']: p['value'] for p in d.get('phys_par', [])}
    ast.append({
        'num': d['object']['des'], 'nom': d['object']['shortname'].split(' ', 1)[1],
        'a': el['a'], 'e': el['e'], 'i': el['i'], 'om': el['om'], 'w': el['w'], 'ma': el['ma'],
        'n': el['n'], 'epoqueJD': float(d['orbit']['epoch']),
        'diametre': float(ph['diameter']) if ph.get('diameter') else None,
        'gm': float(ph['GM']) if ph.get('GM') else None,
        'densite': float(ph['density']) if ph.get('density') else None,
        'albedo': float(ph['albedo']) if ph.get('albedo') else None,
        'rotation': float(ph['rot_per']) if ph.get('rot_per') else None,
        'type': ph.get('spec_B') or ph.get('spec_T'),
    })

print("'use strict';")
print('// Données NASA/JPL (Solar System Dynamics), générées automatiquement.')
print('// Lunes : https://ssd.jpl.nasa.gov/sats/elem/ et https://ssd.jpl.nasa.gov/sats/phys_par/')
print('// Astéroïdes : API SBDB https://ssd-api.jpl.nasa.gov/sbdb.api')
print('// Colonnes des lunes : code, planète, nom, GM (km³/s²), rayon (km), rayon estimé (1/0), densité (g/cm³),')
print('//   a (km), e, ω (°), M (°), i (°), nœud (°), période (jours)')
print('const LUNES_JPL = [')
for l in lignes:
    print('  ' + json.dumps(l, ensure_ascii=False) + ',')
print('];')
print('const ASTEROIDES_JPL = ' + json.dumps(ast, ensure_ascii=False, indent=1) + ';')
