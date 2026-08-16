import os
import json

locales_dir = os.path.join(os.path.dirname(__file__), '../src/localization')

translations = {
    "ar": { "title": "ادعمنا", "message": "إذا أعجبك تطبيقنا، يرجى تقييمه بـ 5 نجوم على متجر بلاي وإخبارنا بالميزات التي تريدها!", "notNow": "ليس الآن", "review": "تقييم" },
    "bn": { "title": "আমাদের সমর্থন করুন", "message": "আপনি যদি আমাদের অ্যাপটি পছন্দ করেন, অনুগ্রহ করে প্লে স্টোরে ৫ স্টার দিন এবং আপনি কী কী বৈশিষ্ট্য চান তা আমাদের জানান!", "notNow": "এখন না", "review": "রেটিং দিন" },
    "de": { "title": "Unterstützen Sie uns", "message": "Wenn Ihnen unsere App gefällt, geben Sie uns bitte 5 Sterne im Play Store und teilen Sie uns mit, welche Funktionen Sie sich wünschen!", "notNow": "Später", "review": "Bewerten" },
    "en": { "title": "Support Us", "message": "If you like our app, please give us 5 stars on the Play Store and let us know what features you want!", "notNow": "Not Now", "review": "Review" },
    "es": { "title": "Apóyanos", "message": "Si te gusta nuestra aplicación, danos 5 estrellas en Play Store y cuéntanos qué funciones te gustaría ver.", "notNow": "Ahora no", "review": "Valorar" },
    "fa": { "title": "از ما حمایت کنید", "message": "اگر برنامه ما را دوست دارید، لطفاً در پلی استور به ما ۵ ستاره بدهید و بگویید چه ویژگی‌هایی می‌خواهید!", "notNow": "الان نه", "review": "امتیاز دادن" },
    "fr": { "title": "Soutenez-nous", "message": "Si vous aimez notre application, donnez-nous 5 étoiles sur le Play Store et dites-nous quelles fonctionnalités vous souhaitez !", "notNow": "Pas maintenant", "review": "Évaluer" },
    "ha": { "title": "Goyon Baya", "message": "Idan kuna son manhajarmu, da fatan za ku ba mu taurari 5 a Play Store kuma ku sanar da mu irin abubuwan da kuke so!", "notNow": "Ba yanzu ba", "review": "Bita" },
    "id": { "title": "Dukung Kami", "message": "Jika Anda menyukai aplikasi kami, berikan kami 5 bintang di Play Store dan beri tahu kami fitur apa yang Anda inginkan!", "notNow": "Nanti", "review": "Ulas" },
    "ms": { "title": "Sokong Kami", "message": "Jika anda suka aplikasi kami, sila berikan 5 bintang di Play Store dan beritahu kami ciri yang anda mahukan!", "notNow": "Bukan Sekarang", "review": "Ulas" },
    "ru": { "title": "Поддержите нас", "message": "Если вам нравится наше приложение, поставьте нам 5 звезд в Play Store и расскажите, какие функции вы хотели бы видеть!", "notNow": "Не сейчас", "review": "Оценить" },
    "sw": { "title": "Tuunge Mkono", "message": "Ikiwa unapenda programu yetu, tafadhali tupe nyota 5 kwenye Duka la Play na tujulishe unataka vipengele gani!", "notNow": "Sio Sasa", "review": "Kagua" },
    "tr": { "title": "Bize Destek Olun", "message": "Uygulamamızı beğendiyseniz, lütfen Play Store'da bize 5 yıldız verin ve gelmesini istediğiniz özellikleri yazın!", "notNow": "Şimdi Değil", "review": "Değerlendir" },
    "ur": { "title": "ہماری حمایت کریں", "message": "اگر آپ کو ہماری ایپ پسند ہے، تو براہ کرم ہمیں پلے اسٹور پر 5 اسٹارز دیں اور ہمیں بتائیں کہ آپ کون سی خصوصیات چاہتے ہیں!", "notNow": "ابھی نہیں", "review": "جائزہ لیں" },
}

for file_name in os.listdir(locales_dir):
    if file_name.endswith('.json'):
        lang = file_name.split('.')[0]
        file_path = os.path.join(locales_dir, file_name)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if 'translation' in data:
            review_text = translations.get(lang, translations['en'])
            data['translation']['review'] = review_text
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Updated {file_name}")

print("Translations updated successfully.")
