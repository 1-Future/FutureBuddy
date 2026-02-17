#!/usr/bin/env bash
# FutureBuddy Voice Command Test Checklist
# Space = toggle, q = quit & save, arrow keys = navigate

SAVE_FILE="/home/z/FutureBuddy/.test-results.txt"

items=(
  "VOICE CONTROL"
  "  listen on (via JS/settings)"
  "  listen off / stop listening"
  ""
  "GRID"
  "  show grid / grid on"
  "  hide grid / grid off"
  "  grid 3x3 through grid 10x10 (resize)"
  "  Grid numbers visible (green, centered, outlined)"
  "  Sub-cell letters visible (cyan, outlined, a-f)"
  "  Tap radius dots visible on grid"
  "  Say a number (e.g. 3) - taps center of cell"
  "  Say number+letter (e.g. 3a) - taps sub-cell"
  "  Number words work (three a)"
  "  Phonetic alphabet works (three alpha)"
  ""
  "FLASHLIGHT"
  "  flashlight on / torch on"
  "  flashlight off / torch off"
  ""
  "SOUND"
  "  sound on / unmute"
  "  sound vibrate"
  "  sound off / mute / silent"
  ""
  "ROTATION"
  "  auto rotate on"
  "  auto rotate off"
  "  rotate vertical / portrait"
  "  rotate horizontal / landscape"
  ""
  "DARK/LIGHT MODE"
  "  dark mode / dark theme"
  "  light mode / light theme"
  ""
  "BRIGHTNESS"
  "  brightness 50 (any number 1-100)"
  "  dim screen (down 10%)"
  "  brighten screen / brighter (up 10%)"
  ""
  "AIRPLANE MODE"
  "  airplane mode / flight mode"
  ""
  "NOTIFICATIONS"
  "  notifications / notifs"
  "  clear notifications / clear all"
  ""
  "SETTINGS"
  "  settings / open settings"
  ""
  "QUICK SETTINGS TILES"
  "  wifi on / wifi off"
  "  mobile hotspot on / off"
  "  power saving on / off"
  "  location on / off"
  "  do not disturb on / dnd off"
  "  eye comfort shield on / off"
  "  wifi calling on / off"
  "  quick share on / off"
  "  wireless dex on / off"
  "  link to windows on / off"
  "  multi control on / off"
  "  screen recorder on / off"
  ""
  "SYSTEM NAVIGATION"
  "  go back / back"
  "  go home / home"
  "  active apps / recent apps"
  ""
  "MAPS NAVIGATION"
  "  navigate to [address]"
  "  take me to [address]"
  "  directions to [address]"
  "  gps / maps / google maps"
  ""
  "APPS"
  "  open [app name]"
  "  close [app name]"
  "  delete / uninstall [app name]"
  "  add [app] to home screen"
  "  remove [app] from home screen"
  ""
  "APP LAUNCHES"
  "  camera / take a photo"
  "  voice memo / voice record"
  "  secure folder"
  "  scan qr code"
  "  interpreter / translator"
  "  record video on / off"
  ""
  "PLAY STORE"
  "  search play store for [app name]"
  ""
  "SPEECH DISPLAY"
  "  Listening bar shows at top"
  "  Live speech text appears as you talk"
  "  Text stays 3 seconds after recognition"
  "  No beeping sounds while active"
)

declare -A status
# Load saved results
if [[ -f "$SAVE_FILE" ]]; then
  while IFS='|' read -r idx st; do
    status[$idx]="$st"
  done < "$SAVE_FILE"
fi

cur=0
total=${#items[@]}

# Find first testable item
is_header() {
  local s="${items[$1]}"
  [[ -z "$s" || "$s" == "${s## }" ]]
}

next_testable() {
  local i=$(( $1 + 1 ))
  while (( i < total )) && is_header "$i"; do (( i++ )); done
  (( i < total )) && echo "$i" || echo "$1"
}

prev_testable() {
  local i=$(( $1 - 1 ))
  while (( i >= 0 )) && is_header "$i"; do (( i-- )); done
  (( i >= 0 )) && echo "$i" || echo "$1"
}

# Start at first testable
while is_header "$cur" && (( cur < total )); do (( cur++ )); done

save() {
  > "$SAVE_FILE"
  for i in "${!status[@]}"; do
    echo "${i}|${status[$i]}" >> "$SAVE_FILE"
  done
}

draw() {
  clear
  echo -e "\033[1;36m  FutureBuddy Voice Command Test Checklist\033[0m"
  echo -e "\033[90m  Space=toggle  ↑↓=navigate  p=pass  f=fail  r=reset  q=quit & save\033[0m"
  echo ""

  local start=$(( cur - 15 ))
  (( start < 0 )) && start=0
  local end=$(( start + 35 ))
  (( end > total )) && end=$total

  for (( i=start; i<end; i++ )); do
    local line="${items[$i]}"
    if [[ -z "$line" ]]; then
      echo ""
    elif is_header "$i"; then
      echo -e "\033[1;33m  $line\033[0m"
    else
      local mark=" "
      local color="\033[0m"
      local st="${status[$i]:-untested}"
      if [[ "$st" == "pass" ]]; then
        mark="✓"
        color="\033[32m"
      elif [[ "$st" == "fail" ]]; then
        mark="✗"
        color="\033[31m"
      fi

      if (( i == cur )); then
        echo -e "\033[7m ${color}[$mark]${line}\033[0m"
      else
        echo -e " ${color}[$mark]${line}\033[0m"
      fi
    fi
  done

  # Summary
  local passed=0 failed=0 untested=0
  for (( i=0; i<total; i++ )); do
    is_header "$i" && continue
    case "${status[$i]:-untested}" in
      pass) (( passed++ )) ;;
      fail) (( failed++ )) ;;
      *) (( untested++ )) ;;
    esac
  done
  echo ""
  echo -e "  \033[32m✓ $passed passed\033[0m  \033[31m✗ $failed failed\033[0m  \033[90m○ $untested untested\033[0m"
}

# Main loop
stty -echo
trap 'stty echo; save; exit' EXIT

while true; do
  draw
  IFS= read -rsn1 key
  case "$key" in
    q|Q) save; exit 0 ;;
    ' ')
      if ! is_header "$cur"; then
        case "${status[$cur]:-untested}" in
          untested|fail) status[$cur]="pass" ;;
          pass) status[$cur]="fail" ;;
        esac
      fi
      ;;
    p|P)
      is_header "$cur" || status[$cur]="pass"
      cur=$(next_testable "$cur")
      ;;
    f|F)
      is_header "$cur" || status[$cur]="fail"
      cur=$(next_testable "$cur")
      ;;
    r|R) is_header "$cur" || unset 'status[$cur]' ;;
    $'\x1b')
      read -rsn2 arrow
      case "$arrow" in
        '[A') cur=$(prev_testable "$cur") ;;
        '[B') cur=$(next_testable "$cur") ;;
      esac
      ;;
  esac
done
