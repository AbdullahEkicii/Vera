#!/usr/bin/env python3
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'localization')

OBSOLETE_KEYS = [
    ('translation', 'settings', 'soundNames', 'adhan'),
]

# Language-specific rich overrides for new notification, qibla, and names keys
LANG_OVERRIDES = {
    "ar": {
        ("translation", "notifications", "persistent", "hoursUnit"): "س",
        ("translation", "notifications", "persistent", "minutesUnit"): "د",
        ("translation", "notifications", "persistent", "countdown"): "متبقية",
        ("translation", "notifications", "persistent", "prayerEntered"): "حان وقت الصلاة",
        ("translation", "notifications", "silenceAction"): "كتم",
        ("translation", "notifications", "channels", "exactName"): "وقت الصلاة",
        ("translation", "notifications", "channels", "exactDesc"): "يعمل عند حلول وقت الصلاة.",
        ("translation", "notifications", "channels", "warningName"): "اقتراب وقت الصلاة (25 دقيقة)",
        ("translation", "notifications", "channels", "warningDesc"): "تنبيه قبل 25 دقيقة من الصلاة.",
        ("translation", "notifications", "channels", "dailyName"): "الإلهام اليومي",
        ("translation", "notifications", "channels", "dailyDesc"): "آية أو حديث أو حكمة يومية.",
        ("translation", "notifications", "channels", "persistentName"): "شاشة القفل والشريط العلوي",
        ("translation", "notifications", "channels", "persistentDesc"): "عرض العد التنازلي المباشر للصلاة.",
        ("translation", "directions", "n"): "ش",
        ("translation", "directions", "ne"): "ش.ش",
        ("translation", "directions", "e"): "ش",
        ("translation", "directions", "se"): "ج.ش",
        ("translation", "directions", "s"): "ج",
        ("translation", "directions", "sw"): "ج.غ",
        ("translation", "directions", "w"): "غ",
        ("translation", "directions", "nw"): "ش.غ",
        ("translation", "qibla", "title"): "بوصلة القبلة",
        ("translation", "qibla", "subtitle"): "اتبع الخطوات لتحديد اتجاه القبلة بدقة",
        ("translation", "qibla", "guideTitle"): "كيفية الاستخدام؟",
        ("translation", "qibla", "step1"): "1. احمل هاتفك بشكل مسطح في يدك",
        ("translation", "qibla", "step2"): "2. أدر جسمك ببطء",
        ("translation", "qibla", "step3"): "3. عندما تشير الإبرة إلى 🕋 الكعبة وتتحول إلى اللون الأخضر، فأنت تتجه نحو القبلة!",
        ("translation", "qibla", "description"): "امسك الهاتف بشكل مسطح وأدر ببطء حتى تتحول الإبرة إلى اللون الأخضر",
        ("translation", "qibla", "hint"): "🕌 عند المحاذاة مع الكعبة (🕋)، تتحول البوصلة إلى اللون الأخضر ويهتز جهازك.",
        ("translation", "qibla", "alignedSuccess"): "🕌 تتجه نحو القبلة!",
        ("translation", "names", "namesCount"): "{{count}} اسماً",
        ("translation", "names", "duasCount"): "{{count}} دعاءً",
        ("translation", "names", "tapHint"): "انقر للتفاصيل",
    },
    "de": {
        ("translation", "notifications", "persistent", "hoursUnit"): "Std.",
        ("translation", "notifications", "persistent", "minutesUnit"): "Min.",
        ("translation", "notifications", "persistent", "countdown"): "verbleibend",
        ("translation", "notifications", "persistent", "prayerEntered"): "Gebetszeit",
        ("translation", "notifications", "silenceAction"): "Stumm",
        ("translation", "directions", "n"): "N",
        ("translation", "directions", "ne"): "NO",
        ("translation", "directions", "e"): "O",
        ("translation", "directions", "se"): "SO",
        ("translation", "directions", "s"): "S",
        ("translation", "directions", "sw"): "SW",
        ("translation", "directions", "w"): "W",
        ("translation", "directions", "nw"): "NW",
        ("translation", "qibla", "title"): "Qibla-Kompass",
        ("translation", "qibla", "subtitle"): "Befolgen Sie die Schritte, um die Qibla genau zu finden",
        ("translation", "qibla", "step1"): "1. Halten Sie Ihr Telefon FLACH in der Hand",
        ("translation", "qibla", "step2"): "2. Drehen Sie Ihren Körper LANGSAM",
        ("translation", "qibla", "step3"): "3. Wenn die Nadel auf 🕋 Kaaba zeigt und GRÜN wird, schauen Sie zur Qibla!",
        ("translation", "names", "namesCount"): "{{count}} Namen",
        ("translation", "names", "duasCount"): "{{count}} Bittgebete",
        ("translation", "names", "tapHint"): "Für Details tippen",
    },
    "fr": {
        ("translation", "notifications", "persistent", "hoursUnit"): "h",
        ("translation", "notifications", "persistent", "minutesUnit"): "min",
        ("translation", "notifications", "persistent", "countdown"): "restant",
        ("translation", "notifications", "persistent", "prayerEntered"): "Heure de prière",
        ("translation", "notifications", "silenceAction"): "Muet",
        ("translation", "directions", "n"): "N",
        ("translation", "directions", "ne"): "NE",
        ("translation", "directions", "e"): "E",
        ("translation", "directions", "se"): "SE",
        ("translation", "directions", "s"): "S",
        ("translation", "directions", "sw"): "SO",
        ("translation", "directions", "w"): "O",
        ("translation", "directions", "nw"): "NO",
        ("translation", "qibla", "title"): "Boussole de la Qibla",
        ("translation", "qibla", "subtitle"): "Suivez les étapes pour trouver avec précision la Qibla",
        ("translation", "qibla", "step1"): "1. Tenez votre téléphone À PLAT dans votre main",
        ("translation", "qibla", "step2"): "2. Tournez votre corps LENTEMENT",
        ("translation", "qibla", "step3"): "3. Lorsque l'aiguille pointe vers 🕋 la Kaaba et devient VERTE, vous faites face à la Qibla !",
        ("translation", "names", "namesCount"): "{{count}} Noms",
        ("translation", "names", "duasCount"): "{{count}} Invocations",
        ("translation", "names", "tapHint"): "Appuyez pour les détails",
    },
    "es": {
        ("translation", "notifications", "persistent", "hoursUnit"): "h",
        ("translation", "notifications", "persistent", "minutesUnit"): "min",
        ("translation", "notifications", "persistent", "countdown"): "restante",
        ("translation", "notifications", "persistent", "prayerEntered"): "Hora de oración",
        ("translation", "notifications", "silenceAction"): "Silenciar",
        ("translation", "directions", "n"): "N",
        ("translation", "directions", "ne"): "NE",
        ("translation", "directions", "e"): "E",
        ("translation", "directions", "se"): "SE",
        ("translation", "directions", "s"): "S",
        ("translation", "directions", "sw"): "SO",
        ("translation", "directions", "w"): "O",
        ("translation", "directions", "nw"): "NO",
        ("translation", "qibla", "title"): "Brújula de la Qibla",
        ("translation", "qibla", "subtitle"): "Siga los pasos para encontrar con precisión la Qibla",
        ("translation", "qibla", "step1"): "1. Sostenga su teléfono PLANO en la mano",
        ("translation", "qibla", "step2"): "2. Gire su cuerpo LENTAMENTE",
        ("translation", "qibla", "step3"): "3. Cuando la aguja apunte a 🕋 la Kaaba y se vuelva VERDE, ¡estará frente a la Qibla!",
        ("translation", "names", "namesCount"): "{{count}} Nombres",
        ("translation", "names", "duasCount"): "{{count}} Duas",
        ("translation", "names", "tapHint"): "Toca para detalles",
    },
    "ru": {
        ("translation", "notifications", "persistent", "hoursUnit"): "ч",
        ("translation", "notifications", "persistent", "minutesUnit"): "мин",
        ("translation", "notifications", "persistent", "countdown"): "осталось",
        ("translation", "notifications", "persistent", "prayerEntered"): "Время намаза",
        ("translation", "notifications", "silenceAction"): "Заглушить",
        ("translation", "directions", "n"): "С",
        ("translation", "directions", "ne"): "СВ",
        ("translation", "directions", "e"): "В",
        ("translation", "directions", "se"): "ЮВ",
        ("translation", "directions", "s"): "Ю",
        ("translation", "directions", "sw"): "ЮЗ",
        ("translation", "directions", "w"): "З",
        ("translation", "directions", "nw"): "СЗ",
        ("translation", "qibla", "title"): "Компас Киблы",
        ("translation", "qibla", "subtitle"): "Следуйте шагам, чтобы точно определить направление Киблы",
        ("translation", "qibla", "step1"): "1. Держите телефон РОВНО на ладони",
        ("translation", "qibla", "step2"): "2. МЕДЛЕННО поворачивайтесь вокруг своей оси",
        ("translation", "qibla", "step3"): "3. Когда стрелка указывает на 🕋 Каабу и станет ЗЕЛЕНОЙ, вы смотрите на Киблу!",
        ("translation", "names", "namesCount"): "{{count}} Имен",
        ("translation", "names", "duasCount"): "{{count}} Молитв",
        ("translation", "names", "tapHint"): "Нажмите для подробностей",
    },
    "tr": {
        ("translation", "notifications", "persistent", "hoursUnit"): "sa",
        ("translation", "notifications", "persistent", "minutesUnit"): "dk",
        ("translation", "notifications", "persistent", "countdown"): "sonra",
        ("translation", "notifications", "persistent", "prayerEntered"): "Vakit Girdi",
        ("translation", "notifications", "silenceAction"): "Sustur",
    },
    "en": {
        ("translation", "notifications", "persistent", "hoursUnit"): "h",
        ("translation", "notifications", "persistent", "minutesUnit"): "m",
        ("translation", "notifications", "persistent", "countdown"): "left",
        ("translation", "notifications", "persistent", "prayerEntered"): "Prayer Time",
        ("translation", "notifications", "silenceAction"): "Mute",
    }
}

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def get_leaves(obj, path=()):
    result = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            result.extend(get_leaves(v, path + (k,)))
    else:
        result.append((path, obj))
    return result

def set_by_path(obj, path, value):
    cur = obj
    for k in path[:-1]:
        if k not in cur or not isinstance(cur[k], dict):
            cur[k] = {}
        cur = cur[k]
    cur[path[-1]] = value

def delete_by_path(obj, path):
    cur = obj
    for k in path[:-1]:
        if not isinstance(cur, dict) or k not in cur:
            return False
        cur = cur[k]
    if isinstance(cur, dict) and path[-1] in cur:
        del cur[path[-1]]
        return True
    return False

def get_nested(obj, path):
    cur = obj
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return None
        cur = cur[k]
    return cur

tr_path = os.path.join(LOCALES_DIR, 'tr.json')
en_path = os.path.join(LOCALES_DIR, 'en.json')
tr_data = load_json(tr_path)
en_data = load_json(en_path)

master_leaves = get_leaves(tr_data)

for filename in sorted(os.listdir(LOCALES_DIR)):
    if not filename.endswith('.json'):
        continue

    lang_code = filename.replace('.json', '')
    filepath = os.path.join(LOCALES_DIR, filename)

    try:
        lang_data = load_json(filepath)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        continue

    added = []
    removed = []
    overridden = []
    changed = False

    # 1. Sync all master keys from tr.json (with en.json fallback)
    for path, tr_val in master_leaves:
        existing = get_nested(lang_data, path)
        if existing is None:
            en_val = get_nested(en_data, path)
            fallback = en_val if en_val is not None else tr_val
            set_by_path(lang_data, path, fallback)
            added.append('.'.join(path))
            changed = True

    # 2. Apply language specific overrides if provided
    if lang_code in LANG_OVERRIDES:
        for path_tuple, override_val in LANG_OVERRIDES[lang_code].items():
            current_val = get_nested(lang_data, path_tuple)
            if current_val != override_val:
                set_by_path(lang_data, path_tuple, override_val)
                overridden.append('.'.join(path_tuple))
                changed = True

    # 3. Delete obsolete keys
    for obs_path in OBSOLETE_KEYS:
        if delete_by_path(lang_data, obs_path):
            removed.append('.'.join(obs_path))
            changed = True

    if changed:
        save_json(filepath, lang_data)
        print(f"Synced {filename}: +{len(added)} added, {len(overridden)} updated, -{len(removed)} removed")

print("Full localization sync complete across all 34 language files.")
