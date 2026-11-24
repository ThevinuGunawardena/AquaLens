"""SQLite persistence, seed data, and auth utilities for Aqua Quest API."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
from pathlib import Path
import secrets
import sqlite3
from typing import Any, Iterator

from dotenv import load_dotenv
import jwt

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_PATH = BASE_DIR / os.getenv("DATABASE_PATH", "aqua_quest.db")
JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "aqualens-dev-fallback-secret-change-in-production-0123456789abcdef",
)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "30"))
XP_PER_LEVEL = 100

SEED_SPECIES: list[tuple[str, str, str, str, str, float]] = [
    (
        "Yellowfin Tuna",
        "Thunnus albacares",
        "Pelagic",
        "Open ocean offshore waters",
        "Fast-swimming pelagic tuna prized for speed, stamina, and bright yellow dorsal fins.",
        110.0,
    ),
    (
        "Giant Trevally",
        "Caranx ignobilis",
        "Reef",
        "Coral reefs, drop-offs, and rocky headlands",
        "Apex reef predator known for explosive surface strikes and powerful runs.",
        85.0,
    ),
    (
        "Barramundi",
        "Lates calcarifer",
        "Coastal",
        "Estuaries, lagoons, and mangrove creeks",
        "Iconic brackish-water sportfish with silver flanks and acrobatic jumps.",
        65.0,
    ),
    (
        "Mahi-Mahi",
        "Coryphaena hippurus",
        "Pelagic",
        "Warm offshore currents and floating debris",
        "Vibrant golden-green surface fighter found in tropical and subtropical seas.",
        95.0,
    ),
    (
        "Mangrove Red Snapper",
        "Lutjanus argentimaculatus",
        "Reef",
        "Inshore reefs, wrecks, and estuaries",
        "Aggressive copper-red snapper with sharp canine teeth and strong structure instincts.",
        52.0,
    ),
    (
        "Spanish Mackerel",
        "Scomberomorus commerson",
        "Pelagic",
        "Coastal reefs and current edges",
        "Narrow-barred mackerel famous for blistering high-speed runs.",
        90.0,
    ),
    (
        "Indo-Pacific Sailfish",
        "Istiophorus platypterus",
        "Legendary",
        "Bluewater continental shelf edges",
        "Distinguished by its towering dorsal sail and elongated bill; one of the fastest fish in the ocean.",
        210.0,
    ),
    (
        "Malabar Grouper",
        "Epinephelus malabaricus",
        "Reef",
        "Deep reefs, caves, and harbor structures",
        "Heavy-bodied ambush predator that retreats into reef ledges immediately upon hookup.",
        75.0,
    ),
    (
        "Spangled Emperor",
        "Lethrinus nebulosus",
        "Reef",
        "Sandy reef flats and seagrass beds",
        "Hard-fighting reef species marked with electric-blue cheek streaks.",
        48.0,
    ),
    (
        "Cobia",
        "Rachycentron canadum",
        "Rare",
        "Offshore buoys, wrecks, and coastal channels",
        "Curiosity-driven brown cruiser often spotted shadowing rays and sharks.",
        92.0,
    ),
    (
        "Giant Snakehead",
        "Channa micropeltes",
        "Freshwater",
        "Reservoirs, lakes, and vegetated riverbanks",
        "Fierce freshwater ambush predator guarding fry balls aggressively.",
        60.0,
    ),
    (
        "Ruby Snapper",
        "Etelis carbunculus",
        "Deep",
        "Deepwater rocky seamounts (150-400m)",
        "Deep-drop crimson snapper inhabiting cold offshore ledges.",
        58.0,
    ),
]

SEED_ACHIEVEMENTS: list[tuple[str, str, str, str, int]] = [
    ("first_catch", "First Catch", "Log your very first fish catch.", "🎣", 50),
    ("photo_finish", "Photo Finish", "Log a catch with an uploaded photo.", "📸", 50),
    ("big_game", "Trophy 50+", "Land a fish measuring at least 50 cm.", "🏅", 75),
    ("meter_club", "Meter Club", "Land a trophy fish of 100 cm or longer.", "🏆", 150),
    ("five_catches", "Regular Angler", "Log 5 catches in your angler record.", "⚓", 100),
    ("species_explorer", "Species Explorer", "Catch 3 different fish species.", "🐠", 100),
]


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    """Yields a SQLite connection configured with row factories and foreign keys."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Creates tables and populates seed species and achievements if empty."""
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT,
                avatar_url TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER NOT NULL DEFAULT 1,
                tutorial_seen INTEGER NOT NULL DEFAULT 0,
                xp INTEGER NOT NULL DEFAULT 0,
                school_or_university TEXT,
                district TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS species (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                scientific_name TEXT NOT NULL,
                category TEXT NOT NULL,
                image TEXT,
                description TEXT,
                habitat TEXT,
                average_size_cm REAL
            );

            CREATE TABLE IF NOT EXISTS catches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                species_id INTEGER NOT NULL REFERENCES species(id),
                length_cm REAL NOT NULL,
                width_cm REAL,
                remarks TEXT,
                boat_number TEXT,
                image TEXT,
                xp_awarded INTEGER NOT NULL DEFAULT 25,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                experience INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_achievements (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
                completed_at TEXT NOT NULL,
                PRIMARY KEY (user_id, achievement_id)
            );
            """
        )

        species_count = conn.execute("SELECT COUNT(*) FROM species").fetchone()[0]
        if species_count == 0:
            conn.executemany(
                """
                INSERT INTO species (name, scientific_name, category, habitat, description, average_size_cm)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                SEED_SPECIES,
            )

        ach_count = conn.execute("SELECT COUNT(*) FROM achievements").fetchone()[0]
        if ach_count == 0:
            conn.executemany(
                """
                INSERT INTO achievements (code, title, description, icon, experience)
                VALUES (?, ?, ?, ?, ?)
                """,
                SEED_ACHIEVEMENTS,
            )


def hash_password(password: str) -> str:
    """Hashes a plaintext password with PBKDF2-HMAC-SHA256 and a random salt."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored_hash: str | None) -> bool:
    """Verifies a plaintext password against a stored salt$digest string."""
    if not stored_hash or "$" not in stored_hash:
        return False
    salt, expected = stored_hash.split("$", 1)
    actual = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000
    ).hex()
    return hmac.compare_digest(actual, expected)


def create_access_token(user_id: int) -> str:
    """Creates a signed JWT access token for the given user id."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Decodes a JWT access token and returns the integer user id, or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (jwt.PyJWTError, ValueError, TypeError):
        return None


def serialize_user(row: sqlite3.Row) -> dict[str, Any]:
    """Formats a SQLite user row into the API's UserDto dictionary."""
    xp = int(row["xp"] or 0)
    level = (xp // XP_PER_LEVEL) + 1
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "avatar_url": row["avatar_url"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "tutorial_seen": bool(row["tutorial_seen"]),
        "has_password": bool(row["password_hash"]),
        "xp": xp,
        "level": level,
        "xp_to_next_level": XP_PER_LEVEL - (xp % XP_PER_LEVEL),
        "school_or_university": row["school_or_university"],
        "district": row["district"],
    }


def evaluate_achievements(conn: sqlite3.Connection, user_id: int) -> tuple[list[dict[str, Any]], int]:
    """Checks and unlocks any newly earned achievements for `user_id`."""
    stats = conn.execute(
        """
        SELECT
            COUNT(*) AS total_catches,
            COALESCE(MAX(length_cm), 0) AS max_length,
            COUNT(DISTINCT species_id) AS distinct_species,
            SUM(CASE WHEN image IS NOT NULL AND image != '' THEN 1 ELSE 0 END) AS photo_catches
        FROM catches
        WHERE owner_id = ?
        """,
        (user_id,),
    ).fetchone()

    total_catches = int(stats["total_catches"] or 0)
    max_length = float(stats["max_length"] or 0.0)
    distinct_species = int(stats["distinct_species"] or 0)
    photo_catches = int(stats["photo_catches"] or 0)

    conditions = {
        "first_catch": total_catches >= 1,
        "photo_finish": photo_catches >= 1,
        "big_game": max_length >= 50.0,
        "meter_club": max_length >= 100.0,
        "five_catches": total_catches >= 5,
        "species_explorer": distinct_species >= 3,
    }

    existing_ids = {
        r["achievement_id"]
        for r in conn.execute(
            "SELECT achievement_id FROM user_achievements WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    }

    all_achievements = conn.execute("SELECT * FROM achievements ORDER BY id").fetchall()
    now_iso = datetime.now(timezone.utc).isoformat()
    newly_unlocked: list[dict[str, Any]] = []
    bonus_xp = 0

    for ach in all_achievements:
        if ach["id"] in existing_ids:
            continue
        if conditions.get(ach["code"], False):
            conn.execute(
                """
                INSERT INTO user_achievements (user_id, achievement_id, completed_at)
                VALUES (?, ?, ?)
                """,
                (user_id, ach["id"], now_iso),
            )
            xp_val = int(ach["experience"])
            bonus_xp += xp_val
            newly_unlocked.append(
                {
                    "id": ach["id"],
                    "code": ach["code"],
                    "title": ach["title"],
                    "name": ach["title"],
                    "description": ach["description"],
                    "icon": ach["icon"],
                    "experience": xp_val,
                    "completed": True,
                    "completed_at": now_iso,
                }
            )

    return newly_unlocked, bonus_xp
