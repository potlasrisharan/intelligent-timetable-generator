import csv
import re
from io import BytesIO, StringIO
from fastapi import APIRouter
from fastapi.responses import Response
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from ..store import store

router = APIRouter(prefix="/export", tags=["export"])


def _sanitize_filename(value: str) -> str:
    """Strip dangerous characters from filename components to prevent header injection."""
    return re.sub(r"[^a-zA-Z0-9_\-]", "", value)[:100]


@router.get("/pdf")
def export_pdf(version_id: str):
    """
    Generate valid PDF payload using ReportLab.
    Following PRD Section 13.2 specification.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Title
    elements.append(Paragraph(f"Timetable Export - Version: {version_id}", styles['Title']))
    elements.append(Paragraph("Dynamically generated schedule bundle from TimeTable X", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Table Data
    data = [["Day", "Time", "Course", "Section", "Faculty", "Room", "Type"]]
    
    entries = store.fallback.list("editorEntries") if hasattr(store, "fallback") else store.list("editorEntries")
    
    for e in entries:
        data.append([
            e.get('day', ''),
            e.get('timeslotId', '').upper(),
            e.get('courseCode', ''),
            e.get('sectionId', '').upper(),
            e.get('facultyName', ''),
            e.get('roomName', ''),
            e.get('type', '')
        ])
    
    if len(data) > 1:
        t = Table(data, colWidths=[40, 40, 60, 60, 130, 120, 60])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey])
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("No schedule entries found for this version.", styles['Normal']))
        
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="timetable_{_sanitize_filename(version_id)}.pdf"'}
    )
    
@router.get("/excel")
def export_excel(version_id: str):
    """
    Generate CSV for Excel.
    Following PRD Section 13.2 specification.
    """
    entries = store.fallback.list("editorEntries") if hasattr(store, "fallback") else store.list("editorEntries")
    
    csv_file = StringIO()
    writer = csv.writer(csv_file)
    writer.writerow(["Day", "Timeslot", "Section", "Course Code", "Course Name", "Faculty", "Room", "Type", "Source"])
    
    for e in entries:
        writer.writerow([
            e.get("day", ""),
            e.get("timeslotId", ""),
            e.get("sectionId", ""),
            e.get("courseCode", ""),
            e.get("courseName", ""),
            e.get("facultyName", ""),
            e.get("roomName", ""),
            e.get("type", ""),
            "Manual" if e.get("locked") else "Auto-generated"
        ])
        
    return Response(
        content=csv_file.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="timetable_{_sanitize_filename(version_id)}.csv"'}
    )
