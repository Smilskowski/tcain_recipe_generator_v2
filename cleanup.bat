@echo off
echo Cleaning up old files that cause conflicts...

REM Remove old dist folder
if exist dist rmdir /s /q dist

REM Remove problematic old files if they exist
if exist docs\new_bag4.js del docs\new_bag4.js
if exist src\new_bag4.js del src\new_bag4.js

REM Remove node_modules if they're causing type issues
if exist node_modules rmdir /s /q node_modules

echo Installing dependencies...
npm install

echo Cleanup complete! Now run: npm run selftest
