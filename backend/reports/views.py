import io

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .builders import BUILDERS, parse_date


def _to_xlsx(title, headers, rows):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    wb = Workbook()
    ws = wb.active
    ws.title = title[:30]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="EF2935")
    for row in rows:
        ws.append([str(v) if v is not None and not isinstance(v, (int, float)) else v for v in row])
    for col in ws.columns:
        width = max(len(str(c.value)) if c.value is not None else 0 for c in col)
        ws.column_dimensions[col[0].column_letter].width = min(max(width + 2, 10), 50)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _to_pdf(title, headers, rows):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    cell = styles["BodyText"]
    cell.fontSize = 7
    cell.leading = 9
    data = [[Paragraph(f"<b>{h}</b>", cell) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(v) if v is not None else "", cell) for v in row])
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FDECED")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D9DCE1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    stamp = timezone.localtime().strftime("%Y-%m-%d %H:%M")
    doc.build([
        Paragraph(f"MUSASHI - {title}", styles["Title"]),
        Paragraph(f"Generated {stamp} - {len(rows)} rows", styles["Normal"]),
        Spacer(1, 10),
        table,
    ])
    return buf.getvalue()


class ReportView(APIView):
    """GET /api/reports/<slug>/?warehouse=&date_from=&date_to=&export=xlsx|pdf"""

    def get(self, request, slug):
        builder = BUILDERS.get(slug)
        if not builder:
            raise NotFound("Jenis laporan tidak ditemukan.")
        params = {
            "warehouse": request.query_params.get("warehouse") or None,
            "date_from": parse_date(request.query_params.get("date_from")),
            "date_to": parse_date(request.query_params.get("date_to")),
        }
        title, headers, rows = builder(params)
        export = request.query_params.get("export")
        if not export:
            preview = [[("" if v is None else str(v)) for v in r] for r in rows[:200]]
            return Response({"title": title, "headers": headers, "rows": preview, "total": len(rows)})

        filename = f"{slug}-{timezone.localdate().isoformat()}"
        if export == "xlsx":
            resp = HttpResponse(
                _to_xlsx(title, headers, rows),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            resp["Content-Disposition"] = f'attachment; filename="{filename}.xlsx"'
            return resp
        if export == "pdf":
            resp = HttpResponse(_to_pdf(title, headers, rows), content_type="application/pdf")
            resp["Content-Disposition"] = f'attachment; filename="{filename}.pdf"'
            return resp
        raise ValidationError({"export": "Gunakan xlsx atau pdf."})
