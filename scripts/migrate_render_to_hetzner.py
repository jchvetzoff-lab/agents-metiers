#!/usr/bin/env python3
"""
Migrate all fiches from Render PostgreSQL to Hetzner SQLite via API export + SSH import.
"""
import json
import subprocess
import sys
import time
import urllib.request
import urllib.error

RENDER_BASE = "https://agents-metiers-1.onrender.com"
BATCH_SIZE = 100

def fetch_json(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            if attempt < retries - 1:
                print(f"  Retry {attempt+1}... ({e})")
                time.sleep(2)
            else:
                raise

def main():
    # 1. Get total count from Render
    stats = fetch_json(f"{RENDER_BASE}/api/stats")
    total = stats["total"]
    print(f"Render has {total} fiches to export")

    # 2. Export all fiches (list endpoint - basic info)
    all_fiches = []
    offset = 0
    while offset < total:
        batch = fetch_json(f"{RENDER_BASE}/api/fiches?limit={BATCH_SIZE}&offset={offset}")
        results = batch.get("results", [])
        all_fiches.extend(results)
        offset += BATCH_SIZE
        print(f"  Exported {len(all_fiches)}/{total} fiches (list)")

    print(f"\nTotal fiches exported: {len(all_fiches)}")

    # 3. For enriched/validated/published fiches, get the full detail
    enriched_codes = [f["code_rome"] for f in all_fiches if f["statut"] != "brouillon" and f["code_rome"]]
    print(f"\nFetching full detail for {len(enriched_codes)} enriched fiches...")
    details = {}
    for i, code in enumerate(enriched_codes):
        try:
            detail = fetch_json(f"{RENDER_BASE}/api/fiches/{code}")
            details[code] = detail
            print(f"  [{i+1}/{len(enriched_codes)}] {code} OK")
        except Exception as e:
            print(f"  [{i+1}/{len(enriched_codes)}] {code} FAILED: {e}")

    # 4. Also get users
    print("\nExporting users...")
    try:
        # Try to login and get user list - we'll recreate the admin user
        users_data = []
    except:
        users_data = []

    # 5. Build the import data
    export_data = {
        "fiches_list": all_fiches,
        "fiches_detail": details,
        "total": total,
    }

    export_path = "/tmp/agents_metiers_export.json"
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False)

    size_mb = os.path.getsize(export_path) / 1024 / 1024
    print(f"\nExport saved to {export_path} ({size_mb:.1f} MB)")
    print(f"  {len(all_fiches)} fiches (list)")
    print(f"  {len(details)} fiches (full detail)")

    return export_path

import os

if __name__ == "__main__":
    main()
