from fastapi import APIRouter, Query
import requests

router = APIRouter(prefix="/location", tags=["Location"])

@router.get("/search")
def search_location(q: str = Query(..., min_length=3)):
    """
    Returns location suggestions similar to Google Maps
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": q,
        "format": "json",
        "addressdetails": 1,
        "limit": 5
    }
    headers = {
        "User-Agent": "BinGo-A-Waste-Management-App"
    }

    response = requests.get(url, params=params, headers=headers)
    data = response.json()

    results = []
    for place in data:
        results.append({
            "name": place.get("display_name"),
            "latitude": place.get("lat"),
            "longitude": place.get("lon")
        })

    return results
