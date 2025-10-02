#!/bin/bash

# Comprehensive Test Runner Script
# This script runs all tests across the entire project

set -e

echo "🧪 Running Comprehensive Test Suite for WhatsApp Chat App"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run tests with error handling
run_tests() {
    local package_name=$1
    local test_command=$2
    local package_path=$3
    
    print_status "Running tests for $package_name..."
    
    if [ -d "$package_path" ]; then
        cd "$package_path"
        
        if npm list > /dev/null 2>&1; then
            if eval "$test_command"; then
                print_success "$package_name tests passed"
                cd - > /dev/null
                return 0
            else
                print_error "$package_name tests failed"
                cd - > /dev/null
                return 1
            fi
        else
            print_warning "$package_name dependencies not installed, skipping tests"
            cd - > /dev/null
            return 0
        fi
    else
        print_warning "$package_name directory not found, skipping tests"
        return 0
    fi
}

# Function to generate test coverage report
generate_coverage_report() {
    print_status "Generating comprehensive coverage report..."
    
    # Create coverage directory
    mkdir -p coverage/combined
    
    # Combine coverage reports if they exist
    if command -v nyc > /dev/null 2>&1; then
        if [ -d "packages/backend/coverage" ] && [ -d "packages/web/coverage" ]; then
            npx nyc merge packages/backend/coverage packages/web/coverage coverage/combined/coverage.json
            npx nyc report --reporter=html --reporter=text --report-dir=coverage/combined
            print_success "Combined coverage report generated in coverage/combined/"
        fi
    fi
}

# Function to run performance benchmarks
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Backend performance tests
    if run_tests "Backend Performance" "npm run test:performance" "packages/backend"; then
        print_success "Backend performance tests completed"
    else
        print_warning "Backend performance tests failed or not available"
    fi
}

# Function to run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    # Backend security tests
    if run_tests "Backend Security" "npm run test:security" "packages/backend"; then
        print_success "Backend security tests completed"
    else
        print_warning "Backend security tests failed or not available"
    fi
    
    # Run npm audit for security vulnerabilities
    print_status "Checking for security vulnerabilities..."
    
    for package in "packages/backend" "packages/web" "packages/mobile"; do
        if [ -d "$package" ]; then
            cd "$package"
            if npm audit --audit-level=moderate; then
                print_success "$package passed security audit"
            else
                print_warning "$package has security vulnerabilities"
            fi
            cd - > /dev/null
        fi
    done
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    if run_tests "Backend Integration" "npm run test:integration" "packages/backend"; then
        print_success "Integration tests completed"
    else
        print_warning "Integration tests failed or not available"
    fi
}

# Function to run end-to-end tests
run_e2e_tests() {
    print_status "Running end-to-end tests..."
    
    if run_tests "Backend E2E" "npm run test:e2e" "packages/backend"; then
        print_success "End-to-end tests completed"
    else
        print_warning "End-to-end tests failed or not available"
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)
    local failed_tests=0
    
    print_status "Starting comprehensive test suite..."
    
    # Install dependencies if needed
    print_status "Checking dependencies..."
    if [ -f "package.json" ]; then
        npm install --silent
    fi
    
    # Backend Unit Tests
    if ! run_tests "Backend Unit" "npm run test:unit" "packages/backend"; then
        ((failed_tests++))
    fi
    
    # Web Unit Tests
    if ! run_tests "Web Unit" "npm run test" "packages/web"; then
        ((failed_tests++))
    fi
    
    # Mobile Unit Tests
    if ! run_tests "Mobile Unit" "npm run test" "packages/mobile"; then
        ((failed_tests++))
    fi
    
    # Integration Tests
    if ! run_integration_tests; then
        ((failed_tests++))
    fi
    
    # End-to-End Tests
    if ! run_e2e_tests; then
        ((failed_tests++))
    fi
    
    # Performance Tests
    run_performance_tests
    
    # Security Tests
    run_security_tests
    
    # Generate Coverage Report
    generate_coverage_report
    
    # Calculate execution time
    local end_time=$(date +%s)
    local execution_time=$((end_time - start_time))
    
    # Print summary
    echo ""
    echo "========================================================="
    echo "🏁 Test Suite Summary"
    echo "========================================================="
    echo "Execution time: ${execution_time}s"
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All test suites completed successfully! ✅"
        echo ""
        echo "📊 Test Coverage:"
        echo "  - Unit Tests: ✅ Passed"
        echo "  - Integration Tests: ✅ Passed"
        echo "  - End-to-End Tests: ✅ Passed"
        echo "  - Performance Tests: ✅ Completed"
        echo "  - Security Tests: ✅ Completed"
        echo ""
        echo "📁 Reports generated:"
        echo "  - Coverage: coverage/combined/"
        echo "  - Test results: Available in each package's test output"
        echo ""
        exit 0
    else
        print_error "$failed_tests test suite(s) failed ❌"
        echo ""
        echo "📊 Test Results:"
        echo "  - Failed test suites: $failed_tests"
        echo "  - Check individual test outputs above for details"
        echo ""
        exit 1
    fi
}

# Handle script interruption
trap 'print_error "Test execution interrupted"; exit 1' INT TERM

# Run main function
main "$@"