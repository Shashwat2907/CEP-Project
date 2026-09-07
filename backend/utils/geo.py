import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in meters between two points 
    on the Earth specified by latitude/longitude.
    """
    R = 6371000.0  # Radius of Earth in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance_meters = R * c
    
    return round(distance_meters, 2)


# Default College Campus reference location (e.g., Engineering Block)
CAMPUS_PRESETS = [
    {
        "id": "academic_block",
        "name": "Academic Block A (Room 204)",
        "latitude": 28.5450,
        "longitude": 77.1926,
        "description": "Main classroom block, Ground & 1st Floor"
    },
    {
        "id": "cs_lab",
        "name": "CS & AI Computing Labs (Lab 3)",
        "latitude": 28.5452,
        "longitude": 77.1930,
        "description": "2nd Floor North Wing Computer Labs"
    },
    {
        "id": "library",
        "name": "Central Campus Library",
        "latitude": 28.5445,
        "longitude": 77.1918,
        "description": "Study halls and reading wings"
    }
]

STUDENT_LOCATION_PRESETS = [
    {
        "id": "inside_lab",
        "label": "Inside Campus: CS Lab 3 (Approx. 25m)",
        "latitude": 28.5451,
        "longitude": 77.1928,
        "hint": "Within 100m geofence"
    },
    {
        "id": "inside_gate",
        "label": "Inside Campus: College Quad (Approx. 65m)",
        "latitude": 28.5447,
        "longitude": 77.1922,
        "hint": "Within 100m geofence"
    },
    {
        "id": "outside_hostel",
        "label": "Border Zone: Student Canteen (Approx. 130m)",
        "latitude": 28.5460,
        "longitude": 77.1935,
        "hint": "May exceed tighter geofences"
    },
    {
        "id": "outside_city",
        "label": "Outside College: Cafe / Hostel (Approx. 850m)",
        "latitude": 28.5520,
        "longitude": 77.1980,
        "hint": "Strictly outside geofence"
    }
]
