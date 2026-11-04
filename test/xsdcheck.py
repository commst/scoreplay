import sys, re
from lxml import etree
xsd = open('/home/claude/work/xsd/musicxml.xsd', 'rb').read()
xsd = re.sub(rb'schemaLocation="[^"]*xml\.xsd"', b'schemaLocation="/home/claude/work/xsd/xml.xsd"', xsd)
xsd = re.sub(rb'schemaLocation="[^"]*xlink\.xsd"', b'schemaLocation="/home/claude/work/xsd/xlink.xsd"', xsd)
schema = etree.XMLSchema(etree.fromstring(xsd, base_url='/home/claude/work/xsd/'))
for f in sys.argv[1:]:
    doc = etree.parse(f, etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False))
    ok = schema.validate(doc)
    errs = list(schema.error_log)
    from collections import Counter
    c = Counter(re.sub(r"line \d+", "", e.message)[:160] for e in errs)
    print(f, 'VALID' if ok else f'INVALID {len(errs)}')
    for m, n in c.most_common(6): print('   ', n, m)
