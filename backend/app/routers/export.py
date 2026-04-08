import csv
from io import BytesIO, StringIO
from fastapi import APIRouter
from fastapi.responses import Response
from reportlab.pdfgen import canvas
from ..store import store

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/pdf")
def export_pdf(version_id: str):
    """
    Generate valid PDF payload using ReportLab.
    Following PRD Section 13.2 specification.
    """
    buffer = BytesIO()
    p = canvas.Canvas(buffer)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 800, f"Timetable Export - Version: {version_id}")
    
    p.setFont("Helvetica", 12)
    p.drawString(100, 770, "Dynamically generated schedule bundle from TimeTable X")
    
    entries = store.fallback.list("editorEntries") if hasattr(store, "fallback") else store.list("editorEntries")
    
    y = 730
    for e in entries[:60]:
        text = f"{e.get('day')} | {e.get('timeslotId').upper()} | {e.get('courseCode')} | {e.get('facultyName')} | {e.get('roomName')}"
        p.drawString(100, y, text)
        y -= 20
        if y < 50:
            p.showPage()
            p.setFont("Helvetica", 12)
            y = 800
            
    p.showPage()
    p.save()
    
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="timetable_{version_id}.pdf"'}
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
        headers={"Content-Disposition": f'attachment; filename="timetable_{version_id}.csv"'}
    )
