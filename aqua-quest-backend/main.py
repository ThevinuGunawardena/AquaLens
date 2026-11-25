"""FastAPI server for Aqua Quest / Aqua Lens matching aquaquest-openapi.json."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
from typing import Annotated, Any
import uuid

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from database import (
    BASE_DIR,
    XP_PER_LEVEL,
    create_access_token,
    decode_access_token,
    evaluate_achievements,
    get_db,
    hash_password,
    init_db,
    serialize_user,
    verify_password,
)

UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", str(BASE_DIR / "static" / "uploads")))
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

UPLOAD_PHOTO_TUTORIAL = {
    "id": "upload-photo",
    "title": "Welcome to Aqua Lens",
    "steps": [
        {
            "step": 1,
            "title": "Frame the Full Fish",
            "description": "Lay your catch flat with good lighting so the snout, fins, and tail are clearly visible in a single shot.",
        },
        {
            "step": 2,
            "title": "Select Species & Measure Length",
            "description": "Pick the matching species from the dictionary dropdown and enter total length in centimeters.",
        },
        {
            "step": 3,
            "title": "Earn XP & Track Milestones",
            "description": "Every logged catch awards XP, unlocks angler achievements, and counts toward your 100-catch certificate.",
        },
    ],
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Aqua Quest API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def envelope(
    data: Any = None,
    message: str = "OK",
    status_code: int = 200,
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    """Wraps payload in the standard { success, status, message, data, errors } envelope."""
    body: dict[str, Any] = {
        "success": 200 <= status_code < 300,
        "status": status_code,
        "message": message,
        "data": data,
        "errors": None,
    }
    if extra:
        body.update(extra)
    return JSONResponse(status_code=status_code, content=body)


def error_response(message: str, status_code: int, errors: Any = None) -> JSONResponse:
    """Returns a non-2xx JSON response formatted with the standard API envelope."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "status": status_code,
            "message": message,
            "detail": message,
            "data": None,
            "errors": errors,
        },
    )


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> sqlite3.Row:
    """Resolves and validates the bearer JWT into the active user row."""
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row or not row["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found or inactive.",
            )
        return row


class RegisterIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=8)


class GoogleAuthIn(BaseModel):
    id_token: str


class ProfileUpdate(BaseModel):
    name: str | None = None
    avatar_url: str | None = None
    school_or_university: str | None = None
    district: str | None = None


class CatchIn(BaseModel):
    species_id: int
    length_cm: float = Field(..., gt=0.0)
    width_cm: float | None = None
    remarks: str | None = None
    boat_number: str | None = None
    image: str | None = None


def serialize_catch(row: sqlite3.Row) -> dict[str, Any]:
    """Formats a joined catch + species row into CatchDto."""
    return {
        "id": row["id"],
        "owner_id": row["owner_id"],
        "species_id": row["species_id"],
        "species_name": row["species_name"],
        "length_cm": row["length_cm"],
        "remarks": row["remarks"],
        "boat_number": row["boat_number"],
        "image": row["image"],
        "xp_awarded": row["xp_awarded"],
        "created_at": row["created_at"],
    }


@app.get("/")
def health() -> JSONResponse:
    return envelope({"status": "ok"}, message="Aqua Quest API is running")


@app.post("/auth/register", tags=["auth"])
def register(payload: RegisterIn) -> JSONResponse:
    name = payload.name.strip()
    email = payload.email.strip().lower()
    if not name:
        return error_response("Name is required.", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if "@" not in email or "." not in email.split("@", 1)[-1]:
        return error_response("Please provide a valid email address.", status.HTTP_422_UNPROCESSABLE_ENTITY)

    now_iso = datetime.now(timezone.utc).isoformat()
    pw_hash = hash_password(payload.password)

    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return error_response(
                "An account with this email already exists.",
                status.HTTP_409_CONFLICT,
            )

        cursor = conn.execute(
            """
            INSERT INTO users (name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (name, email, pw_hash, now_iso),
        )
        user_id = int(cursor.lastrowid)
        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    token = create_access_token(user_id)
    return envelope(
        {
            "user": serialize_user(user_row),
            "access_token": token,
            "token_type": "bearer",
        },
        message="Account created successfully",
    )


@app.post("/auth/login", tags=["auth"])
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> JSONResponse:
    email = form_data.username.strip().lower()
    with get_db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user_row or not verify_password(form_data.password, user_row["password_hash"]):
        return error_response("Invalid email or password.", status.HTTP_401_UNAUTHORIZED)

    if not user_row["is_active"]:
        return error_response("Account is inactive.", status.HTTP_403_FORBIDDEN)

    token = create_access_token(int(user_row["id"]))
    return envelope(
        {
            "user": serialize_user(user_row),
            "access_token": token,
            "token_type": "bearer",
        },
        message="Signed in successfully",
    )


@app.post("/auth/google", tags=["auth"])
def google_auth(_: GoogleAuthIn) -> JSONResponse:
    return error_response(
        "Google Sign-In is not configured on this local server.",
        status.HTTP_501_NOT_IMPLEMENTED,
    )


@app.get("/auth/me", tags=["auth"])
def me(current_user: Annotated[sqlite3.Row, Depends(get_current_user)]) -> JSONResponse:
    return envelope(serialize_user(current_user))


@app.get("/users/me/stats", tags=["users"])
def get_my_stats(current_user: Annotated[sqlite3.Row, Depends(get_current_user)]) -> JSONResponse:
    with get_db() as conn:
        total_catches = conn.execute(
            "SELECT COUNT(*) FROM catches WHERE owner_id = ?",
            (current_user["id"],),
        ).fetchone()[0]
    data = serialize_user(current_user)
    data["total_catches"] = int(total_catches)
    return envelope(data)


@app.patch("/users/me", tags=["users"])
def update_profile(
    payload: ProfileUpdate,
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    fields = payload.model_fields_set
    updates: list[str] = []
    values: list[Any] = []

    if "name" in fields and payload.name is not None:
        cleaned_name = payload.name.strip()
        if not cleaned_name:
            return error_response("Name cannot be empty.", status.HTTP_422_UNPROCESSABLE_ENTITY)
        updates.append("name = ?")
        values.append(cleaned_name)

    if "avatar_url" in fields:
        updates.append("avatar_url = ?")
        values.append(payload.avatar_url)

    if "school_or_university" in fields:
        updates.append("school_or_university = ?")
        values.append(payload.school_or_university)

    if "district" in fields:
        updates.append("district = ?")
        values.append(payload.district)

    with get_db() as conn:
        if updates:
            values.append(current_user["id"])
            conn.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                tuple(values),
            )
        updated = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (current_user["id"],),
        ).fetchone()

    return envelope(serialize_user(updated), message="Profile updated")


@app.post("/users/me/tutorial-complete", tags=["users"])
def complete_tutorial(
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET tutorial_seen = 1 WHERE id = ?",
            (current_user["id"],),
        )
        updated = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (current_user["id"],),
        ).fetchone()
    return envelope(serialize_user(updated), message="Tutorial marked complete")


@app.get("/tutorial/upload-photo", tags=["tutorial"])
def get_upload_photo_tutorial() -> JSONResponse:
    return envelope(UPLOAD_PHOTO_TUTORIAL)


@app.get("/tutorial/status", tags=["tutorial"])
def get_tutorial_status(
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    return envelope({"tutorial_seen": bool(current_user["tutorial_seen"])})


@app.get("/species/", tags=["species"])
def list_species(q: str | None = Query(default=None)) -> JSONResponse:
    with get_db() as conn:
        if q and q.strip():
            pattern = f"%{q.strip().lower()}%"
            rows = conn.execute(
                """
                SELECT * FROM species
                WHERE LOWER(name) LIKE ?
                   OR LOWER(scientific_name) LIKE ?
                   OR LOWER(category) LIKE ?
                ORDER BY name ASC
                """,
                (pattern, pattern, pattern),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM species ORDER BY name ASC").fetchall()

    return envelope([dict(r) for r in rows])


@app.get("/species/{species_id}", tags=["species"])
def get_species(species_id: int) -> JSONResponse:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM species WHERE id = ?",
            (species_id,),
        ).fetchone()
    if not row:
        return error_response("Species not found.", status.HTTP_404_NOT_FOUND)
    return envelope(dict(row))


@app.post("/catches/upload-image", tags=["catches"])
async def upload_catch_image(
    _: Annotated[sqlite3.Row, Depends(get_current_user)],
    file: UploadFile = File(...),
) -> JSONResponse:
    orig_suffix = Path(file.filename or "").suffix.lower()
    ext = (
        orig_suffix
        if orig_suffix in ALLOWED_IMAGE_EXTENSIONS
        else MIME_TO_EXT.get((file.content_type or "").lower(), ".jpg")
    )

    contents = await file.read()
    if not contents:
        return error_response("Uploaded image file is empty.", status.HTTP_400_BAD_REQUEST)
    if len(contents) > 15 * 1024 * 1024:
        return error_response("Image exceeds 15 MB limit.", status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    saved_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / saved_name
    dest.write_bytes(contents)

    return envelope({"url": f"/static/uploads/{saved_name}"}, message="Image uploaded")


@app.post("/catches/", tags=["catches"])
def add_catch(
    payload: CatchIn,
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    user_id = int(current_user["id"])
    now_iso = datetime.now(timezone.utc).isoformat()
    base_xp = 25

    with get_db() as conn:
        species_row = conn.execute(
            "SELECT id, name FROM species WHERE id = ?",
            (payload.species_id,),
        ).fetchone()
        if not species_row:
            return error_response("Selected species does not exist.", status.HTTP_404_NOT_FOUND)

        cursor = conn.execute(
            """
            INSERT INTO catches (
                owner_id, species_id, length_cm, width_cm, remarks, boat_number, image, xp_awarded, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                payload.species_id,
                payload.length_cm,
                payload.width_cm,
                payload.remarks,
                payload.boat_number,
                payload.image,
                base_xp,
                now_iso,
            ),
        )
        catch_id = int(cursor.lastrowid)

        newly_unlocked, bonus_xp = evaluate_achievements(conn, user_id)
        total_xp_awarded = base_xp + bonus_xp

        if bonus_xp > 0:
            conn.execute(
                "UPDATE catches SET xp_awarded = ? WHERE id = ?",
                (total_xp_awarded, catch_id),
            )

        conn.execute(
            "UPDATE users SET xp = xp + ? WHERE id = ?",
            (total_xp_awarded, user_id),
        )

        catch_row = conn.execute(
            """
            SELECT c.*, s.name AS species_name
            FROM catches c
            LEFT JOIN species s ON s.id = c.species_id
            WHERE c.id = ?
            """,
            (catch_id,),
        ).fetchone()
        user_row = conn.execute("SELECT xp FROM users WHERE id = ?", (user_id,)).fetchone()
        total_catches = conn.execute(
            "SELECT COUNT(*) FROM catches WHERE owner_id = ?",
            (user_id,),
        ).fetchone()[0]

    new_xp = int(user_row["xp"])
    return envelope(
        {
            "catch": serialize_catch(catch_row),
            "xp_awarded": total_xp_awarded,
            "newly_unlocked_achievements": newly_unlocked,
            "progress": {
                "xp": new_xp,
                "level": (new_xp // XP_PER_LEVEL) + 1,
                "xp_to_next_level": XP_PER_LEVEL - (new_xp % XP_PER_LEVEL),
                "total_catches": int(total_catches),
            },
        },
        message="Catch logged successfully",
    )


@app.get("/catches/mine", tags=["catches"])
def get_my_catches(
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> JSONResponse:
    user_id = int(current_user["id"])
    with get_db() as conn:
        total = conn.execute(
            "SELECT COUNT(*) FROM catches WHERE owner_id = ?",
            (user_id,),
        ).fetchone()[0]
        rows = conn.execute(
            """
            SELECT c.*, s.name AS species_name
            FROM catches c
            LEFT JOIN species s ON s.id = c.species_id
            WHERE c.owner_id = ?
            ORDER BY c.id DESC
            LIMIT ? OFFSET ?
            """,
            (user_id, limit, offset),
        ).fetchall()

    return envelope(
        [serialize_catch(r) for r in rows],
        extra={"total": int(total), "limit": limit, "offset": offset},
    )


@app.get("/catches/{catch_id}", tags=["catches"])
def get_catch(
    catch_id: int,
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT c.*, s.name AS species_name
            FROM catches c
            LEFT JOIN species s ON s.id = c.species_id
            WHERE c.id = ? AND c.owner_id = ?
            """,
            (catch_id, current_user["id"]),
        ).fetchone()
    if not row:
        return error_response("Catch not found.", status.HTTP_404_NOT_FOUND)
    return envelope(serialize_catch(row))


@app.delete("/catches/{catch_id}", tags=["catches"])
def delete_catch(
    catch_id: int,
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM catches WHERE id = ? AND owner_id = ?",
            (catch_id, current_user["id"]),
        ).fetchone()
        if not existing:
            return error_response("Catch not found.", status.HTTP_404_NOT_FOUND)
        conn.execute("DELETE FROM catches WHERE id = ?", (catch_id,))
    return envelope({"id": catch_id}, message="Catch deleted")


@app.get("/achievements/", tags=["achievements"])
def list_achievements(
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
                a.id,
                a.code,
                a.title,
                a.description,
                a.icon,
                a.experience,
                ua.completed_at
            FROM achievements a
            LEFT JOIN user_achievements ua
              ON ua.achievement_id = a.id AND ua.user_id = ?
            ORDER BY a.id ASC
            """,
            (current_user["id"],),
        ).fetchall()

    data = [
        {
            "id": r["id"],
            "code": r["code"],
            "title": r["title"],
            "description": r["description"],
            "icon": r["icon"],
            "experience": r["experience"],
            "completed": r["completed_at"] is not None,
            "completed_at": r["completed_at"],
        }
        for r in rows
    ]
    return envelope(data)


@app.get("/certificate/eligibility", tags=["certificate"])
def certificate_eligibility(
    current_user: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    with get_db() as conn:
        total = conn.execute(
            "SELECT COUNT(*) FROM catches WHERE owner_id = ?",
            (current_user["id"],),
        ).fetchone()[0]
    total_int = int(total)
    return envelope(
        {
            "eligible": total_int >= 100,
            "required_catches": 100,
            "total_catches": total_int,
        }
    )


@app.get("/certificate/achievers", tags=["certificate"])
def certificate_achievers(
    _: Annotated[sqlite3.Row, Depends(get_current_user)],
) -> JSONResponse:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
                u.id AS user_id,
                u.name,
                u.email,
                COUNT(c.id) AS total_catches
            FROM users u
            JOIN catches c ON c.owner_id = u.id
            GROUP BY u.id
            HAVING COUNT(c.id) >= 100
            ORDER BY total_catches DESC, u.id ASC
            """
        ).fetchall()
    return envelope([dict(r) for r in rows])
