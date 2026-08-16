import os
import json

locales_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'localization')

translations = {
  "tr": {
    "general": "Genel Ayarlar",
    "fullscreen": "Tam Ekran Modu",
    "persistentNotifTitle": "Kilit Ekranı & Üst Panel",
    "persistentNotif": "Sabit Kilit Ekranı Vakti",
    "persistentNotifDesc": "Sıradaki vakte ne kadar kaldığını kilit ekranında ve üst panelde canlı takip edin.",
    "widgetTitle": "Ana Ekran Widget'ı",
    "addWidget": "📌 Ana Ekrana Widget Ekle!",
    "addWidgetDesc": "Ezan vakitlerini ve canlı geri sayımı doğrudan telefonunuzun ana ekranında görün.",
    "soundSettings": "Ezan Sesleri ve Ses Seviyesi",
    "exactSoundTitle": "Ezan Vakti Sesi",
    "warningSoundTitle": "25 Dk Kala Sesi",
    "volumeLevelTitle": "Ezan Ses Seviyesi",
    "previewSound": "Dinle",
    "stopPreview": "Durdur",
    "warnNotifBtn": "-25dk",
    "exactNotifBtn": "Ezan",
    "testNotifTitle": "Test Bildirimi",
    "testNotifBody": "Test bildirimi 10 saniye içinde çalacak. Lütfen telefonunuzun ses tuşlarını kullanarak bildirim ses seviyesini kontrol edin veya ayarlayın.",
    "testWarnNotif": "-25dk Kala Test Et (10 sn)",
    "testExactNotif": "Tam Ezan Test Et (10 sn)",
    "soundNames": {
      "azizallah": "Azizallah (Ezan Vakti)",
      "adhan_25minutes": "Ezan (25 Dk Kala)",
      "allahu_akbar": "Allahu Ekber",
      "adhan": "Varsayılan Ezan"
    }
  },
  "en": {
    "general": "General Settings",
    "fullscreen": "Fullscreen Mode",
    "persistentNotifTitle": "Lock Screen & Status Bar",
    "persistentNotif": "Persistent Prayer Countdown",
    "persistentNotifDesc": "Track the time left for the next prayer live on your lock screen and notification panel.",
    "widgetTitle": "Home Screen Widget",
    "addWidget": "📌 Add Widget to Home Screen!",
    "addWidgetDesc": "See prayer times and live countdown directly on your phone's home screen.",
    "soundSettings": "Adhan Sounds & Volume",
    "exactSoundTitle": "Prayer Time Sound",
    "warningSoundTitle": "25 Min Warning Sound",
    "volumeLevelTitle": "Adhan Volume Level",
    "previewSound": "Listen",
    "stopPreview": "Stop",
    "warnNotifBtn": "-25m",
    "exactNotifBtn": "Adhan",
    "testNotifTitle": "Test Notification",
    "testNotifBody": "Test notification will play in 10 seconds. Please check your device notification volume.",
    "testWarnNotif": "Test 25m Warning (10s)",
    "testExactNotif": "Test Full Adhan (10s)",
    "soundNames": {
      "azizallah": "Azizallah (Prayer Time)",
      "adhan_25minutes": "Adhan (25 Min Warning)",
      "allahu_akbar": "Allahu Akbar",
      "adhan": "Default Adhan"
    }
  },
  "ar": {
    "general": "إعدادات عامة",
    "fullscreen": "وضع ملء الشاشة",
    "persistentNotifTitle": "شاشة القفل والشريط العلوي",
    "persistentNotif": "عد تنازلي دائم للصلاة",
    "persistentNotifDesc": "تابع الوقت المتبقي للصلاة التالية مباشرة على شاشة القفل ولوحة الإشعارات.",
    "widgetTitle": "أداة الشاشة الرئيسية",
    "addWidget": "📌 إضافة أداة إلى الشاشة الرئيسية!",
    "addWidgetDesc": "شاهد أوقات الصلاة والعد التنازلي المباشر مباشرة على الشاشة الرئيسية دون فتح التطبيق.",
    "soundSettings": "أصوات الأذان ومستوى الصوت",
    "exactSoundTitle": "صوت وقت الصلاة",
    "warningSoundTitle": "صوت التنبيه قبل 25 دقيقة",
    "volumeLevelTitle": "مستوى صوت الأذان",
    "previewSound": "استماع",
    "stopPreview": "إيقاف",
    "warnNotifBtn": "-25د",
    "exactNotifBtn": "أذان",
    "testNotifTitle": "إشعار تجريبي",
    "testNotifBody": "سيعمل الإشعار التجريبي خلال 10 ثوانٍ. يرجى التحقق من مستوى صوت الإشعارات.",
    "testWarnNotif": "اختبار تنبيه 25 دقيقة (10ث)",
    "testExactNotif": "اختبار الأذان الكامل (10ث)",
    "soundNames": {
      "azizallah": "عزيز الله (وقت الصلاة)",
      "adhan_25minutes": "أذان (قبل 25 دقيقة)",
      "allahu_akbar": "الله أكبر",
      "adhan": "الأذان الافتراضي"
    }
  },
  "ru": {
    "general": "Общие настройки",
    "fullscreen": "Полноэкранный режим",
    "persistentNotifTitle": "Экран блокировки и строка состояния",
    "persistentNotif": "Постоянный отсчет времени намаза",
    "persistentNotifDesc": "Отслеживайте время до следующего намаза прямо на экране блокировки и в панели уведомлений.",
    "widgetTitle": "Виджет главного экрана",
    "addWidget": "📌 Добавить виджет на главный экран!",
    "addWidgetDesc": "Смотрите время намазов и обратный отсчет прямо на главном экране без открытия приложения.",
    "soundSettings": "Звуки азана и громкость",
    "exactSoundTitle": "Звук времени намаза",
    "warningSoundTitle": "Звук за 25 минут",
    "volumeLevelTitle": "Громкость азана",
    "previewSound": "Прослушать",
    "stopPreview": "Стоп",
    "warnNotifBtn": "-25мин",
    "exactNotifBtn": "Азан",
    "testNotifTitle": "Тестовое уведомление",
    "testNotifBody": "Тестовое уведомление прозвучит через 10 секунд. Проверьте громкость вашего устройства.",
    "testWarnNotif": "Тест за 25 мин (10с)",
    "testExactNotif": "Тест полного азана (10с)",
    "soundNames": {
      "azizallah": "Азизаллах (Время намаза)",
      "adhan_25minutes": "Азан (За 25 минут)",
      "allahu_akbar": "Аллаху Акбар",
      "adhan": "Стандартный Азан"
    }
  },
  "de": {
    "general": "Allgemeine Einstellungen",
    "fullscreen": "Vollbildmodus",
    "persistentNotifTitle": "Sperrbildschirm & Statusleiste",
    "persistentNotif": "Dauerhafter Gebets-Countdown",
    "persistentNotifDesc": "Verfolgen Sie die verbleibende Zeit bis zum nächsten Gebet live auf dem Sperrbildschirm und im Benachrichtigungsfeld.",
    "widgetTitle": "Startbildschirm-Widget",
    "addWidget": "📌 Widget zum Startbildschirm hinzufügen!",
    "addWidgetDesc": "Sehen Sie Gebetszeiten und den Live-Countdown direkt auf Ihrem Startbildschirm, ohne die App zu öffnen.",
    "soundSettings": "Athan-Töne & Lautstärke",
    "exactSoundTitle": "Gebetszeit-Ton",
    "warningSoundTitle": "25-Minuten-Erinnerungston",
    "volumeLevelTitle": "Athan-Lautstärke",
    "previewSound": "Anhören",
    "stopPreview": "Stopp",
    "warnNotifBtn": "-25m",
    "exactNotifBtn": "Athan",
    "testNotifTitle": "Testbenachrichtigung",
    "testNotifBody": "Die Testbenachrichtigung wird in 10 Sekunden abgespielt. Bitte überprüfen Sie Ihre Gerätelautstärke.",
    "testWarnNotif": "Test 25 Min. Warnung (10s)",
    "testExactNotif": "Test Vollständiger Athan (10s)",
    "soundNames": {
      "azizallah": "Azizallah (Gebetszeit)",
      "adhan_25minutes": "Athan (25 Min. vorher)",
      "allahu_akbar": "Allahu Akbar",
      "adhan": "Standard-Athan"
    }
  },
  "fr": {
    "general": "Paramètres généraux",
    "fullscreen": "Mode plein écran",
    "persistentNotifTitle": "Écran de verrouillage & barre d'état",
    "persistentNotif": "Décompte de prière permanent",
    "persistentNotifDesc": "Suivez le temps restant pour la prochaine prière en direct sur votre écran de verrouillage et panneau de notifications.",
    "widgetTitle": "Widget d'écran d'accueil",
    "addWidget": "📌 Ajouter le widget à l'écran d'accueil !",
    "addWidgetDesc": "Consultez les heures de prière et le décompte en direct sur votre écran d'accueil sans ouvrir l'application.",
    "soundSettings": "Sons de l'Adhan & Volume",
    "exactSoundTitle": "Son de l'heure de prière",
    "warningSoundTitle": "Son de rappel 25 min",
    "volumeLevelTitle": "Volume de l'Adhan",
    "previewSound": "Écouter",
    "stopPreview": "Arrêter",
    "warnNotifBtn": "-25m",
    "exactNotifBtn": "Adhan",
    "testNotifTitle": "Notification de test",
    "testNotifBody": "La notification de test retentira dans 10 secondes. Veuillez vérifier le volume de votre appareil.",
    "testWarnNotif": "Test rappel 25m (10s)",
    "testExactNotif": "Test Adhan complet (10s)",
    "soundNames": {
      "azizallah": "Azizallah (Heure de prière)",
      "adhan_25minutes": "Adhan (25 min avant)",
      "allahu_akbar": "Allahu Akbar",
      "adhan": "Adhan par défaut"
    }
  },
  "es": {
    "general": "Ajustes generales",
    "fullscreen": "Modo de pantalla completa",
    "persistentNotifTitle": "Pantalla de bloqueo y barra de estado",
    "persistentNotif": "Cuenta atrás de oración permanente",
    "persistentNotifDesc": "Siga el tiempo restante para la próxima oración en directo en su pantalla de bloqueo y panel de notificaciones.",
    "widgetTitle": "Widget de pantalla de inicio",
    "addWidget": "📌 ¡Añadir widget a la pantalla de inicio!",
    "addWidgetDesc": "Vea los horarios de oración y la cuenta atrás en su pantalla de inicio sin abrir la aplicación.",
    "soundSettings": "Sonidos del Adán y volumen",
    "exactSoundTitle": "Sonido de la hora de oración",
    "warningSoundTitle": "Sonido de aviso 25 min",
    "volumeLevelTitle": "Nivel de volumen del Adán",
    "previewSound": "Escuchar",
    "stopPreview": "Detener",
    "warnNotifBtn": "-25m",
    "exactNotifBtn": "Adán",
    "testNotifTitle": "Notificación de prueba",
    "testNotifBody": "La notificación de prueba sonará en 10 segundos. Por favor revise el volumen de su dispositivo.",
    "testWarnNotif": "Probar aviso 25m (10s)",
    "testExactNotif": "Probar Adán completo (10s)",
    "soundNames": {
      "azizallah": "Azizallah (Hora de oración)",
      "adhan_25minutes": "Adán (25 min antes)",
      "allahu_akbar": "Allahu Akbar",
      "adhan": "Adán predeterminado"
    }
  }
}

en_fallback = translations["en"]

for filename in os.listdir(locales_dir):
    if not filename.endswith('.json'):
        continue

    lang_code = filename.replace('.json', '')
    filepath = os.path.join(locales_dir, filename)

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if 'translation' not in data:
        data['translation'] = {}

    if 'settings' not in data['translation']:
        data['translation']['settings'] = {}

    lang_trans = translations.get(lang_code, en_fallback)

    for k, v in lang_trans.items():
        data['translation']['settings'][k] = v

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Finished syncing settings translations across all language files!")
