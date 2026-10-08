@echo off
setlocal EnableExtensions
set "APP_HOME=%~dp0"
set "GRADLE_VERSION=8.11.1"
set "CACHE_ROOT=%USERPROFILE%\.gradle\meditaly-bootstrap"
set "GRADLE_HOME=%CACHE_ROOT%\gradle-%GRADLE_VERSION%"
set "GRADLE_BIN=%GRADLE_HOME%\bin\gradle.bat"

if not exist "%GRADLE_BIN%" (
  echo [Meditaly] Gradle %GRADLE_VERSION% non trovato. Download in corso...
  if not exist "%CACHE_ROOT%" mkdir "%CACHE_ROOT%"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $v='%GRADLE_VERSION%'; $root='%CACHE_ROOT%'; $zip=Join-Path $root ('gradle-'+$v+'-bin.zip'); $url='https://services.gradle.org/distributions/gradle-'+$v+'-bin.zip'; Write-Host '[Meditaly] Download Gradle' $v; Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing; if(Test-Path (Join-Path $root ('gradle-'+$v))){Remove-Item -Recurse -Force (Join-Path $root ('gradle-'+$v))}; Expand-Archive -Path $zip -DestinationPath $root -Force; Remove-Item $zip -Force"
  if errorlevel 1 (
    echo [Meditaly] ERRORE: impossibile scaricare Gradle %GRADLE_VERSION%.
    exit /b 1
  )
)

call "%GRADLE_BIN%" -p "%APP_HOME%" %*
exit /b %ERRORLEVEL%
