#!/usr/bin/env bash
# Проброс Metro с ноутбука на телефон через USB (обходит VPN и hotspot).
ADB="${ADB:-/c/Users/root/AppData/Local/Android/Sdk/platform-tools/adb.exe}"

if [[ ! -x "$ADB" && ! -f "$ADB" ]]; then
  echo "adb не найден: $ADB"
  echo "Укажите путь: ADB=/path/to/adb.exe npm run adb:reverse"
  exit 1
fi

echo "Устройства:"
"$ADB" devices -l

if ! "$ADB" get-state >/dev/null 2>&1; then
  echo ""
  echo "Телефон не подключён по USB или не включена отладка."
  echo "Настройки → О телефоне → 7× «Номер сборки» → Для разработчиков → Отладка по USB."
  exit 1
fi

"$ADB" reverse tcp:8081 tcp:8081
"$ADB" reverse tcp:19000 tcp:19000
"$ADB" reverse tcp:19001 tcp:19001

echo ""
echo "Готово. В Expo Go на телефоне открой:"
echo "  exp://127.0.0.1:8081"
