#!/usr/bin/env python3
"""
Test runner script for the Vybe backend.

This script provides a convenient way to run tests with different configurations
and generate reports.
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=False)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print(f"❌ Command not found: {cmd[0]}")
        return False


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="Run tests for Vybe backend")
    parser.add_argument(
        "--type",
        choices=["unit", "integration", "all", "coverage", "performance"],
        default="all",
        help="Type of tests to run"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Run tests in verbose mode"
    )
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run tests in parallel"
    )
    parser.add_argument(
        "--fail-fast",
        action="store_true",
        help="Stop on first failure"
    )
    parser.add_argument(
        "--no-cov",
        action="store_true",
        help="Skip coverage reporting"
    )
    parser.add_argument(
        "--html-report",
        action="store_true",
        help="Generate HTML coverage report"
    )
    parser.add_argument(
        "--benchmark",
        action="store_true",
        help="Run performance benchmarks"
    )
    parser.add_argument(
        "--lint",
        action="store_true",
        help="Run linting checks"
    )
    parser.add_argument(
        "--format",
        action="store_true",
        help="Format code with black and isort"
    )
    parser.add_argument(
        "--check-format",
        action="store_true",
        help="Check code formatting without making changes"
    )
    
    args = parser.parse_args()
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    success = True
    
    # Code formatting
    if args.format:
        success &= run_command(
            ["black", ".", "--line-length", "88"],
            "Code formatting with black"
        )
        success &= run_command(
            ["isort", ".", "--profile", "black"],
            "Import sorting with isort"
        )
    
    if args.check_format:
        success &= run_command(
            ["black", ".", "--check", "--line-length", "88"],
            "Code format check with black"
        )
        success &= run_command(
            ["isort", ".", "--check-only", "--profile", "black"],
            "Import sort check with isort"
        )
    
    # Linting
    if args.lint:
        success &= run_command(
            ["flake8", ".", "--max-line-length", "88"],
            "Linting with flake8"
        )
        success &= run_command(
            ["mypy", "app", "--ignore-missing-imports"],
            "Type checking with mypy"
        )
        success &= run_command(
            ["bandit", "-r", "app", "-f", "json", "-o", "bandit-report.json"],
            "Security scanning with bandit"
        )
    
    # Test commands
    test_cmd = ["pytest"]
    
    if args.verbose:
        test_cmd.append("-v")
    
    if args.fail_fast:
        test_cmd.append("-x")
    
    if args.parallel:
        test_cmd.extend(["-n", "auto"])
    
    if not args.no_cov:
        test_cmd.extend([
            "--cov=app",
            "--cov-report=term-missing",
            "--cov-report=xml"
        ])
        
        if args.html_report:
            test_cmd.append("--cov-report=html:htmlcov")
    
    if args.benchmark:
        test_cmd.extend(["--benchmark-only", "--benchmark-sort=mean"])
    
    # Test type selection
    if args.type == "unit":
        test_cmd.extend(["-m", "unit"])
    elif args.type == "integration":
        test_cmd.extend(["-m", "integration"])
    elif args.type == "coverage":
        test_cmd.extend([
            "--cov=app",
            "--cov-report=html:htmlcov",
            "--cov-report=xml",
            "--cov-report=term-missing",
            "--cov-fail-under=80"
        ])
    elif args.type == "performance":
        test_cmd.extend(["-m", "performance", "--benchmark-only"])
    
    # Run tests
    if args.type in ["unit", "integration", "all", "coverage", "performance"]:
        success &= run_command(test_cmd, f"Running {args.type} tests")
    
    # Generate reports
    if args.html_report and not args.no_cov:
        print(f"\n{'='*60}")
        print("Coverage report generated in htmlcov/index.html")
        print(f"{'='*60}")
    
    if args.benchmark:
        print(f"\n{'='*60}")
        print("Benchmark results saved to .benchmarks/")
        print(f"{'='*60}")
    
    # Summary
    print(f"\n{'='*60}")
    if success:
        print("🎉 All tests and checks completed successfully!")
        sys.exit(0)
    else:
        print("❌ Some tests or checks failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
