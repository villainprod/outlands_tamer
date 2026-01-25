import pandas as pd

url = 'https://wiki.uooutlands.com/Taming_Bestiary'


tables = pd.read_html(url)
fileDir = r'C:\\python\\outlands\\taming\\'
print(f"Found {len(tables)} tables")

# Save each table as its own CSV
for i, table in enumerate(tables, start=1):
    csv_name = f"table_{i}.csv"
    table.to_csv(fileDir + csv_name, index=False)
    print(f"Saved {csv_name}")
