// 🔥 This file contains intentional errors to test build failure detection

console.log("Testing build failure detection...");

// Intentional syntax error to cause build failure
const badSyntax = {
    "missing_quote: "this will cause a syntax error,
    "unclosed_brace": true
    // Missing closing brace intentionally

// This will cause the build to fail
console.log("If you see this, the error wasn't caught!");

// Add more errors for good measure
function broken_function() {
    return undefined.property.that.does.not.exist;
}

// Call the broken function
broken_function();

// Throw an explicit error
throw new Error("🚨 Intentional build failure for CI/CD dashboard testing!");
