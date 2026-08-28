@echo off
title StreamDeck Bridge
cd /d "D:\Escritorio\Proyects\streamdeck-emulator\bridge"
if not exist node_modules (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)
echo.
node index.mjs --relay wss://elgato-relay.franwebdev-relay.workers.dev
echo.
echo Bridge closed. Press any key to exit.
pause >nul
