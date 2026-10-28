# 합주연습기 빌드: src/ + banks/ → dist/
#   dist/index.html        한 파일 배포판 (악기 녹음까지 모두 포함, 이 파일 하나만 올리면 됨)
#   dist/split/index.html  가벼운 배포판 (banks/ 폴더와 함께 올림, 고른 악기 녹음만 받아 옴)
#   index.html, version.json  GitHub Pages로 내보내는 판(= dist/index.html)과 판 번호
import re, json, base64, os, glob, shutil
ROOT = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(ROOT, 'src', f), encoding='utf-8').read()
strip = lambda s: re.sub(r'^import .*\n', '', re.sub(r'^export ', '', s, flags=re.M), flags=re.M)
banks = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, 'banks', '*.json')))
meta = {n: json.load(open(os.path.join(ROOT, 'banks', n + '.json'))) for n in banks}
ranges = {n: [min(c[1] for c in m), max(c[1] for c in m)] for n, m in meta.items()}
parser = '\n'.join(strip(src(f)) for f in ['outline-templates.js', 'outline-glyphs.js', 'score-parser.js'])
import datetime
# 판 번호(한국 시각). 화면 아래에 보이고, 웹 주소에서는 version.json과 견줘 새 판 알림을 띄운다
VER = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')
h = (src('index.template.html').replace('/*__VERSION__*/', VER).replace('/*__BANK_RANGES__*/{}', json.dumps(ranges)).replace('/*__SAMPLES__*/', src('samples.json'))
     .replace('/*__PARSER__*/', parser).replace('/*__ENGINE__*/', strip(src('audio-engine.js'))).replace('/*__MELODY__*/', strip(src('melody-engine.js'))))
mm = re.match(r'(<title>.*?</title>\s*<meta[^>]*>\s*<link[^>]*>\s*<style>.*?</style>)(.*)', h, re.S)
doc = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}body{margin:0}</style>\n'
       + mm.group(1) + '\n</head>\n<body>' + mm.group(2) + '\n</body>\n</html>\n')
os.makedirs(os.path.join(ROOT, 'dist', 'split', 'banks'), exist_ok=True)
# 가벼운 판
open(os.path.join(ROOT, 'dist', 'split', 'index.html'), 'w', encoding='utf-8').write(doc)
for n in banks:
    for ext in ('.mp3', '.json'): shutil.copy(os.path.join(ROOT, 'banks', n + ext), os.path.join(ROOT, 'dist', 'split', 'banks', n + ext))
# 한 파일 판
one = doc.replace('/*__EMBEDDED_BANKS__*/{}', json.dumps({n: {'meta': meta[n]} for n in banks}, separators=(',', ':')))
blobs = ''.join(f'<script type="text/plain" id="bank-{n}">' + base64.b64encode(open(os.path.join(ROOT, 'banks', n + '.mp3'), 'rb').read()).decode() + '</script>\n' for n in banks)
one = one.replace('</body>', blobs + '</body>')
open(os.path.join(ROOT, 'dist', 'index.html'), 'w', encoding='utf-8').write(one)
# GitHub Pages: 저장소 맨 위 index.html + version.json (새 판 알림용)
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(one)
open(os.path.join(ROOT, 'version.json'), 'w', encoding='utf-8').write(json.dumps({'v': VER}, ensure_ascii=False))
print('dist/index.html', len(one), '| dist/split/index.html', len(doc), '| index.html + version.json', VER)
