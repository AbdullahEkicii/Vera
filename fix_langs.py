import os
import json

loc_dir = r"c:\react_projects\ezan-app\src\localization"

for file_name in os.listdir(loc_dir):
    if file_name.endswith('.json'):
        file_path = os.path.join(loc_dir, file_name)
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        changed = False
        
        if 'translation' not in data:
            data['translation'] = {}
            
        if 'daily' not in data['translation']:
            data['translation']['daily'] = {}
            changed = True
            
        if 'daily' in data:
            for k, v in data['daily'].items():
                data['translation']['daily'][k] = v
                changed = True
            del data['daily']
            
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Fixed {file_name}")
