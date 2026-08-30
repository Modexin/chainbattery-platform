@echo off
title Battery Traceability Platform

rem ============================================================
rem  Battery Traceability Platform - Auto Launcher
rem  Works on any clean Windows 10/11 x64 machine
rem  No pre-installed Node.js required
rem ============================================================

rem ---- Step 1: Locate project root ----
cd /d "%~dp0"
set "ROOT=%CD%"

rem ---- Step 2: Create runtime directory ----
if not exist "%ROOT%\.runtime" mkdir "%ROOT%\.runtime"

rem ---- Step 3: Check if server is already running ----
echo [1/12] Checking existing server...
powershell -Command "try{$r=Invoke-WebRequest -Uri 'http://localhost:3000/api/stats' -UseBasicParsing -TimeoutSec 2;if($r.StatusCode -eq 200){echo ALREADY_RUNNING}}catch{}" > "%ROOT%\.runtime\check.txt" 2>&1
findstr "ALREADY_RUNNING" "%ROOT%\.runtime\check.txt" >nul 2>&1
if errorlevel 1 goto :not_running
del "%ROOT%\.runtime\check.txt" 2>nul
echo [OK] Server is already running
start http://localhost:3000
timeout /t 3 /nobreak >nul
exit /b 0

:not_running
del "%ROOT%\.runtime\check.txt" 2>nul

rem ---- Step 4: Ensure Node.js is available ----
echo [2/12] Checking Node.js...
set "NODE_VER=v20.18.0"
set "NODE_DIR=%ROOT%\.runtime\node"
set "NODE_EXE="
set "NPM_CMD="

rem 4a: Try system Node.js (v18+)
where node >nul 2>&1
if errorlevel 1 goto :check_portable
for /f "delims=" %%v in ('node -v') do set "SYS_VER=%%v"
echo Found Node.js: %SYS_VER%
set "VER_NUM=%SYS_VER:v=%"
for /f "tokens=1 delims=." %%a in ("%VER_NUM%") do set "MAJOR=%%a"
if %MAJOR% lss 18 goto :check_portable
set "NODE_EXE=node"
set "NPM_CMD=npm"
echo [OK] System Node.js: %SYS_VER%
goto :have_node

:check_portable
rem 4b: Try portable Node.js
if not exist "%NODE_DIR%\node.exe" goto :download_node
set "NODE_EXE=%NODE_DIR%\node.exe"
set "NPM_CMD=%NODE_DIR%\npm.cmd"
set "PATH=%NODE_DIR%;%PATH%"
for /f "delims=" %%v in ('"%NODE_EXE%" -v') do echo [OK] Portable Node.js: %%v
goto :have_node

:download_node
rem 4c: Download portable Node.js
echo [..] Node.js not found. Downloading %NODE_VER%...
echo      This may take a few minutes. Please wait...
set "ZIP=%ROOT%\.runtime\node.zip"
set "URL1=https://nodejs.org/dist/%NODE_VER%/node-%NODE_VER%-win-x64.zip"
set "URL2=https://registry.npmmirror.com/-/binary/node/%NODE_VER%/node-%NODE_VER%-win-x64.zip"

powershell -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%URL1%' -OutFile '%ZIP%' -UseBasicParsing } catch { try { Invoke-WebRequest -Uri '%URL2%' -OutFile '%ZIP%' -UseBasicParsing } catch { Write-Host 'DOWNLOAD_FAILED' } }"

if not exist "%ZIP%" goto :download_failed

echo [..] Extracting...
powershell -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Expand-Archive -Path '%ZIP%' -DestinationPath '%ROOT%\.runtime\node-tmp' -Force"

for /d %%d in ("%ROOT%\.runtime\node-tmp\*") do move "%%d" "%NODE_DIR%" >nul 2>&1
rmdir "%ROOT%\.runtime\node-tmp" 2>nul
del "%ZIP%" 2>nul

if not exist "%NODE_DIR%\node.exe" goto :extract_failed

set "NODE_EXE=%NODE_DIR%\node.exe"
set "NPM_CMD=%NODE_DIR%\npm.cmd"
set "PATH=%NODE_DIR%;%PATH%"
for /f "delims=" %%v in ('"%NODE_EXE%" -v') do echo [OK] Portable Node.js installed: %%v
goto :have_node

:download_failed
echo [ERROR] Failed to download Node.js
echo.
echo Please manually download from:
echo   https://nodejs.org/dist/%NODE_VER%/node-%NODE_VER%-win-x64.zip
echo Extract to: .runtime\node\
echo.
pause
exit /b 1

:extract_failed
echo [ERROR] Failed to extract Node.js
pause
exit /b 1

:have_node
echo.

rem ---- Step 5: Enter backend directory ----
echo [3/12] Locating backend...
cd /d "%ROOT%\backend"

if exist "server.js" goto :backend_ok
echo [ERROR] backend\server.js not found
pause
exit /b 1

:backend_ok
echo [OK] backend found

rem ---- Step 6: Verify npm dependencies ----
echo [4/12] Checking dependencies...
if exist "node_modules" goto :deps_ok

echo [..] Installing dependencies (first run, may take 1-3 min)...
call "%NPM_CMD%" install
if errorlevel 1 goto :npm_mirror
goto :deps_installed

:npm_mirror
echo [..] Retrying with Chinese mirror...
call "%NPM_CMD%" install --registry https://registry.npmmirror.com
if errorlevel 1 goto :npm_failed
goto :deps_installed

:npm_failed
echo [ERROR] Failed to install dependencies
pause
exit /b 1

:deps_installed
echo [OK] Dependencies installed
goto :check_native

:deps_ok
echo [OK] Dependencies found

:check_native
rem ---- Step 7: Verify better-sqlite3 native module ----
echo [5/12] Verifying native modules...
"%NODE_EXE%" -e "try{require('better-sqlite3');process.exit(0)}catch(e){process.exit(1)}" 2>nul
if errorlevel 1 goto :rebuild_native
echo [OK] Native modules verified
goto :check_db

:rebuild_native
echo [..] Native module broken, rebuilding...
call "%NPM_CMD%" rebuild better-sqlite3 2>nul
if errorlevel 1 goto :reinstall_native
"%NODE_EXE%" -e "try{require('better-sqlite3');process.exit(0)}catch(e){process.exit(1)}" 2>nul
if errorlevel 1 goto :reinstall_native
echo [OK] Native modules rebuilt
goto :check_db

:reinstall_native
echo [..] Rebuild failed, reinstalling...
rmdir /s /q "node_modules\better-sqlite3" 2>nul
call "%NPM_CMD%" install better-sqlite3 --registry https://registry.npmmirror.com
"%NODE_EXE%" -e "try{require('better-sqlite3');process.exit(0)}catch(e){process.exit(1)}" 2>nul
if errorlevel 1 goto :full_reinstall
echo [OK] Native modules reinstalled
goto :check_db

:full_reinstall
echo [..] Still broken, full reinstall...
rmdir /s /q "node_modules" 2>nul
call "%NPM_CMD%" install --registry https://registry.npmmirror.com
"%NODE_EXE%" -e "try{require('better-sqlite3');process.exit(0)}catch(e){process.exit(1)}" 2>nul
if errorlevel 1 goto :native_failed
echo [OK] Full reinstall completed
goto :check_db

:native_failed
echo [ERROR] Cannot load better-sqlite3
echo Try: delete backend\node_modules folder and run again
pause
exit /b 1

:check_db
rem ---- Step 8: Database check (never delete) ----
echo [6/12] Checking database...
if exist "db\chainbattery.db" goto :db_found
echo [..] Database will initialize on first start
goto :check_port

:db_found
echo [OK] Database found

:check_port
rem ---- Step 9: Check port 3000 ----
echo [7/12] Checking port 3000...
netstat -ano 2>nul | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 goto :port_free
echo [!] Port 3000 is in use by another program
echo     Server may fail. Close it or edit server.js line 7.
goto :start_server

:port_free
echo [OK] Port 3000 is free

:start_server
rem ---- Step 10: Start server in background ----
echo [8/12] Starting server...
start "" "%NODE_EXE%" server.js

rem ---- Step 11: Wait for server then open browser ----
echo [9/12] Waiting for server to be ready...
set /a WAIT_COUNT=0

:wait_ready
timeout /t 1 /nobreak >nul
set /a WAIT_COUNT+=1
powershell -Command "try{$r=Invoke-WebRequest -Uri 'http://localhost:3000/api/stats' -UseBasicParsing -TimeoutSec 2;if($r.StatusCode -eq 200){echo READY}}catch{}" > "%ROOT%\.runtime\ready.txt" 2>&1
findstr "READY" "%ROOT%\.runtime\ready.txt" >nul 2>&1
if errorlevel 1 goto :not_ready_yet
del "%ROOT%\.runtime\ready.txt" 2>nul
echo [OK] Server is ready!
goto :open_browser

:not_ready_yet
del "%ROOT%\.runtime\ready.txt" 2>nul
if %WAIT_COUNT% lss 30 goto :wait_ready
echo [!] Server took too long to start
echo     Check the server window for errors
goto :open_browser

:open_browser
echo [10/12] Opening browser...
start http://localhost:3000
echo [OK] Browser opened
echo.
echo ==========================================
echo   Battery Traceability Platform
echo   http://localhost:3000
echo ==========================================
echo.
echo [11/12] Server is running in background
echo [12/12] Done!
echo.
echo To stop: close the node.exe window
echo          or use Task Manager to end node.exe
echo.
echo This window will stay open.
echo Close it when done.
echo.

rem Keep window open
pause
