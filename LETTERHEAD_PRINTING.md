# Printing on pre-printed letterhead

OmniMed Core can print A4 invoices and reports on plain paper using its built-in centre header, or on
the centre's own pre-printed letterhead without duplicating the header.

## Configure it

Open **Settings -> Centre profile -> Pre-printed letterhead** as an administrator.

| Setting | Meaning |
| --- | --- |
| A4 report header | **Built-in OmniMed header** or **Pre-printed centre letterhead** for pathology and X-ray reports |
| A4 invoice header | **Built-in OmniMed header** or **Pre-printed centre letterhead** for tax invoices |
| Top margin | Blank space reserved below the pre-printed header |
| Bottom margin | Blank space kept above the pre-printed footer |
| Left / right margins | Blank side margins for the stationery |
| Signature block on printed reports | Show or hide the pathologist/radiologist signature block |

The defaults are 45 mm top, 12 mm left/right and 18 mm bottom. They are only starting values. Measure
the actual clear area of your letterhead from the paper edge and adjust them.

If your letterhead already carries the pathologist/radiologist signature, set **Signature block on
printed reports** to **Hide signature block**. This removes the name, qualification, signature image and
report-release line from the printed report while keeping the signature stored on the report record.

## What changes in pre-printed mode

- The built-in centre name, address, phone, GSTIN, accreditation line and logo are hidden on A4 print.
- The report/invoice title, number, date, patient details and clinical content still print.
- A4 page margins are applied dynamically from the saved tenant settings.
- Thermal 80 mm receipts are unchanged and still print the centre identity.

Pre-printed mode is selected independently for:

- Pathology and X-ray reports
- A4 GST invoices

You can print reports on pre-printed stationery while keeping invoices on plain paper, or the reverse.
The margin settings are shared by both document types.

## Aligning the print

1. Save the pre-printed letterhead settings.
2. Open an invoice or report and print it on a plain sheet first.
3. Hold the plain sheet against the pre-printed letterhead.
4. Adjust the top margin until the first content line clears the pre-printed header.
5. Adjust the bottom margin until the footer and signature block stay clear of the pre-printed footer.
6. Print on the real letterhead.

In the Windows print dialog:

- choose **A4**
- choose **100% / actual size** (not "fit to page")
- turn **headers and footers off**
- choose the correct paper tray/feed orientation

Those print-dialog options belong to Windows/WebView2 and cannot be forced by the application. If the
printer driver scales the page, the margins will drift.

## Limits

- Only the first page of a multi-page report can sit on the pre-printed design; continuation pages use
  the same margins on plain paper.
- The application does not detect the physical letterhead or calibrate the printer automatically.
- A scanned letterhead image is not embedded into the PDF/report; the mode reserves space for real
  stationery.
- Always keep a plain-paper built-in-header fallback for reprints and for printers that cannot feed
  pre-printed stock reliably.
