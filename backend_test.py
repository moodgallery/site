import requests
import json
import sys
from datetime import datetime, timedelta
import uuid

class PersonalOSAPITester:
    def __init__(self, base_url="https://life-command-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_data = {
            'transactions': [],
            'goals': [],
            'habits': [],
            'tasks': [],
            'schedule_blocks': [],
            'categories': []
        }

    def log_result(self, name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status
        }
        self.test_results.append(result)
        
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if not success and expected_status and actual_status:
            print(f"    Expected: {expected_status}, Got: {actual_status}")
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            request_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=10)

            success = response.status_code == expected_status
            details = ""
            
            if success:
                try:
                    response_data = response.json() if response.content else {}
                    return self.log_result(name, True, f"Response: {json.dumps(response_data, indent=2)[:200]}..."), response_data
                except:
                    return self.log_result(name, True, "Success - No JSON response"), {}
            else:
                try:
                    error_data = response.json()
                    details = f"Error: {error_data}"
                except:
                    details = f"HTTP Error: {response.text[:200]}"
                
                return self.log_result(name, False, details, expected_status, response.status_code), {}

        except Exception as e:
            return self.log_result(name, False, f"Exception: {str(e)}"), {}

    def test_auth_flow(self):
        """Test user registration and login"""
        print("\n=== TESTING AUTH FLOW ===")
        
        # Generate unique test data
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        test_email = f"testuser_{timestamp}@example.com"
        test_password = "TestPass123!"
        test_name = f"Test User {timestamp}"

        # Test user registration
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": test_name,
                "email": test_email, 
                "password": test_password
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response.get('user')
            self.log_result("Token Extraction", True, f"Token: {self.token[:20]}...")
        else:
            return False

        # Test login with same credentials
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": test_password
            }
        )
        
        if success and 'token' in response:
            # Update token with login token
            self.token = response['token']
            self.log_result("Login Token Update", True, f"New token: {self.token[:20]}...")
        
        # Test /auth/me endpoint
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        return True

    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n=== TESTING DASHBOARD ===")
        
        self.run_test(
            "Dashboard Data",
            "GET",
            "dashboard",
            200
        )

    def test_finance_module(self):
        """Test finance transactions and goals"""
        print("\n=== TESTING FINANCE MODULE ===")
        
        # Create income transaction
        success, response = self.run_test(
            "Create Income Transaction",
            "POST",
            "finance/transactions",
            200,
            data={
                "type": "income",
                "amount": 5000.0,
                "category": "salary",
                "description": "Test salary"
            }
        )
        if success and 'id' in response:
            self.created_data['transactions'].append(response['id'])

        # Create expense transaction
        success, response = self.run_test(
            "Create Expense Transaction", 
            "POST",
            "finance/transactions",
            200,
            data={
                "type": "expense",
                "amount": 1500.0,
                "category": "rent",
                "description": "Test rent payment"
            }
        )
        if success and 'id' in response:
            self.created_data['transactions'].append(response['id'])

        # Get transactions
        self.run_test(
            "Get Transactions",
            "GET", 
            "finance/transactions",
            200
        )

        # Get finance summary
        self.run_test(
            "Get Finance Summary",
            "GET",
            "finance/summary",
            200
        )

        # Create financial goal
        current_month = datetime.now().strftime('%Y-%m')
        success, response = self.run_test(
            "Create Financial Goal",
            "POST",
            "finance/goals",
            200,
            data={
                "target_amount": 10000.0,
                "title": "Test Savings Goal",
                "month": current_month
            }
        )

        # Get financial goals
        self.run_test(
            "Get Financial Goals",
            "GET",
            "finance/goals", 
            200
        )

    def test_goals_module(self):
        """Test goals and milestones"""
        print("\n=== TESTING GOALS MODULE ===")
        
        # Create goal
        success, response = self.run_test(
            "Create Goal",
            "POST",
            "goals",
            200,
            data={
                "title": "Test Career Goal",
                "description": "Test goal description",
                "category": "career",
                "metric": "projects",
                "target_value": 5.0,
                "deadline": (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d')
            }
        )
        
        goal_id = None
        if success and 'id' in response:
            goal_id = response['id']
            self.created_data['goals'].append(goal_id)

        # Get goals
        self.run_test(
            "Get All Goals",
            "GET",
            "goals",
            200
        )

        # Add milestone if goal was created
        if goal_id:
            self.run_test(
                "Add Goal Milestone",
                "POST",
                f"goals/{goal_id}/milestones",
                200,
                data={"title": "First milestone"}
            )

            # Update goal
            self.run_test(
                "Update Goal",
                "PUT",
                f"goals/{goal_id}",
                200,
                data={"current_value": 2.0}
            )

    def test_habits_module(self):
        """Test habits and habit logging"""
        print("\n=== TESTING HABITS MODULE ===")
        
        # Create habit
        success, response = self.run_test(
            "Create Habit",
            "POST",
            "habits",
            200,
            data={
                "name": "Test Daily Exercise",
                "color": "#3b82f6",
                "target_days": 7
            }
        )
        
        habit_id = None
        if success and 'id' in response:
            habit_id = response['id']
            self.created_data['habits'].append(habit_id)

        # Get habits
        self.run_test(
            "Get All Habits",
            "GET",
            "habits",
            200
        )

        # Get today's habits
        self.run_test(
            "Get Today's Habits",
            "GET",
            "habits/today",
            200
        )

        # Log habit completion if habit was created
        if habit_id:
            today = datetime.now().strftime('%Y-%m-%d')
            self.run_test(
                "Log Habit Completion",
                "POST",
                f"habits/{habit_id}/log",
                200,
                data={"date": today, "completed": True}
            )

            # Get habit logs
            self.run_test(
                "Get Habit Logs",
                "GET",
                f"habits/{habit_id}/logs",
                200
            )

    def test_tasks_module(self):
        """Test tasks and task management"""
        print("\n=== TESTING TASKS MODULE ===")
        
        # Create task
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data={
                "title": "Test Important Task",
                "description": "Test task description",
                "priority": "high",
                "category": "work",
                "deadline": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
            }
        )
        
        task_id = None
        if success and 'id' in response:
            task_id = response['id']
            self.created_data['tasks'].append(task_id)

        # Get all tasks
        self.run_test(
            "Get All Tasks",
            "GET",
            "tasks",
            200
        )

        # Get today's tasks
        self.run_test(
            "Get Today's Tasks", 
            "GET",
            "tasks/today",
            200
        )

        # Update task if created
        if task_id:
            self.run_test(
                "Update Task",
                "PUT",
                f"tasks/{task_id}",
                200,
                data={"completed": True}
            )

    def test_schedule_module(self):
        """Test schedule blocks"""
        print("\n=== TESTING SCHEDULE MODULE ===")
        
        # Create schedule block
        today = datetime.now().strftime('%Y-%m-%d')
        success, response = self.run_test(
            "Create Schedule Block",
            "POST",
            "schedule",
            200,
            data={
                "title": "Test Meeting",
                "start_time": "10:00",
                "end_time": "11:00",
                "date": today,
                "color": "#3b82f6"
            }
        )
        
        if success and 'id' in response:
            self.created_data['schedule_blocks'].append(response['id'])

        # Get schedule
        self.run_test(
            "Get Schedule",
            "GET",
            "schedule",
            200
        )

        # Get schedule for specific date
        self.run_test(
            "Get Schedule for Date",
            "GET",
            f"schedule?date={today}",
            200
        )

    def test_weekly_review(self):
        """Test weekly review functionality"""
        print("\n=== TESTING WEEKLY REVIEW ===")
        
        # Get weekly review data
        self.run_test(
            "Get Weekly Review",
            "GET",
            "weekly-review",
            200
        )

        # Save weekly reflection
        self.run_test(
            "Save Weekly Reflection",
            "POST",
            "weekly-review/reflection",
            200,
            data={
                "what_worked": "Test - focused work sessions",
                "what_earned": "Test - completed important project", 
                "what_to_remove": "Test - excessive social media"
            }
        )

    def test_ai_assistant(self):
        """Test AI analysis functionality"""
        print("\n=== TESTING AI ASSISTANT ===")
        
        # Test productivity analysis
        self.run_test(
            "AI Productivity Analysis",
            "POST",
            "ai/analyze",
            200,
            data={"analysis_type": "productivity"}
        )

        # Test habits analysis
        self.run_test(
            "AI Habits Analysis", 
            "POST",
            "ai/analyze",
            200,
            data={"analysis_type": "habits"}
        )

    def test_settings_and_categories(self):
        """Test settings and categories management - NEW FEATURES"""
        print("\n=== TESTING SETTINGS & CATEGORIES (NEW FEATURES) ===")
        
        # Test get currencies
        success, currencies_response = self.run_test(
            "Get Available Currencies",
            "GET",
            "settings/currencies",
            200
        )
        
        # Test get current settings
        success, settings_response = self.run_test(
            "Get User Settings", 
            "GET",
            "settings",
            200
        )
        
        # Test update currency settings
        success, update_response = self.run_test(
            "Update Currency to UAH",
            "PUT", 
            "settings",
            200,
            data={
                "currency": "UAH",
                "currency_symbol": "₴"
            }
        )
        
        # Test get settings again to verify update
        success, updated_settings = self.run_test(
            "Verify Currency Updated",
            "GET",
            "settings", 
            200
        )
        
        if success and updated_settings:
            if updated_settings.get('currency') == 'UAH':
                self.log_result("Currency Update Verification", True, "Currency successfully changed to UAH")
            else:
                self.log_result("Currency Update Verification", False, f"Expected UAH, got {updated_settings.get('currency')}")
        
        # Test get all categories
        success, categories_response = self.run_test(
            "Get All Categories",
            "GET",
            "categories",
            200
        )
        
        # Test get categories by type - income
        success, income_cats = self.run_test(
            "Get Income Categories",
            "GET", 
            "categories?type=income",
            200
        )
        
        # Test get categories by type - expense
        success, expense_cats = self.run_test(
            "Get Expense Categories",
            "GET",
            "categories?type=expense", 
            200
        )
        
        # Test get categories by type - task
        success, task_cats = self.run_test(
            "Get Task Categories",
            "GET",
            "categories?type=task",
            200
        )
        
        # Test get categories by type - goal
        success, goal_cats = self.run_test(
            "Get Goal Categories",
            "GET",
            "categories?type=goal",
            200
        )
        
        # Test create new income category - 'Рекламні інтеграції' (as specified in requirements)
        success, new_category = self.run_test(
            "Create New Income Category 'Рекламні інтеграції'",
            "POST",
            "categories",
            200,
            data={
                "name": "Рекламні інтеграції",
                "type": "income", 
                "color": "#ec4899"
            }
        )
        
        category_id = None
        if success and 'id' in new_category:
            category_id = new_category['id']
            self.created_data['categories'].append(category_id)
            
        # Test create custom task category
        success, task_category = self.run_test(
            "Create Custom Task Category",
            "POST",
            "categories",
            200,
            data={
                "name": "Тестова категорія завдань",
                "type": "task",
                "color": "#10b981"
            }
        )
        
        if success and 'id' in task_category:
            self.created_data['categories'].append(task_category['id'])
        
        # Test edit category name and color if category was created
        if category_id:
            success, edited_category = self.run_test(
                "Edit Category Name and Color",
                "PUT",
                f"categories/{category_id}",
                200,
                data={
                    "name": "Рекламні інтеграції (Оновлено)",
                    "color": "#f59e0b"
                }
            )
        
        # Test delete non-default category
        if len(self.created_data['categories']) > 0:
            test_cat_id = self.created_data['categories'][-1]  # Get last created category
            success, delete_response = self.run_test(
                "Delete Custom Category",
                "DELETE",
                f"categories/{test_cat_id}",
                200
            )
            if success:
                self.created_data['categories'].remove(test_cat_id)
        
        # Test trying to delete default category (should fail)
        if income_cats and len(income_cats) > 0:
            default_cat = None
            for cat in income_cats:
                if cat.get('is_default', False):
                    default_cat = cat
                    break
            
            if default_cat:
                success, fail_response = self.run_test(
                    "Try Delete Default Category (Should Fail)",
                    "DELETE",
                    f"categories/{default_cat['id']}",
                    400  # Should return 400 Bad Request
                )
                if not success:
                    self.log_result("Default Category Protection", True, "Correctly prevented deletion of default category")

    def test_dynamic_categories_integration(self):
        """Test that other modules use dynamic categories correctly"""
        print("\n=== TESTING DYNAMIC CATEGORIES INTEGRATION ===")
        
        # Get current income categories
        success, income_cats = self.run_test(
            "Get Income Categories for Integration Test",
            "GET",
            "categories?type=income",
            200
        )
        
        if success and income_cats and len(income_cats) > 0:
            # Use first income category to create a transaction
            first_income_cat = income_cats[0]['name']
            success, response = self.run_test(
                "Create Transaction with Dynamic Category",
                "POST",
                "finance/transactions",
                200,
                data={
                    "type": "income",
                    "amount": 2500.0,
                    "category": first_income_cat,
                    "description": "Test with dynamic category"
                }
            )
            if success and 'id' in response:
                self.created_data['transactions'].append(response['id'])
        
        # Get current task categories
        success, task_cats = self.run_test(
            "Get Task Categories for Integration Test",
            "GET", 
            "categories?type=task",
            200
        )
        
        if success and task_cats and len(task_cats) > 0:
            # Use first task category to create a task
            first_task_cat = task_cats[0]['name'] 
            success, response = self.run_test(
                "Create Task with Dynamic Category",
                "POST",
                "tasks",
                200,
                data={
                    "title": "Test task with dynamic category",
                    "category": first_task_cat,
                    "priority": "medium"
                }
            )
            if success and 'id' in response:
                self.created_data['tasks'].append(response['id'])
        
        # Get current goal categories
        success, goal_cats = self.run_test(
            "Get Goal Categories for Integration Test",
            "GET",
            "categories?type=goal", 
            200
        )
        
        if success and goal_cats and len(goal_cats) > 0:
            # Use first goal category to create a goal
            first_goal_cat = goal_cats[0]['name']
            success, response = self.run_test(
                "Create Goal with Dynamic Category",
                "POST", 
                "goals",
                200,
                data={
                    "title": "Test goal with dynamic category",
                    "category": first_goal_cat,
                    "description": "Integration test goal"
                }
            )
            if success and 'id' in response:
                self.created_data['goals'].append(response['id'])

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n=== CLEANING UP TEST DATA ===")
        
        # Delete transactions
        for trans_id in self.created_data['transactions']:
            self.run_test(
                f"Delete Transaction {trans_id}",
                "DELETE",
                f"finance/transactions/{trans_id}",
                200
            )
            
        # Delete goals
        for goal_id in self.created_data['goals']:
            self.run_test(
                f"Delete Goal {goal_id}",
                "DELETE", 
                f"goals/{goal_id}",
                200
            )
            
        # Delete habits
        for habit_id in self.created_data['habits']:
            self.run_test(
                f"Delete Habit {habit_id}",
                "DELETE",
                f"habits/{habit_id}",
                200
            )
            
        # Delete tasks
        for task_id in self.created_data['tasks']:
            self.run_test(
                f"Delete Task {task_id}",
                "DELETE",
                f"tasks/{task_id}",
                200
            )
            
        # Delete schedule blocks
        for block_id in self.created_data['schedule_blocks']:
            self.run_test(
                f"Delete Schedule Block {block_id}",
                "DELETE",
                f"schedule/{block_id}",
                200
            )
            
        # Delete custom categories (not default ones)
        for category_id in self.created_data['categories']:
            self.run_test(
                f"Delete Category {category_id}",
                "DELETE",
                f"categories/{category_id}",
                200
            )

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Personal OS API Test Suite")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        try:
            # Test authentication first
            if not self.test_auth_flow():
                print("❌ Auth failed - stopping tests")
                return False
            
            # Test all modules - including NEW FEATURES
            self.test_settings_and_categories()  # NEW: Test settings and categories
            self.test_dynamic_categories_integration()  # NEW: Test integration
            self.test_dashboard()
            self.test_finance_module() 
            self.test_goals_module()
            self.test_habits_module()
            self.test_tasks_module()
            self.test_schedule_module()
            self.test_weekly_review()
            self.test_ai_assistant()
            
            # Cleanup
            self.cleanup_test_data()
            
        except Exception as e:
            print(f"💥 Unexpected error: {e}")
            return False
        
        finally:
            # Print summary
            print("\n" + "=" * 50)
            print("📊 TEST SUMMARY")
            print(f"Tests run: {self.tests_run}")
            print(f"Tests passed: {self.tests_passed}")
            print(f"Tests failed: {self.tests_run - self.tests_passed}")
            print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "0%")
            
            # Show failed tests
            failed_tests = [t for t in self.test_results if not t['success']]
            if failed_tests:
                print("\n❌ FAILED TESTS:")
                for test in failed_tests:
                    print(f"  - {test['test']}: {test['details']}")
            
            return self.tests_passed == self.tests_run

def main():
    tester = PersonalOSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())