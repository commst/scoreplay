import verovio, sys
src, out, page = sys.argv[1], sys.argv[2], int(sys.argv[3])
tk = verovio.toolkit(); tk.setOptions({'pageWidth': 2100, 'pageHeight': 2970, 'scale': 35, 'breaks': 'encoded', 'adjustPageHeight': False})
tk.loadData(open(src, encoding='utf-8').read())
print('pages', tk.getPageCount())
open(out, 'w').write(tk.renderToSVG(page))
