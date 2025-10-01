// Test file to trigger pipeline failure
// This file contains intentional syntax errors

console.log("Hello from test pipeline failure!");

// Intentional syntax error - missing closing parenthesis
function testFunction() {
    console.log("This will cause a syntax error"
    // Missing closing brace
}

// Another syntax error - invalid JavaScript
const invalid = {
    key: "value"
    // Missing comma and closing brace
}

console.log("This line should never be reached due to syntax errors");
