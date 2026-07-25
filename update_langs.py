import os
import json
import urllib.request
import urllib.parse

loc_dir = r"c:\react_projects\ezan-app\src\localization"

base_en = {
  "verseBody": "Click to read the verse of the day!",
  "hadithBody": "Click to read the hadith of the day!",
  "quoteBody": "Click to read the quote of the day!"
}

base_tr = {
  "verseBody": "Günün ayetini okumak için tıklayın!",
  "hadithBody": "Günün hadisini okumak için tıklayın!",
  "quoteBody": "Günün sözünü okumak için tıklayın!"
}

def translate(text, target):
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target}&dt=t&q={urllib.parse.quote(text)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return ''.join([part[0] for part in data[0]])
    except Exception as e:
        print(f"Error translating to {target}: {e}")
        return text

for file_name in os.listdir(loc_dir):
    if file_name.endswith('.json'):
        lang = file_name.split('.')[0]
        file_path = os.path.join(loc_dir, file_name)
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if 'daily' not in data:
            data['daily'] = {}
            
        if lang == 'en':
            data['daily'].update(base_en)
        elif lang == 'tr':
            data['daily'].update(base_tr)
        else:
            print(f"Translating for {lang}...")
            data['daily']['verseBody'] = translate(base_en['verseBody'], lang)
            data['daily']['hadithBody'] = translate(base_en['hadithBody'], lang)
            data['daily']['quoteBody'] = translate(base_en['quoteBody'], lang)
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {file_name}")
