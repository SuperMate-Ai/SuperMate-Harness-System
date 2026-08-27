@echo off
REM quark-harness-launcher entry (double-click; ASCII only - cmd parses bat with GBK codepage)
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch.ps1"
