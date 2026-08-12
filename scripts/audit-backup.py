from pathlib import Path
import re
import sqlite3

root = Path('/home/ubuntu/podcore')
database = (root / 'server/database.ts').read_text(encoding='utf-8')
backup = (root / 'server/routers/backup.ts').read_text(encoding='utf-8')

schema_tables = []
for match in re.finditer(r'CREATE TABLE(?: IF NOT EXISTS)?\s+([A-Za-z0-9_]+)', database, re.IGNORECASE):
    name = match.group(1)
    if name not in schema_tables:
        schema_tables.append(name)

export_tables = []
for match in re.finditer(r'\n\s{6,}([A-Za-z][A-Za-z0-9]*):\s*db\.all\([\'\"]([A-Za-z0-9_]+)', backup):
    key, table = match.groups()
    pair = f'{key} -> {table}'
    if pair not in export_tables:
        export_tables.append(pair)

import_tables = []
for match in re.finditer(r"upsert\(['\"]([A-Za-z0-9_]+)['\"]", backup):
    table = match.group(1)
    if table not in import_tables:
        import_tables.append(table)

db_path = Path('/home/ubuntu/.podcore/podcore.db')
conn = sqlite3.connect(db_path)
actual_tables = [row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
actual_counts = {table: conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0] for table in actual_tables}
conn.close()

print('ACTUAL_TABLES')
for table in actual_tables:
    print(f'{table}: {actual_counts[table]} rows')
print('\nSCHEMA_TABLES')
for table in schema_tables:
    print(table)
print('\nEXPORT_TABLES')
for item in export_tables:
    print(item)
print('\nIMPORT_TABLES')
for table in import_tables:
    print(table)
print('\nSCHEMA_NOT_EXPORTED')
exported_names = {item.split(' -> ')[1] for item in export_tables}
for table in schema_tables:
    if table not in exported_names:
        print(table)
print('\nACTUAL_NOT_EXPORTED')
for table in actual_tables:
    if table not in exported_names:
        print(table)
print('\nEXPORTED_NOT_IMPORTED')
for table in sorted(exported_names - set(import_tables)):
    print(table)
