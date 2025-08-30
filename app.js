#!/usr/bin/env node
/**
 * Simple Hello World Node.js application for CI/CD testing
 */

const fs = require('fs');
const path = require('path');

function getHelloMessage() {
    return {
        message: "Hello World from Node.js CI/CD Pipeline! 🚀",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        buildId: process.env.GITHUB_RUN_ID || "local",
        nodeVersion: process.version
    };
}

function main() {
    const hello = getHelloMessage();
    
    console.log("=".repeat(50));
    console.log("🚀 HELLO WORLD NODE.JS CI/CD APPLICATION");
    console.log("=".repeat(50));
    console.log(`Message: ${hello.message}`);
    console.log(`Version: ${hello.version}`);
    console.log(`Environment: ${hello.environment}`);
    console.log(`Build ID: ${hello.buildId}`);
    console.log(`Node Version: ${hello.nodeVersion}`);
    console.log(`Timestamp: ${hello.timestamp}`);
    console.log("=".repeat(50));
    
    // Save output for testing
    fs.writeFileSync('output.json', JSON.stringify(hello, null, 2));
    
    console.log("✅ Application completed successfully!");
    return hello;
}

if (require.main === module) {
    main();
}

module.exports = { getHelloMessage, main };
