#!/usr/bin/env python3
"""
TalentOS Backend API Testing Suite
Tests all core functionality including auth, talents, personas, onboarding, consents, revenue, incidents, and tasks.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class TalentOSAPITester:
    def __init__(self, base_url: str = "https://creatorhub-146.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.talent_id = None
        self.persona_id = None
        self.consent_id = None
        self.incident_id = None
        self.task_id = None
        self.revenue_id = None

    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
            
            return response.status_code, response_data
            
        except Exception as e:
            return 0, {"error": str(e)}

    # ==================== AUTH TESTS ====================
    
    def test_user_registration(self):
        """Test user registration with role selection"""
        test_email = f"test_owner_{datetime.now().strftime('%H%M%S')}@talentos.com"
        data = {
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test Owner",
            "role": "owner"
        }
        
        status, response = self.make_request('POST', 'auth/register', data)
        
        if status == 200 and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_result("User Registration", True, f"Registered as {response['user']['role']}")
            return True
        else:
            self.log_result("User Registration", False, f"Status: {status}, Response: {response}")
            return False

    def test_user_login(self):
        """Test user login flow"""
        # Create a test user first
        test_email = f"test_login_{datetime.now().strftime('%H%M%S')}@talentos.com"
        register_data = {
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test Login User",
            "role": "ops_director"
        }
        
        # Register user
        status, response = self.make_request('POST', 'auth/register', register_data)
        if status != 200:
            self.log_result("User Login Setup", False, f"Failed to create test user: {response}")
            return False
        
        # Now test login
        login_data = {
            "email": test_email,
            "password": "TestPass123!"
        }
        
        status, response = self.make_request('POST', 'auth/login', login_data)
        
        if status == 200 and 'access_token' in response:
            # Update token for subsequent tests
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_result("User Login", True, f"Logged in as {response['user']['role']}")
            return True
        else:
            self.log_result("User Login", False, f"Status: {status}, Response: {response}")
            return False

    def test_jwt_validation(self):
        """Test JWT token validation"""
        if not self.token:
            self.log_result("JWT Validation", False, "No token available")
            return False
        
        status, response = self.make_request('GET', 'auth/me')
        
        if status == 200 and 'id' in response:
            self.log_result("JWT Validation", True, f"Token valid for user: {response['name']}")
            return True
        else:
            self.log_result("JWT Validation", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== DASHBOARD TESTS ====================
    
    def test_dashboard_stats(self):
        """Test dashboard statistics display"""
        status, response = self.make_request('GET', 'dashboard/stats')
        
        expected_fields = ['total_talents', 'total_personas', 'active_incidents', 'pending_tasks', 
                          'total_revenue_mtd', 'onboarding_in_progress', 'high_risk_personas']
        
        if status == 200 and all(field in response for field in expected_fields):
            self.log_result("Dashboard Stats", True, f"All stats present: {response}")
            return True
        else:
            self.log_result("Dashboard Stats", False, f"Status: {status}, Missing fields or error: {response}")
            return False

    def test_dashboard_alerts(self):
        """Test dashboard alerts"""
        status, response = self.make_request('GET', 'dashboard/alerts')
        
        if status == 200 and isinstance(response, list):
            self.log_result("Dashboard Alerts", True, f"Alerts retrieved: {len(response)} alerts")
            return True
        else:
            self.log_result("Dashboard Alerts", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== TALENT TESTS ====================
    
    def test_talent_creation(self):
        """Test talent creation with encrypted fields"""
        data = {
            "legal_name": "Jane Doe",
            "dob": "1995-06-15",
            "emergency_contact": "John Doe: +1-555-0123",
            "verification_status": "pending",
            "notes": "Test talent for API testing"
        }
        
        status, response = self.make_request('POST', 'talents', data)
        
        if status == 200 and 'id' in response:
            self.talent_id = response['id']
            self.log_result("Talent Creation", True, f"Created talent: {response['display_id']}")
            return True
        else:
            self.log_result("Talent Creation", False, f"Status: {status}, Response: {response}")
            return False

    def test_talent_list(self):
        """Test talent listing"""
        status, response = self.make_request('GET', 'talents')
        
        if status == 200 and isinstance(response, list):
            self.log_result("Talent List", True, f"Retrieved {len(response)} talents")
            return True
        else:
            self.log_result("Talent List", False, f"Status: {status}, Response: {response}")
            return False

    def test_talent_detail_with_decryption(self):
        """Test viewing talent with decrypted data"""
        if not self.talent_id:
            self.log_result("Talent Detail", False, "No talent ID available")
            return False
        
        status, response = self.make_request('GET', f'talents/{self.talent_id}')
        
        if status == 200 and 'legal_name' in response and response['legal_name'] == "Jane Doe":
            self.log_result("Talent Detail with Decryption", True, f"Decrypted data: {response['legal_name']}")
            return True
        else:
            self.log_result("Talent Detail with Decryption", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== PERSONA TESTS ====================
    
    def test_persona_creation(self):
        """Test persona creation linked to talent"""
        if not self.talent_id:
            self.log_result("Persona Creation", False, "No talent ID available")
            return False
        
        data = {
            "talent_id": self.talent_id,
            "persona_name": "Bella Rose",
            "branding_tone": "Playful and Flirty",
            "niche_tags": ["lifestyle", "fitness", "glamour"],
            "allowed_platforms": ["OnlyFans", "Fansly"],
            "prohibited_acts": ["extreme content", "meetups"],
            "pricing_tier": "premium",
            "risk_rating": 25
        }
        
        status, response = self.make_request('POST', 'personas', data)
        
        if status == 200 and 'id' in response:
            self.persona_id = response['id']
            self.log_result("Persona Creation", True, f"Created persona: {response['persona_name']}")
            return True
        else:
            self.log_result("Persona Creation", False, f"Status: {status}, Response: {response}")
            return False

    def test_persona_list(self):
        """Test persona listing"""
        status, response = self.make_request('GET', 'personas')
        
        if status == 200 and isinstance(response, list):
            self.log_result("Persona List", True, f"Retrieved {len(response)} personas")
            return True
        else:
            self.log_result("Persona List", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== ONBOARDING TESTS ====================
    
    def test_onboarding_workflow(self):
        """Test onboarding step completion workflow"""
        if not self.talent_id:
            self.log_result("Onboarding Workflow", False, "No talent ID available")
            return False
        
        # Get onboarding record
        status, response = self.make_request('GET', f'onboarding/{self.talent_id}')
        
        if status != 200:
            self.log_result("Onboarding Workflow", False, f"Failed to get onboarding: {response}")
            return False
        
        # Complete first step
        first_step = response['steps'][0]['step_id']
        status, complete_response = self.make_request('PUT', f'onboarding/{self.talent_id}/step/{first_step}')
        
        if status == 200:
            self.log_result("Onboarding Workflow", True, f"Completed step: {first_step}")
            return True
        else:
            self.log_result("Onboarding Workflow", False, f"Failed to complete step: {complete_response}")
            return False

    # ==================== CONSENT TESTS ====================
    
    def test_consent_creation(self):
        """Test consent record creation"""
        if not self.persona_id:
            self.log_result("Consent Creation", False, "No persona ID available")
            return False
        
        data = {
            "persona_id": self.persona_id,
            "act_type": "Solo content creation",
            "partner_ids": [],
            "distribution_scope": "platform_only",
            "revocation_rules": "Can be revoked with 24h notice",
            "expiry_date": (datetime.now() + timedelta(days=365)).isoformat()
        }
        
        status, response = self.make_request('POST', 'consents', data)
        
        if status == 200 and 'id' in response:
            self.consent_id = response['id']
            self.log_result("Consent Creation", True, f"Created consent: {response['act_type']}")
            return True
        else:
            self.log_result("Consent Creation", False, f"Status: {status}, Response: {response}")
            return False

    def test_consent_revocation(self):
        """Test consent revocation"""
        if not self.consent_id:
            self.log_result("Consent Revocation", False, "No consent ID available")
            return False
        
        status, response = self.make_request('PUT', f'consents/{self.consent_id}/revoke')
        
        if status == 200:
            self.log_result("Consent Revocation", True, "Consent revoked successfully")
            return True
        else:
            self.log_result("Consent Revocation", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== REVENUE TESTS ====================
    
    def test_revenue_recording(self):
        """Test revenue entry recording"""
        if not self.persona_id:
            self.log_result("Revenue Recording", False, "No persona ID available")
            return False
        
        data = {
            "persona_id": self.persona_id,
            "platform": "OnlyFans",
            "amount": 1250.50,
            "currency": "USD",
            "revenue_type": "subscription",
            "notes": "Monthly subscription revenue"
        }
        
        status, response = self.make_request('POST', 'revenue', data)
        
        if status == 200 and 'id' in response:
            self.revenue_id = response['id']
            self.log_result("Revenue Recording", True, f"Recorded ${response['amount']} revenue")
            return True
        else:
            self.log_result("Revenue Recording", False, f"Status: {status}, Response: {response}")
            return False

    def test_revenue_summary(self):
        """Test revenue summary"""
        status, response = self.make_request('GET', 'revenue/summary')
        
        if status == 200 and 'total_mtd' in response:
            self.log_result("Revenue Summary", True, f"MTD Revenue: ${response['total_mtd']}")
            return True
        else:
            self.log_result("Revenue Summary", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== INCIDENT TESTS ====================
    
    def test_incident_reporting(self):
        """Test incident reporting"""
        data = {
            "persona_id": self.persona_id,
            "talent_id": self.talent_id,
            "incident_type": "client_misconduct",
            "severity": "medium",
            "description": "Client requested content outside agreed boundaries"
        }
        
        status, response = self.make_request('POST', 'incidents', data)
        
        if status == 200 and 'id' in response:
            self.incident_id = response['id']
            self.log_result("Incident Reporting", True, f"Reported {response['incident_type']} incident")
            return True
        else:
            self.log_result("Incident Reporting", False, f"Status: {status}, Response: {response}")
            return False

    def test_incident_resolution(self):
        """Test incident resolution"""
        if not self.incident_id:
            self.log_result("Incident Resolution", False, "No incident ID available")
            return False
        
        params = {"resolution_notes": "Issue resolved through client communication"}
        status, response = self.make_request('PUT', f'incidents/{self.incident_id}/resolve', params=params)
        
        if status == 200:
            self.log_result("Incident Resolution", True, "Incident resolved successfully")
            return True
        else:
            self.log_result("Incident Resolution", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== TASK TESTS ====================
    
    def test_task_creation(self):
        """Test task creation"""
        data = {
            "title": "Review platform appeal",
            "description": "Appeal content removal decision on OnlyFans",
            "persona_id": self.persona_id,
            "task_type": "platform_appeal",
            "priority": "high",
            "deadline": (datetime.now() + timedelta(days=3)).isoformat()
        }
        
        status, response = self.make_request('POST', 'tasks', data)
        
        if status == 200 and 'id' in response:
            self.task_id = response['id']
            self.log_result("Task Creation", True, f"Created task: {response['title']}")
            return True
        else:
            self.log_result("Task Creation", False, f"Status: {status}, Response: {response}")
            return False

    def test_task_status_update(self):
        """Test task status updates"""
        if not self.task_id:
            self.log_result("Task Status Update", False, "No task ID available")
            return False
        
        params = {"status": "in_progress"}
        status, response = self.make_request('PUT', f'tasks/{self.task_id}/status', params=params)
        
        if status == 200:
            self.log_result("Task Status Update", True, "Task status updated to in_progress")
            return True
        else:
            self.log_result("Task Status Update", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== MAIN TEST RUNNER ====================
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting TalentOS Backend API Tests")
        print("=" * 50)
        
        # Auth tests
        print("\n📝 Authentication Tests")
        self.test_user_registration()
        self.test_user_login()
        self.test_jwt_validation()
        
        # Dashboard tests
        print("\n📊 Dashboard Tests")
        self.test_dashboard_stats()
        self.test_dashboard_alerts()
        
        # Core functionality tests
        print("\n👥 Talent Management Tests")
        self.test_talent_creation()
        self.test_talent_list()
        self.test_talent_detail_with_decryption()
        
        print("\n🎭 Persona Tests")
        self.test_persona_creation()
        self.test_persona_list()
        
        print("\n✅ Onboarding Tests")
        self.test_onboarding_workflow()
        
        print("\n📋 Consent Tests")
        self.test_consent_creation()
        self.test_consent_revocation()
        
        print("\n💰 Revenue Tests")
        self.test_revenue_recording()
        self.test_revenue_summary()
        
        print("\n🚨 Incident Tests")
        self.test_incident_reporting()
        self.test_incident_resolution()
        
        print("\n📝 Task Tests")
        self.test_task_creation()
        self.test_task_status_update()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main function"""
    tester = TalentOSAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())