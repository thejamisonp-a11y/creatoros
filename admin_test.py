#!/usr/bin/env python3

import requests
import sys
import json

def test_admin_login_and_data():
    """Test admin login and verify expected test data"""
    base_url = "https://creatorhub-146.preview.emergentagent.com/api"
    
    print("🔐 Testing admin login and expected data...")
    
    # Test admin login
    login_data = {
        "email": "admin@fleshsesh.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{base_url}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data['access_token']
            user = data['user']
            print(f"✅ Admin login successful")
            print(f"   User: {user['name']} ({user['role']})")
            
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test dashboard stats
            stats_response = requests.get(f"{base_url}/dashboard/stats", headers=headers)
            if stats_response.status_code == 200:
                stats = stats_response.json()
                print(f"✅ Dashboard stats retrieved")
                print(f"   Total Talents: {stats.get('total_talents', 0)}")
                print(f"   Total Personas: {stats.get('total_personas', 0)}")
                print(f"   Revenue MTD: ${stats.get('total_revenue_mtd', 0)}")
                
                # Check if we have the expected data (1 talent, 1 persona, revenue $5700)
                expected_talents = 1
                expected_personas = 1
                expected_revenue = 5700
                
                if stats.get('total_talents', 0) >= expected_talents:
                    print(f"✅ Expected talent count met: {stats.get('total_talents', 0)} >= {expected_talents}")
                else:
                    print(f"⚠️  Expected {expected_talents} talents, found {stats.get('total_talents', 0)}")
                
                if stats.get('total_personas', 0) >= expected_personas:
                    print(f"✅ Expected persona count met: {stats.get('total_personas', 0)} >= {expected_personas}")
                else:
                    print(f"⚠️  Expected {expected_personas} personas, found {stats.get('total_personas', 0)}")
                
                if stats.get('total_revenue_mtd', 0) >= expected_revenue:
                    print(f"✅ Expected revenue met: ${stats.get('total_revenue_mtd', 0)} >= ${expected_revenue}")
                else:
                    print(f"⚠️  Expected ${expected_revenue} revenue, found ${stats.get('total_revenue_mtd', 0)}")
            
            # Test getting talents to find Jessica Martinez
            talents_response = requests.get(f"{base_url}/talents", headers=headers)
            if talents_response.status_code == 200:
                talents = talents_response.json()
                print(f"✅ Retrieved {len(talents)} talents")
                
                # Check for existing talent with ID b057c035-7b72-4207-a24f-beb5f702d15f
                target_talent_id = "b057c035-7b72-4207-a24f-beb5f702d15f"
                target_talent = None
                
                for talent in talents:
                    if talent['id'] == target_talent_id:
                        target_talent = talent
                        break
                
                if target_talent:
                    print(f"✅ Found target talent: {target_talent['display_id']}")
                    
                    # Get talent detail to check for Jessica Martinez
                    detail_response = requests.get(f"{base_url}/talents/{target_talent_id}", headers=headers)
                    if detail_response.status_code == 200:
                        detail = detail_response.json()
                        legal_name = detail.get('legal_name', '')
                        print(f"✅ Talent detail retrieved")
                        print(f"   Legal Name (decrypted): {legal_name}")
                        print(f"   DOB: {detail.get('dob', '')}")
                        print(f"   Verification Status: {detail.get('verification_status', '')}")
                        print(f"   Readiness Score: {detail.get('readiness_score', 0)}%")
                        
                        if 'Jessica Martinez' in legal_name:
                            print(f"✅ Found expected legal name 'Jessica Martinez'")
                        else:
                            print(f"⚠️  Expected 'Jessica Martinez', found '{legal_name}'")
                    else:
                        print(f"❌ Failed to get talent detail: {detail_response.status_code}")
                else:
                    print(f"⚠️  Target talent ID {target_talent_id} not found")
                    if talents:
                        print(f"   Available talent IDs: {[t['id'] for t in talents[:3]]}")
            
            return True
            
        else:
            print(f"❌ Admin login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error during admin login test: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_admin_login_and_data()
    sys.exit(0 if success else 1)