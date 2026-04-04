from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import csv
import io
import uuid
from typing import Optional
from ..store import store

router = APIRouter(prefix="/import", tags=["import"])

@router.post("/csv")
async def import_csv(file: UploadFile = File(...)):
    """
    Import CSV payloads and parse them intelligently based on their headers.
    Automatically injects the valid rows into the OR-Tools Store.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Must upload a CSV file.")
        
    content = await file.read()
    text = content.decode("utf-8")
    
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
         raise HTTPException(status_code=400, detail="CSV file empty or invalid format.")
         
    fieldnames = [f.lower().strip() for f in reader.fieldnames]
    
    added_count = 0
    collection = ""
    
    # Infer Type of Payload based on CSV headers
    if "capacity" in fieldnames:
        collection = "rooms"
        for row in reader:
            store.create("rooms", {
                "id": f"rm-{uuid.uuid4().hex[:6]}",
                "name": row.get("name", "Unknown Room"),
                "block": row.get("block", "Main"),
                "capacity": int(row.get("capacity", 30)),
                "room_type": "LAB" if "lab" in str(row.get("name", "")).lower() else "CLASSROOM",
                "utilization": 0
            })
            added_count += 1
            
    elif "theory_hours" in fieldnames or "theory hours" in fieldnames:
        collection = "courses"
        for row in reader:
            th = row.get("theory_hours", row.get("theory hours", "0"))
            ph = row.get("practical_hours", row.get("practical hours", "0"))
            
            # Simple assumption: section_ids is a comma separated string
            sec_ids_raw = row.get("section_ids", row.get("sections", ""))
            sec_ids = [s.strip() for s in sec_ids_raw.split(";")] if sec_ids_raw else []
            
            store.create("courses", {
                 "id": f"crs-{uuid.uuid4().hex[:6]}",
                 "code": row.get("code", "UNK"),
                 "name": row.get("name", "Unknown Course"),
                 "department_id": row.get("department_id", "cse"),
                 "semester": int(row.get("semester", 1)),
                 "theory_hours": int(th) if str(th).isdigit() else 0,
                 "practical_hours": int(ph) if str(ph).isdigit() else 0,
                 "lab_required": int(ph) > 0,
                 "faculty_id": row.get("faculty_id", "fac-001"),
                 "section_ids": sec_ids,
                 "status": "scheduled"
            })
            added_count += 1
            
    else:
         raise HTTPException(status_code=400, detail="Unrecognized CSV format. Headers must include 'capacity' for Rooms, or 'theory_hours' for Courses.")

    return JSONResponse({"status": "success", "message": f"Successfully imported {added_count} {collection} from {file.filename}."})


@router.post("/manual")
async def import_manual(
    room_name: Optional[str] = Form(None),
    capacity: Optional[int] = Form(None),
    target_branch: Optional[str] = Form(None),
    section_name: Optional[str] = Form(None),
    student_count: Optional[int] = Form(None)
):
    """
    Accept manual form inputs from the Admin Dashboard.
    Creates rooms and sections simultaneously for immediate constraint solving.
    """
    added = []
    if room_name and capacity:
        store.create("rooms", {
            "id": f"rm-{uuid.uuid4().hex[:6]}",
            "name": room_name,
            "block": "Manual Block",
            "capacity": int(capacity),
            "room_type": "LAB" if "lab" in room_name.lower() else "CLASSROOM",
            "utilization": 0
        })
        added.append(f"Room {room_name}")
        
    if section_name and target_branch and student_count:
        department_short = str(target_branch).lower()
        store.create("sections", {
            "id": f"sec-{uuid.uuid4().hex[:6]}",
            "name": section_name,
            "department_id": department_short,
            "semester": 1,
            "student_count": int(student_count),
            "advisor": "Pending Admin",
            "compactness" : 100
        })
        added.append(f"Section {section_name}")

    if not added:
        raise HTTPException(status_code=400, detail="No valid data provided.")
        
    return JSONResponse({"status": "success", "message": f"Successfully injected: {', '.join(added)} to the generation pool!"})
