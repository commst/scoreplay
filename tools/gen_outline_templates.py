"""MuseScore 2 PDF(글꼴 없이 외곽선으로 저장)의 기호를 알아보기 위한 견본을 음악 글꼴에서 만든다.
출력: outline-templates.json  [{k: 글꼴, n: 이름, c: Maestro 코드, t: 종류, a: 가로/세로, b: [xMin,yMin,xMax,yMax]/em, g: 16x16 비트(hex)}]"""
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.pens.boundsPen import BoundsPen

FD = '/home/claude/musescore/ms203/fonts/'
FONTS = {'emm': FD + 'mscore/mscore.ttf', 'bra': FD + 'bravura/Bravura.otf', 'goo': FD + 'gootville/Gootville.otf'}
NAMES = {'emm': FD + 'mscore/glyphnames.json', 'bra': FD + 'bravura/glyphnames.json', 'goo': FD + 'gootville/glyphnames.json'}
N = 16
# SMuFL 이름 → (Maestro 코드, 종류)
MAP = {
  'noteheadBlack': (207, 'head'), 'noteheadHalf': (250, 'head'), 'noteheadWhole': (119, 'head'),
  'noteheadXBlack': (207, 'head'), 'noteheadXHalf': (250, 'head'), 'noteheadXWhole': (119, 'head'),
  'noteheadCircleX': (207, 'head'), 'noteheadTriangleUpBlack': (207, 'head'), 'noteheadDiamondBlack': (207, 'head'),
  'noteheadSlashHorizontalEnds': (207, 'head'),
  'restWhole': (183, 'rest'), 'restHalf': (238, 'rest'), 'restQuarter': (206, 'rest'), 'rest8th': (228, 'rest'),
  'rest16th': (197, 'rest'), 'rest32nd': (168, 'rest'),
  'augmentationDot': (46, 'dot'),
  'flag8thUp': (106, 'flag'), 'flag8thDown': (74, 'flag'), 'flag16thUp': (114, 'flag'), 'flag16thDown': (82, 'flag'),
  'articAccentAbove': (62, 'mark'), 'articAccentBelow': (62, 'mark'),
  'fermataAbove': (85, 'mark'), 'fermataBelow': (85, 'mark'),
  'timeSigCommon': (99, 'digit'),
  'repeat1Bar': (212, 'mark'), 'repeat2Bars': (199, 'mark'), 'tremolo3': (190, 'mark'),
  'segno': (37, 'mark'), 'coda': (222, 'mark'),
  'unpitchedPercussionClef1': (214, 'clef'), 'gClef': (38, 'clef'), 'fClef': (63, 'clef'), 'cClef': (66, 'clef'),
  'dynamicPiano': (112, 'dyn'), 'dynamicForte': (102, 'dyn'), 'dynamicMezzo': (109, 'dyn'),
  'dynamicSforzando': (115, 'dyn'), 'dynamicZ': (122, 'dyn'), 'dynamicRinforzando': (114, 'dyn'),
}
for d in range(10): MAP[f'timeSig{d}'] = (48 + d, 'digit')
# 셈여림을 한 덩어리로 그린 경우(글자를 이어 붙인 문자열)
COMBOS = {'mf': (70, 'mf'), 'mp': (80, 'mp'), 'pp': (185, 'pp'), 'ppp': (184, 'ppp'), 'ff': (196, 'ff'), 'fff': (236, 'fff'),
          'sfz': (167, 'sfz'), 'sf': None, 'fp': None, 'sfp': None, 'fz': None}
LET = {'p': 'dynamicPiano', 'f': 'dynamicForte', 'm': 'dynamicMezzo', 's': 'dynamicSforzando', 'z': 'dynamicZ', 'r': 'dynamicRinforzando'}

def build(key):
    font = TTFont(FONTS[key]); gs = font.getGlyphSet(); cmap = font.getBestCmap(); em = font['head'].unitsPerEm
    names = json.load(open(NAMES[key]))
    hmtx = font['hmtx']
    def gname(smufl):
        if smufl not in names: return None
        cp = int(names[smufl]['codepoint'][2:], 16)
        return cmap.get(cp)
    out = []
    def emit(name, code, kind, parts):
        # parts: [(glyphName, dx)]
        xs = []
        for gn, dx in parts:
            bp = BoundsPen(gs); gs[gn].draw(bp)
            if not bp.bounds: return
            b = bp.bounds; xs.append((b[0] + dx, b[1], b[2] + dx, b[3]))
        x0 = min(b[0] for b in xs); y0 = min(b[1] for b in xs); x1 = max(b[2] for b in xs); y1 = max(b[3] for b in xs)
        w, h = x1 - x0, y1 - y0
        if w <= 0 or h <= 0: return
        bits = 0
        for j in range(N):
            for i in range(N):
                px = x0 + (i + 0.5) * w / N; py = y1 - (j + 0.5) * h / N   # 위에서 아래로
                inside = False
                for gn, dx in parts:
                    pen = PointInsidePen(gs, (px - dx, py), evenOdd=False); gs[gn].draw(pen)
                    if pen.getResult(): inside = True; break
                if inside: bits |= 1 << (j * N + i)
        out.append({'k': key, 'n': name, 'c': code, 't': kind, 'a': round(w / h, 4),
                    'b': [round(v / em, 4) for v in (x0, y0, x1, y1)], 'g': format(bits, '064x')})
    for smufl, (code, kind) in MAP.items():
        gn = gname(smufl)
        if gn: emit(smufl, code, kind, [(gn, 0)])
    for s, v in COMBOS.items():
        gns = [gname(LET[ch]) for ch in s]
        if not all(gns): continue
        parts, x = [], 0
        for gn in gns: parts.append((gn, x)); x += hmtx[gn][0]
        code, val = v if v else (0, s)
        emit('dyn_' + s, code, 'dyncombo:' + val, parts)
    return out

allt = []
for k in FONTS: allt += build(k)
# 셋잇단 등 숫자 (MuseScore 2 기본 글꼴 FreeSerif 기울임)
font = TTFont(FD + 'FreeSerifItalic.ttf'); gs = font.getGlyphSet(); cmap = font.getBestCmap(); em = font['head'].unitsPerEm
for d in '35679':
    gn = cmap[ord(d)]; bp = BoundsPen(gs); gs[gn].draw(bp); x0, y0, x1, y1 = bp.bounds; w, h = x1 - x0, y1 - y0
    bits = 0
    for j in range(N):
        for i in range(N):
            pen = PointInsidePen(gs, (x0 + (i + 0.5) * w / N, y1 - (j + 0.5) * h / N), evenOdd=False); gs[gn].draw(pen)
            if pen.getResult(): bits |= 1 << (j * N + i)
    allt.append({'k': 'txt', 'n': 'tuplet' + d, 'c': ord(d), 't': 'tuplet', 'a': round(w / h, 4), 'b': [round(v / em, 4) for v in (x0, y0, x1, y1)], 'g': format(bits, '064x')})
json.dump(allt, open(sys.argv[1], 'w'), separators=(',', ':'))
print(len(allt), 'templates', {k: sum(1 for t in allt if t['k'] == k) for k in ['emm', 'bra', 'goo', 'txt']})
