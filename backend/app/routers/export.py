import csv
from io import StringIO
from fastapi import APIRouter
from fastapi.responses import Response
from ..store import store

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/pdf")
def export_pdf(version_id: str):
    """
    Generate mock PDF payload.
    Following PRD Section 13.2 specification.
    """
    content = f"%PDF-1.4\\n1 0 obj << /Title (Timetable {version_id}) >> endobj\\n%EOF"
    return Response(
        content=content,
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
