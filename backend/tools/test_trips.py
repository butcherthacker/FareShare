"""
Trip History and Driver Summary Endpoints Test (Sprint 2)
- Simple script to test the trip history and driver summary endpoints.
"""

# backend/tools/test_trips.py
import os
import json
import sys
from uuid import UUID
import requests

API = os.getenv("API_BASE", "http://127.0.0.1:8000")
USER_ID   = os.getenv("TEST_USER_ID",   "")  # any user (driver or passenger)
DRIVER_ID = os.getenv("TEST_DRIVER_ID", "")  # a driver user id

def pretty(x): 
    print(json.dumps(x, indent=2, default=str))

def get(path):
    url = f"{API}{path}"
    print(f"\nGET {url}")
    r = requests.get(url, timeout=20)
    print(f"STATUS {r.status_code}")
    try:
        pretty(r.json())
    except Exception:
        print(r.text)

def main():
    if not USER_ID or not DRIVER_ID:
        print("Set TEST_USER_ID and TEST_DRIVER_ID env vars (UUIDs) or pass them as args.")
        if len(sys.argv) >= 3:
            os.environ["TEST_USER_ID"] = sys.argv[1]
            os.environ["TEST_DRIVER_ID"] = sys.argv[2]
        else:
            print("Usage: python tools/test_trips.py <USER_UUID> <DRIVER_UUID>")
            sys.exit(1)

    # Basic healthcheck
    get("/health")

    # Trip history for the user (as rider or driver)
    uid = os.getenv("TEST_USER_ID") or sys.argv[1]
    get(f"/api/trips/history/{uid}")

    # Driver earnings summary
    did = os.getenv("TEST_DRIVER_ID") or sys.argv[2]
    get(f"/api/trips/summary/{did}")

if __name__ == "__main__":
    main()
