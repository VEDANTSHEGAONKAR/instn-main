@echo off
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    python app.py
) else (
    python app.py
)
