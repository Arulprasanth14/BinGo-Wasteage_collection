"""
Simple script to test if the FastAPI server is running and accessible
Run this to verify your backend is working before testing from mobile
"""
import requests
import sys

API_URL = "http://localhost:8000"

def test_server():
    print("🧪 Testing BinGo Backend Server...")
    print(f"📍 Testing URL: {API_URL}\n")
    
    try:
        # Test root endpoint
        print("1️⃣ Testing root endpoint (/)...")
        response = requests.get(f"{API_URL}/", timeout=5)
        print(f"   ✅ Status: {response.status_code}")
        print(f"   📄 Response: {response.json()}\n")
        
        # Test login endpoint (should fail with 422 - validation error, but means endpoint exists)
        print("2️⃣ Testing login endpoint (/login)...")
        try:
            response = requests.post(
                f"{API_URL}/login",
                json={},  # Empty body to trigger validation error
                timeout=5
            )
            print(f"   ✅ Endpoint exists (status: {response.status_code})")
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Error: {e}")
        
        print("\n✅ Backend server is running and accessible!")
        print("\n📱 To test from your phone:")
        print(f"   - Make sure your phone is on the same WiFi network")
        print(f"   - Replace 'localhost' with your computer's IP address")
        print(f"   - Example: http://YOUR_IP:8000/login")
        print(f"   - Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)")
        
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to backend server!")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure the server is running:")
        print("      cd backend")
        print("      uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
        print("\n   2. Check if port 8000 is in use")
        print("   3. Check Windows Firewall settings")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_server()
