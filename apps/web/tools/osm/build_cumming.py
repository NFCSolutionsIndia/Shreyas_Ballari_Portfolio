"""
Convert the OpenStreetMap extract of downtown Cumming, Georgia into the My World city data.

    python -I apps/web/tools/osm/build_cumming.py

Input:  references/osm/cumming.json (Overpass API export; data (c) OpenStreetMap contributors, ODbL)
Output: apps/web/src/portfolios/world/data/cumming.json      (buildings, roads, lots, parks)
        apps/web/src/portfolios/world/data/cummingRide.json  (the real street the ride follows)

World frame: the square (Tribble Gap Road x North Main Street x Dahlonega Street) sits at
(0, -340), where Shreyas waits with his bike. The map is rotated so the ride, south along
Tribble Gap Road into Veterans Memorial Boulevard, runs down -z. North is +z (towards the lake).
1 unit = 1/SCALE metre. Residential buildings never carry names (privacy: no homes are labelled).
"""

import json
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SRC = os.path.join(ROOT, 'references', 'osm', 'cumming.json')
OUT = os.path.join(ROOT, 'apps', 'web', 'src', 'portfolios', 'world', 'data')

ANCHOR_NODE = 68925046  # Tribble Gap Rd x N Main St x Dahlonega St
ANCHOR_WORLD = (0.0, -340.0)
SCALE = 1.3  # world units per metre (the journey's people and cars are drawn about 1.3-1.7x life size)
RIDE_LEN = 528.0 / SCALE  # metres of real street, matches the 528-unit ride section
RIDE_STREETS = ('Tribble Gap Road', 'Veterans Memorial Boulevard')
BOX = (-800.0, 800.0, -1000.0, -208.0)  # x0, x1, z0, z1 (lake promenade at -190..-214)

ROAD_W = {
    'motorway': 16, 'trunk': 15, 'primary': 13, 'secondary': 12, 'tertiary': 10, 'unclassified': 8,
    'residential': 7.5, 'living_street': 6, 'service': 4.8, 'pedestrian': 6,
    'motorway_link': 7, 'trunk_link': 7, 'primary_link': 7, 'secondary_link': 7, 'tertiary_link': 6,
}
DRIVABLE = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
            'living_street', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}

HOUSE_TYPES = {'house', 'detached', 'residential', 'semidetached_house', 'bungalow', 'terrace', 'cabin', 'shed', 'garage', 'garages', 'hut'}


def main():
    data = json.load(open(SRC, encoding='utf8'))['elements']
    nodes = {e['id']: (e['lat'], e['lon']) for e in data if e['type'] == 'node' and 'lat' in e}
    ways = [e for e in data if e['type'] == 'way']
    lat0, lon0 = nodes[ANCHOR_NODE]
    kx = 111320 * math.cos(math.radians(lat0))
    ky = 110540

    def en(n):
        la, lo = nodes[n]
        return ((lo - lon0) * kx, (la - lat0) * ky)

    # --- The ride: walk south from the square along Tribble Gap Rd / Veterans Memorial Blvd ----
    adj = {}
    for w in ways:
        t = w.get('tags', {})
        if t.get('name') in RIDE_STREETS and 'highway' in t:
            ns = w['nodes']
            for a, b in zip(ns, ns[1:]):
                adj.setdefault(a, set()).add(b)
                adj.setdefault(b, set()).add(a)
    path = [ANCHOR_NODE]
    seen = {ANCHOR_NODE}
    length = 0.0
    while length < RIDE_LEN + 80:
        cur = path[-1]
        cx, cy = en(cur)
        best = None
        for nb in adj.get(cur, ()):
            if nb in seen:
                continue
            x, y = en(nb)
            dy = y - cy
            if best is None or dy < best[0]:
                best = (dy, nb)
        if best is None or best[0] > 5:
            break
        seen.add(best[1])
        x, y = en(best[1])
        length += math.hypot(x - cx, y - cy)
        path.append(best[1])
    pts = [en(n) for n in path]
    # Point RIDE_LEN along the street sets the rotation (that point lands straight down -z).
    acc = 0.0
    end = pts[-1]
    for a, b in zip(pts, pts[1:]):
        seg = math.hypot(b[0] - a[0], b[1] - a[1])
        if acc + seg >= RIDE_LEN:
            k = (RIDE_LEN - acc) / seg
            end = (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)
            break
        acc += seg
    ang = math.atan2(end[0], -end[1])  # angle of the ride from due south

    ca, sa = math.cos(ang), math.sin(ang)

    def world(p):
        e, n = p
        # Rotate so the ride runs due south, then map north -> +z and east -> -x (a rotation).
        e2 = e * ca + n * sa
        n2 = -e * sa + n * ca
        return (round(ANCHOR_WORLD[0] - e2 * SCALE, 2), round(ANCHOR_WORLD[1] + n2 * SCALE, 2))

    ride = [world(p) for p in pts]
    print(f'ride: {len(ride)} points, {length:.0f} m, rotation {math.degrees(ang):.1f} deg, end {world(end)}')

    def inside(p, pad=0.0):
        return BOX[0] - pad <= p[0] <= BOX[1] + pad and BOX[2] - pad <= p[1] <= BOX[3] + pad

    # --- Buildings --------------------------------------------------------------------------
    buildings = []
    for w in ways:
        t = w.get('tags', {})
        if 'building' not in t or t.get('building') in ('roof', 'construction'):
            continue
        ring = [world(en(n)) for n in w['nodes'] if n in nodes]
        if len(ring) > 3 and ring[0] == ring[-1]:
            ring = ring[:-1]
        if len(ring) < 3:
            continue
        cx = sum(p[0] for p in ring) / len(ring)
        cz = sum(p[1] for p in ring) / len(ring)
        if not inside((cx, cz)):
            continue
        area = abs(poly_area(ring))
        if area < 12 * SCALE * SCALE:
            continue
        kind = classify(t, area / SCALE / SCALE)
        obb = min_obb(ring)
        h = height(t, kind, area / SCALE / SCALE) * SCALE
        b = {'k': kind, 'h': round(h, 1), 'p': [v for p in ring for v in p], 'o': [round(v, 2) for v in obb], 'r': round(area / max(obb[2] * obb[3], 1e-3), 2)}
        name = t.get('name')
        if name and kind not in ('house', 'apartments'):
            b['n'] = name
        buildings.append(b)

    # --- Roads --------------------------------------------------------------------------------
    roads = []
    for w in ways:
        t = w.get('tags', {})
        hw = t.get('highway')
        if hw not in ROAD_W:
            continue
        if hw == 'service' and t.get('service') in ('parking_aisle', 'drive-through', 'driveway'):
            continue
        pts_w = [world(en(n)) for n in w['nodes'] if n in nodes]
        for run in clip_runs(pts_w, inside):
            if len(run) < 2:
                continue
            lanes = t.get('lanes', '')
            width = ROAD_W[hw]
            if lanes.isdigit():
                width = max(width, int(lanes) * 3.4 + 1.2) if hw != 'service' else width
            r = {'c': hw, 'w': round(width * SCALE, 1), 'p': [v for p in run for v in p]}
            if t.get('name'):
                r['n'] = t['name']
            if t.get('oneway') == 'yes':
                r['o'] = 1
            if hw in DRIVABLE:
                r['d'] = 1
            roads.append(r)

    # --- Lots, parks, water ---------------------------------------------------------------------
    areas = []
    for w in ways:
        t = w.get('tags', {})
        kind = None
        if t.get('amenity') == 'parking' and t.get('parking', 'surface') == 'surface':
            kind = 'lot'
        elif t.get('leisure') in ('park', 'pitch', 'playground', 'garden', 'golf_course') or t.get('landuse') in ('grass', 'recreation_ground', 'cemetery', 'meadow', 'village_green'):
            kind = 'green'
        elif t.get('landuse') in ('forest',) or t.get('natural') in ('wood', 'scrub'):
            kind = 'wood'
        elif t.get('natural') == 'water':
            kind = 'water'
        if not kind:
            continue
        ring = [world(en(n)) for n in w['nodes'] if n in nodes]
        if len(ring) < 4 or ring[0] != ring[-1]:
            continue
        ring = ring[:-1]
        cx = sum(p[0] for p in ring) / len(ring)
        cz = sum(p[1] for p in ring) / len(ring)
        if not inside((cx, cz), 60):
            continue
        a = {'k': kind, 'p': [v for p in ring for v in p]}
        if t.get('name'):
            a['n'] = t['name']
        areas.append(a)

    os.makedirs(OUT, exist_ok=True)
    meta = {
        'attribution': 'Map data (c) OpenStreetMap contributors, ODbL',
        'anchor': 'Tribble Gap Road at North Main Street, Cumming, Georgia',
        'rotationDeg': round(math.degrees(ang), 2),
        'scale': SCALE,
    }
    with open(os.path.join(OUT, 'cumming.json'), 'w', encoding='utf8') as f:
        json.dump({'meta': meta, 'buildings': buildings, 'roads': roads, 'areas': areas}, f, separators=(',', ':'))
    # The ride, resampled every 12 m.
    with open(os.path.join(OUT, 'cummingRide.json'), 'w', encoding='utf8') as f:
        json.dump({'meta': meta, 'ride': resample(ride, 12.0)}, f, separators=(',', ':'))
    named = sorted(b['n'] for b in buildings if 'n' in b)
    print(f'buildings {len(buildings)} (named {len(named)}), roads {len(roads)}, areas {len(areas)}')
    print('named:', ', '.join(named))


def classify(t, area):
    b = t.get('building', 'yes')
    name = (t.get('name') or '').lower()
    am = t.get('amenity', '')
    if b in HOUSE_TYPES or (b == 'yes' and area < 200 and not name and not am and 'shop' not in t):
        return 'house'
    if b == 'apartments' or b == 'dormitory':
        return 'apartments'
    if b == 'parking' or 'parking deck' in name:
        return 'parking'
    if b in ('church', 'chapel', 'cathedral') or am == 'place_of_worship' or 'church' in name or 'presbyterian' in name or 'house of god' in name:
        return 'church'
    if b in ('civic', 'government', 'public', 'courthouse', 'fire_station', 'police') or am in ('courthouse', 'townhall', 'post_office', 'fire_station', 'police', 'prison') \
            or any(k in name for k in ('county', 'city hall', 'post office', 'courthouse', 'jail')):
        return 'civic'
    if b in ('school', 'university', 'college') or am in ('school', 'college') or 'student union' in name or 'hill center' in name:
        return 'school'
    if b in ('industrial', 'warehouse', 'manufacture') or (area > 3500 and not name):
        return 'industrial'
    return 'commercial'


def height(t, kind, area):
    lv = t.get('building:levels', '')
    try:
        levels = float(lv.split(';')[0])
    except ValueError:
        levels = 0
    if t.get('height'):
        try:
            return float(t['height'].split()[0])
        except ValueError:
            pass
    if levels:
        return levels * 3.6 + (1.2 if kind not in ('house',) else 0.4)
    return {
        'house': 4.2 if area < 140 else 5.6,
        'apartments': 11.5,
        'parking': 12.5,
        'church': 10.5,
        'civic': 13.0 if area > 1500 else 9.0,
        'school': 9.0,
        'industrial': 8.0,
        'commercial': 5.6 if area < 400 else 7.6 if area < 2000 else 9.4,
    }[kind]


def poly_area(r):
    s = 0.0
    for (x1, z1), (x2, z2) in zip(r, r[1:] + r[:1]):
        s += x1 * z2 - x2 * z1
    return s / 2


def min_obb(r):
    """Smallest oriented box around a ring: (cx, cz, w, d, ry). ry rotates local +x onto the box's w side."""
    best = None
    for (x1, z1), (x2, z2) in zip(r, r[1:] + r[:1]):
        a = math.atan2(z2 - z1, x2 - x1)
        c, s = math.cos(a), math.sin(a)
        us = [x * c + z * s for x, z in r]
        vs = [-x * s + z * c for x, z in r]
        w = max(us) - min(us)
        d = max(vs) - min(vs)
        if best is None or w * d < best[0]:
            mu = (max(us) + min(us)) / 2
            mv = (max(vs) + min(vs)) / 2
            best = (w * d, mu * c - mv * s, mu * s + mv * c, w, d, a)
    _, cx, cz, w, d, a = best
    # three.js rotation.y turns +x towards -z, so the box's long axis angle a (in xz) is ry = -a.
    return (cx, cz, w, d, -a)


def clip_runs(pts, inside):
    runs, cur = [], []
    for p in pts:
        if inside(p, 20):
            cur.append(p)
        else:
            if len(cur) > 1:
                runs.append(cur)
            cur = []
    if len(cur) > 1:
        runs.append(cur)
    return runs


def resample(pts, step):
    cum = [0.0]
    for a, b in zip(pts, pts[1:]):
        cum.append(cum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    out, i, t = [], 0, 0.0
    while t <= cum[-1]:
        while cum[i + 1] < t:
            i += 1
        seg = cum[i + 1] - cum[i] or 1
        k = (t - cum[i]) / seg
        a, b = pts[i], pts[i + 1]
        out.append((round(a[0] + (b[0] - a[0]) * k, 2), round(a[1] + (b[1] - a[1]) * k, 2)))
        t += step
    return out


if __name__ == '__main__':
    sys.exit(main())
