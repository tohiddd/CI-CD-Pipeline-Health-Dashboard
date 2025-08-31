#!/usr/bin/env python3
"""
Tests for Hello World application
"""

import unittest
import json
import os
from app import get_hello_message, main

class TestHelloWorld(unittest.TestCase):
    
    def test_hello_message_structure(self):
        """Test that hello message has correct structure"""
        message = get_hello_message()
        
        # Check required fields
        self.assertIn("message", message)
        self.assertIn("timestamp", message)  
        self.assertIn("version", message)
        self.assertIn("environment", message)
        self.assertIn("build_id", message)
        
    def test_hello_message_content(self):
        """Test hello message content"""
        message = get_hello_message()
        
        self.assertIn("Hello World", message["message"])
        self.assertEqual(message["version"], "1.0.0")
        
    def test_main_function(self):
        """Test main function execution"""
        result = main()
        
        # Should return message dictionary
        self.assertIsInstance(result, dict)
        self.assertIn("message", result)
        
        # Should create output file
        self.assertTrue(os.path.exists("output.json"))
        
        # Clean up
        if os.path.exists("output.json"):
            os.remove("output.json")
    
    def test_json_output(self):
        """Test JSON output is valid"""
        main()
        
        # Check output file exists and is valid JSON
        with open("output.json", "r") as f:
            data = json.load(f)
            
        self.assertIn("message", data)
        self.assertIn("version", data)
        
        # Clean up
        os.remove("output.json")

if __name__ == "__main__":
    unittest.main()
