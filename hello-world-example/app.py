#!/usr/bin/env python3
"""
Simple Hello World application for CI/CD testing
"""

import datetime
import json
import os

def get_hello_message():
    """Return a friendly hello message"""
    return {
        "message": "Hello World from CI/CD Pipeline! 🚀",
        "timestamp": datetime.datetime.now().isoformat(),
        "version": "1.0.0",
        "environment": os.getenv("ENV", "development"),
        "build_id": os.getenv("GITHUB_RUN_ID", "local")
    }

def main():
    """Main application entry point"""
    hello = get_hello_message()
    
    print("=" * 50)
    print("🚀 HELLO WORLD CI/CD APPLICATION")
    print("=" * 50)
    print(f"Message: {hello['message']}")
    print(f"Version: {hello['version']}")
    print(f"Environment: {hello['environment']}")
    print(f"Build ID: {hello['build_id']}")
    print(f"Timestamp: {hello['timestamp']}")
    print("=" * 50)
    
    # Save output for testing
    with open("output.json", "w") as f:
        json.dump(hello, f, indent=2)
    
    return hello

if __name__ == "__main__":
    result = main()
    print("✅ Application completed successfully!")
