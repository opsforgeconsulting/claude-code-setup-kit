import pymupdf, sys
d = pymupdf.open(sys.argv[1])
print("pages", d.page_count)
for i in range(d.page_count):
    pg = d[i]
    # lowest non-folio text block, in points (page is 792pt tall; folio sits ~760)
    blocks = [b for b in pg.get_text("blocks") if b[3] < 745]
    low = max((b[3] for b in blocks), default=0)
    print(i + 1, round(low), pg.get_text().strip()[:50].replace("\n", " "))
    pg.get_pixmap(dpi=55).save(f"pg{i+1:02d}.png")
