try:
    import pandas as pd
except ImportError:
    import sys
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl"])
    import pandas as pd

try:
    df = pd.read_excel(r'c:\Users\heysu\Desktop\nv\NoteVault - Workspace Management (RA329, 326, 324) (1).xlsx', sheet_name=None)
    for sheet_name, data in df.items():
        print(f"--- Sheet: {sheet_name} ---")
        print(data.to_string())
except Exception as e:
    print(f"Error: {e}")
