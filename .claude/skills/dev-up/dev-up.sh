#!/usr/bin/env bash
# dev-up — 워크트리끼리 포트를 다투지 않는 Expo 개발 서버 실행기.
#
# 왜 있는가. 워크트리를 여러 개 띄우면 전부 8081 을 원한다. 그런데 포트가 차 있을 때
# `expo start` 는 다음 포트로 넘어가는 것이 아니라 "Use port N instead?" 를 **대화형으로
# 묻는다** (@expo/cli utils/port.js `choosePortAsync`). TTY 가 없는 백그라운드 실행에서는
# 경고 한 줄만 남기고 null 을 돌려 명령이 조용히 중단된다 — 서버가 안 뜬 채로.
#
# 해법은 `--port 0` 이다. 그 경우에만 Expo 는 RCT_METRO_PORT 부터 위로 바인드 테스트를
# 하며 빈 포트를 잡고, 묻지 않는다 (utils/port.js 의 `port === 0` 분기). 미리 빈 포트를
# 찾아 `--port N` 으로 넘기는 방식은 쓰지 않는다 — 찾은 순간과 묶는 순간 사이에 다른
# 워크트리가 채가면 위의 프롬프트로 되돌아가기 때문이다. 스캔은 커널에 바인딩하는 마지막
# 순간에 Expo 가 하게 두고, 우리는 결과만 읽는다.
#
# 결과를 읽는 곳은 stdout 이 아니다. 비 TTY 로 띄운 `expo start` 는 stdout 에 아무것도
# 쓰지 않는다. 대신 Expo 는 TTY 여부와 무관하게 `.expo/dev/logs/start.log` 에 JSONL 을
# 남기고, 거기 `{"_e":"metro:instantiate",...,"port":8081}` 이 있다. 띄우기 전에 그 파일의
# 크기를 기록해 두었다가 그 뒤만 읽으면 이번 실행의 이벤트만 본다.
#
# 사용법:
#   dev-up.sh              # 빈 포트에 띄우고 준비될 때까지 기다린다
#   dev-up.sh --print      # 띄우지 않고 예상 주소만 출력
#   dev-up.sh --port 8082  # 그 포트만 시도하고, 차 있으면 실패 (iOS 개발 빌드용)
#   dev-up.sh --detach     # 준비되면 스크립트만 빠져나온다 (뒷정리는 호출자 책임)
#   dev-up.sh --warm       # 뜬 뒤 웹 번들을 한 번 당겨 첫 로딩 대기를 앞당긴다
#
# 환경변수: PORT_BASE (기본 8081), MAX_WORKERS (기본값 유지 권장)
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "error: git 저장소 안에서 실행해야 합니다" >&2; exit 1
}
cd "$ROOT"

PORT_BASE="${PORT_BASE:-8081}"
PORT_SPAN=20
MODE=launch
FIXED_PORT=""
DETACH=0
WARM=0

while [ $# -gt 0 ]; do
  case "$1" in
    --print)  MODE=print; shift ;;
    --detach) DETACH=1; shift ;;
    --warm)   WARM=1; shift ;;
    --port)   FIXED_PORT="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "error: 알 수 없는 인자: $1" >&2; exit 1 ;;
  esac
done

LOG="$ROOT/.claude/dev-up.log"
EVENTS="$ROOT/.expo/dev/logs/start.log"

say() { printf 'dev-up  %s\n' "$*"; }
warn() { printf 'dev-up  %s\n' "$*" >&2; }

# 포트를 쓰고 있으면 점유자 PID 를, 아니면 빈 문자열을 돌려준다.
#
# lsof 에 `-a` 가 없으면 `-p` 와 `-i` 가 OR 로 묶여 무관한 포트까지 딸려 나온다. 여기서는
# `-a` 를 쓸 자리가 아니지만(조건이 하나뿐) 아래 holder_cwd 에서는 반드시 필요하다.
# 비루트 lsof 는 남의 사용자 소켓을 못 보므로 nc 로 한 번 더 두드려, 둘 중 하나라도
# 걸리면 사용 중으로 친다. Expo 는 `::` 에 바인딩하므로 IPv4 루프백 connect 만으로는
# 부족하다 — lsof 쪽이 주 신호이고 nc 는 보조다.
port_holder() {
  local p="$1" pid
  pid="$(lsof -nP -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)"
  if [ -n "$pid" ]; then echo "$pid"; return 0; fi
  if nc -z 127.0.0.1 "$p" >/dev/null 2>&1; then echo "?"; return 0; fi
  echo ""
}

holder_cwd() { lsof -a -d cwd -p "$1" -Fn 2>/dev/null | sed -n 's/^n//p' | head -1; }

# 점유자를 셋으로 나눠 한 줄로 알린다. 절대 죽이지 않는다 — 지금 8081·8082 를 잡고 있는
# 서버가 둘 다 정상이었던 것처럼, "내 것이 아니면 죽인다"는 규칙은 쓰고 있는 서버를 죽인다.
describe_holder() {
  local p="$1" pid="$2" cwd http
  if [ "$pid" = "?" ]; then warn "$p busy — 점유자를 확인할 수 없습니다"; return; fi
  cwd="$(holder_cwd "$pid")"
  http="$(curl -s -o /dev/null -w '%{http_code}' -m 2 "http://127.0.0.1:$p/" 2>/dev/null || echo 000)"
  if [ -n "$cwd" ] && [ ! -d "$cwd" ]; then
    warn "$p 을 유령이 잡고 있습니다 — 워크트리가 사라진 프로세스 (pid $pid, $cwd)"
    warn "     정리하려면:  kill $pid"
  elif [ "$http" = "000" ]; then
    warn "$p 을 먹통 프로세스가 잡고 있습니다 (pid $pid, $cwd) — 응답 없음"
    warn "     정리하려면:  kill $pid"
  else
    warn "$p busy — ${cwd:-?} 의 개발 서버 (pid $pid)"
  fi
}

find_free_port() {
  local p="$PORT_BASE" end=$((PORT_BASE + PORT_SPAN)) pid
  while [ "$p" -lt "$end" ]; do
    pid="$(port_holder "$p")"
    if [ -z "$pid" ]; then echo "$p"; return 0; fi
    describe_holder "$p" "$pid"
    p=$((p + 1))
  done
  return 1
}

lan_ip() {
  local iface
  iface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2}')"
  ipconfig getifaddr "${iface:-en0}" 2>/dev/null || ipconfig getifaddr en0 2>/dev/null || true
}

print_addresses() {
  local port="$1" suffix="${2:-}" ip
  ip="$(lan_ip)"
  say "web    -> http://localhost:${port}${suffix}"
  if [ -n "$ip" ]; then
    # 평문 http 는 secure context 가 아니라 폰 브라우저에서 카메라가 죽는다
    # (dev/active/scan-flow-notes.md). https 가 필요하면 --tunnel 뿐이고, 느리다.
    say "lan    -> http://${ip}:${port}   (폰 브라우저 — 카메라는 평문 http 에서 동작하지 않습니다)"
    say "expo   -> exp://${ip}:${port}"
  fi
  say "native -> RCT_METRO_PORT=${port}"
}

# --- 포트 결정 -------------------------------------------------------------

if [ -n "$FIXED_PORT" ]; then
  holder="$(port_holder "$FIXED_PORT")"
  if [ -n "$holder" ]; then
    describe_holder "$FIXED_PORT" "$holder"
    echo "error: $FIXED_PORT 이 사용 중입니다. --port 는 위로 올라가지 않습니다." >&2
    exit 2
  fi
  PORT_GUESS="$FIXED_PORT"
  PORT_BASE="$FIXED_PORT"
else
  PORT_GUESS="$(find_free_port)" || {
    echo "error: ${PORT_BASE}..$((PORT_BASE + PORT_SPAN - 1)) 에 빈 포트가 없습니다" >&2
    exit 2
  }
fi

if [ "$MODE" = print ]; then
  print_addresses "$PORT_GUESS" "   (예상)"
  exit 0
fi

# --- 의존성 ----------------------------------------------------------------

if [ ! -d node_modules/expo ]; then
  if [ -f package-lock.json ]; then
    say "deps   -> npm ci (node_modules 없음)"
    npm ci --no-audit --no-fund >>"$LOG" 2>&1 || { echo "error: npm ci 실패 — $LOG" >&2; exit 1; }
  else
    say "deps   -> npm install (락파일 없음)"
    npm install --no-audit --no-fund >>"$LOG" 2>&1 || { echo "error: npm install 실패 — $LOG" >&2; exit 1; }
  fi
fi

EXPO_BIN="./node_modules/.bin/expo"
[ -x "$EXPO_BIN" ] || EXPO_BIN="npx expo"

# --- 실행 ------------------------------------------------------------------

say "port   -> ${PORT_GUESS} 부터 탐색"

# `--offline` 은 속도 레버가 아니다. 이것이 억제하는 의존성 검사는 이미 await 되지 않는
# 비차단 호출이다. 넣는 이유는 네트워크가 흔들려도 결과가 같기 때문이다.
ARGS=(start --port 0 --offline)
[ -n "${MAX_WORKERS:-}" ] && ARGS+=(--max-workers "$MAX_WORKERS")

export RCT_METRO_PORT="$PORT_GUESS"
export EXPO_NO_TELEMETRY=1

# TTY 면 그대로 넘긴다. Ctrl+C 도 대화형 키(w r j)도 살아 있고, TUI 가 잠시 뒤 자기 주소를
# 직접 찍는다. 여기서 영리하게 굴 이유가 없다.
if [ -t 1 ] && [ "$DETACH" -eq 0 ]; then
  exec $EXPO_BIN "${ARGS[@]}"
fi

# 비 TTY 경로. EXPO_UNSTABLE_HEADLESS 는 env.js 에 @internal 로 표시돼 있다 — Bonjour/mDNS
# 광고를 끄고(서버 N 개가 각자 멀티캐스트할 이유가 없다) 로그를 줄인다. 사람이 보는
# 경로에는 켜지 않는다.
export EXPO_UNSTABLE_HEADLESS=1

mkdir -p "$(dirname "$LOG")"
OFFSET="$(wc -c < "$EVENTS" 2>/dev/null | tr -d ' ' || true)"
OFFSET="${OFFSET:-0}"

$EXPO_BIN "${ARGS[@]}" >>"$LOG" 2>&1 &
EXPO_PID=$!

START_TS=$SECONDS
PORT=""
while [ $((SECONDS - START_TS)) -lt 120 ]; do
  if ! kill -0 "$EXPO_PID" 2>/dev/null; then
    echo "error: expo 가 기동 전에 종료했습니다" >&2
    tail -20 "$LOG" >&2 || true
    echo "이벤트 로그: $EVENTS" >&2
    exit 3
  fi
  if [ -f "$EVENTS" ]; then
    PORT="$(tail -c "+$((OFFSET + 1))" "$EVENTS" 2>/dev/null \
      | grep -o '{"_e":"metro:instantiate"[^}]*}' | tail -1 \
      | sed -n 's/.*"port":\([0-9]*\).*/\1/p' || true)"
    [ -n "$PORT" ] && break
  fi
  sleep 0.3
done

if [ -z "$PORT" ]; then
  echo "error: 기동을 확인하지 못했습니다 (120초)" >&2
  tail -20 "$LOG" >&2 || true
  echo "이벤트 로그: $EVENTS" >&2
  kill "$EXPO_PID" 2>/dev/null || true
  exit 4
fi

# `/` 는 web.output: 'single' 의 정적 SPA 껍데기라 번들을 강제하지 않는다 — 싸다.
while [ $((SECONDS - START_TS)) -lt 120 ]; do
  curl -sf -o /dev/null -m 2 "http://127.0.0.1:$PORT/" && break
  kill -0 "$EXPO_PID" 2>/dev/null || { echo "error: expo 가 종료했습니다" >&2; exit 3; }
  sleep 0.3
done

print_addresses "$PORT"
say "log    -> $LOG"
say "ready  ($((SECONDS - START_TS))s)"

if [ "$WARM" -eq 1 ]; then
  say "warm   -> 웹 번들 미리 생성 중"
  curl -s -o /dev/null -m 300 "http://127.0.0.1:$PORT/index.bundle?platform=web&dev=true" || true
  say "warm   -> 완료"
fi

if [ "$DETACH" -eq 1 ]; then
  say "detach -> pid $EXPO_PID (종료는 직접: kill $EXPO_PID)"
  exit 0
fi

# 스크립트가 포그라운드에 남는 것은 의도된 것이다 — 이 태스크를 죽이면 서버도 같이 죽어
# 고아가 남지 않는다. 삭제된 워크트리의 서버가 포트를 붙잡고 있던 것이 정확히 그 실패다.
cleanup() { kill 0 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$EXPO_PID"
