BIKEBUDDY - Ride when you want

PAANO GAMITIN SA COMPUTER:
1. I-extract (Extract All) ang ZIP na ito. HUWAG buksan ang index.html habang nasa loob pa ng ZIP.
2. Buksan ang folder na "bikebuddy" na lumabas.
3. I-double click ang index.html (o right click > Open with Live Server sa VS Code).

DEMO ADMIN ACCOUNT:
  Email:    admin@bikebuddy.ph
  Password: admin123

DEMO CUSTOMER ACCOUNT:
  Email:    customer@bikebuddy.ph
  Password: customer123

Pwede ka ring mag-Register ng sarili mong client account.


MGA BAGONG FEATURE
------------------
1. LOADING PAGE - may maangas na BikeBuddy logo (umiikot ang gulong) tuwing bubuksan ang system.
2. NOTIFICATIONS - bell icon sa taas (client at admin). Client: rental confirmed, 10 minuto
   na lang, overdue, naisauli. Admin: bagong rental, nag-return, bagong user, overdue.
3. SETTINGS - Light/Dark mode at English/Tagalog.
   * Naka-save SA ACCOUNT mismo. Hindi nadadamay ang ibang account.
   * Bumabalik lang ang mode/wika kapag ang may-ari ng account ang nag-log in.
   * Kapag walang naka-login (landing/login page), default: Light + English.
4. PANG-CELLPHONE - responsive na (bottom tab bar, bottom-sheet na modal) at pwedeng i-install
   bilang app (PWA).


PAANO BUKSAN SA CELLPHONE
-------------------------
Ang pagbukas ng index.html sa PC ay hindi mabubuksan ng cellphone ng direkta. Dalawang paraan:

A) I-ONLINE (pinakamadali, libre, at pwedeng i-install sa phone)
   1. Pumunta sa https://app.netlify.com/drop
   2. I-drag ang buong folder na "bikebuddy" doon.
   3. Bibigyan ka ng link (https://....netlify.app). Buksan ito sa cellphone.
   4. Android (Chrome): Settings sa app > "Install app"  (o menu ⋮ > Add to Home screen)
      iPhone (Safari): Share > Add to Home Screen

B) SAME WI-FI (pang-test lang)
   1. Sa PC, buksan ang Terminal/CMD sa loob ng folder na "bikebuddy" at i-type:
        python -m http.server 8000
   2. Alamin ang IP ng PC (CMD: ipconfig, hal. 192.168.1.5).
   3. Sa cellphone (same Wi-Fi), buksan: http://192.168.1.5:8000

MAHALAGA: Naka-save ang data (accounts, rentals, bikes) sa browser mismo ng bawat device
(localStorage). Ibig sabihin, ang account na ginawa sa PC ay hindi lalabas sa cellphone, at
ang admin sa PC ay hindi makikita ang rentals na ginawa sa cellphone ng iba. Para
magsabay-sabay ang lahat ng device, kailangan ng totoong database/server (hal. Firebase o
Supabase) - pwede itong idagdag sa susunod.


ARRANGEMENT NG FOLDER (huwag galawin):
  index.html, manifest.webmanifest, sw.js
  css/style.css
  js/i18n.js, storage.js, notifications.js, auth.js, settings.js, client.js, admin.js, app.js
  images/logo.svg, hero-riders.png, icon-192.png, icon-512.png, icon-maskable-512.png
