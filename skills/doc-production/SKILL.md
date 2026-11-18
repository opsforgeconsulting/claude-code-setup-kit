---
name: doc-production
description: Produce a polished, print-ready PDF (playbook, report, operating guide, proposal) or Word file on a Windows machine and verify every page before handing it over. Use when asked for "a PDF", "a high-end playbook", "a report in my Downloads", a printable guide, or a named .docx. Covers the HTML -> headless Chrome PDF pipeline, Word COM rendering for .docx, the page-overflow check, and file-locking. For a living doc to read/edit online, use Claude Docs instead.
---

# Doc Production

Documents go to clients and family. They must look designed, read like a human expert wrote them, and have zero overflowing or clipped pages. Not done until every page has been looked at.

## Pick the format
- **PDF (default for "playbook", "guide", "report", anything printed or sent)**: HTML + CSS -> headless Chrome. Full design control.
- **.docx** only when Word is named, or the recipient must edit: docx-js (the `docx` skill has the gotchas).
- **Claude Doc** when the ask is "a document to read through" with no format: living doc, opens in the browser.

## PDF pipeline
1. Write `page.html` in a scratch folder with the Write tool (not a bash heredoc - non-ASCII and template literals get mangled).
2. Page model:
   ```css
   @page { size: Letter; margin: 0; }
   html, body { margin: 0; }
   .page { width: 8.5in; min-height: 11in; padding: 0.6in 0.8in 0.8in; box-sizing: border-box; page-break-after: always; position: relative; }
   ```
   One `.page` per printed page; folio/footer absolutely positioned at the bottom. Fonts from a Google Fonts `<link>`; colours as CSS variables; `-webkit-print-color-adjust: exact; print-color-adjust: exact;` on body so backgrounds print.
3. Render:
   ```bash
   "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-pdf-header-footer \
     --virtual-time-budget=8000 --print-to-pdf="C:\\Users\\<you>\\Downloads\\<Name>.pdf" "file:///C:/path/to/page.html"
   ```
   `--virtual-time-budget` lets web fonts load; without it the PDF falls back to system fonts.
4. Verify with `python check_pdf.py <pdf>` (this folder; needs `pip install pymupdf`): prints the page count and the lowest text block per page, and saves `pgNN.png` thumbnails. A page whose lowest block is past ~745 pt is overflowing. Expected page count = number of `.page` divs; more pages = overflow somewhere.
5. LOOK at the PNGs (Read tool) - cover, contents, every dense page, the last page. Fix overflow by tightening that section (padding, font-size 0.2-0.4pt, two-column grids, `grid-auto-flow: column` for a long contents list), never by shrinking the whole document.
6. Re-render and re-check until the page count matches and nothing is clipped.

## .docx pipeline
- docx-js script (US Letter 12240 x 15840 DXA; dual table widths; ShadingType.CLEAR). `docx` may need `npm install docx` in the scratch folder.
- To check the rendering without LibreOffice, use Word COM in PowerShell:
  `$w = New-Object -ComObject Word.Application; $d = $w.Documents.Open('<docx>'); $d.SaveAs([ref]'<pdf>', [ref]17); $d.Close(); $w.Quit()`
  then `check_pdf.py` on that PDF and look at the pages.

## Files
- Output to the user's Downloads folder with a clear Title-Case-Hyphenated name.
- If the target is open/locked (overwrite fails), save `-v2`, `-v3`; don't ask the user to close it mid-task. Tell them the new name.

## Writing standard
- Human copywriter voice: plain sentences, no filler, no em-dash chains, no "In today's world".
- Research documents label every claim: Documented / Reported / Claimed / Approximate. Dates absolute.
- Personal finance/investing content: general education only, say plainly that this is not licensed advice, point to a fee-only fiduciary.
- Cover, contents, numbered sections, a sources page when research-based.

## Report back
Path, page count, what's in it, and that every page was checked (or exactly which were not).
