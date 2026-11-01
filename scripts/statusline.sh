#!/usr/bin/env bash
# Claude Code status line. Reads session JSON on stdin and prints up to three lines:
#   1. Flipside build position from docs/features.json (only when the ledger exists)
#   2. model, context bar, cost, time, rate limits
#   3. git branch, lines changed, directory, agent or worktree
# Styled after kcchien/claude-code-statusline (MIT); written from its documented behaviour.
# Env: CLAUDE_STATUSLINE_ASCII=1 forces plain ASCII; CLAUDE_STATUSLINE_NERDFONT=1 adds Nerd Font
# icons; CLAUDE_STATUSLINE_POWERLINE=1 uses arrow separators (defaults to following NERDFONT).
input=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  printf '\033[90mstatusline: jq not found\033[0m\n'
  exit 0
fi

# Rendering tier: truecolor, 256-colour, or ASCII (no colour, no unicode).
tier=256
case "${COLORTERM:-}" in truecolor | 24bit) tier=true ;; esac
[ "${CLAUDE_STATUSLINE_ASCII:-0}" = 1 ] && tier=ascii
nerd=${CLAUDE_STATUSLINE_NERDFONT:-0}
power=${CLAUDE_STATUSLINE_POWERLINE:-$nerd}

RST=$'\033[0m'
DIM=$'\033[2m'
fg() { # fg R G B  (256-colour approximation when truecolor is off)
  case $tier in
    true) printf '\033[38;2;%s;%s;%sm' "$1" "$2" "$3" ;;
    256) printf '\033[38;5;%sm' "$(((16 + 36 * ($1 * 5 / 255) + 6 * ($2 * 5 / 255) + ($3 * 5 / 255))))" ;;
  esac
}
paint() { # paint "<colour>" text
  if [ $tier = ascii ]; then printf '%s' "$2"; else printf '%s%s%s' "$1" "$2" "$RST"; fi
}
PURPLE=$(fg 114 102 234)
GREEN=$(fg 80 200 120)
YELLOW=$(fg 235 200 70)
RED=$(fg 235 85 85)
GRAY=$(fg 140 140 150)
CYAN=$(fg 90 190 220)

if [ $tier = ascii ]; then
  FULL='#' EMPTY='-' BRAND='*' SEP=' | ' WARN='!'
else
  FULL='█' EMPTY='░' BRAND='◆' SEP=" ${DIM}·${RST} " WARN='⚠'
  [ "$power" = 1 ] && SEP=" ${DIM}${RST} "
fi
icon() { [ "$nerd" = 1 ] && [ $tier != ascii ] && printf '%s ' "$1"; }

# Green below 50%, yellow below 80%, red above.
level_colour() {
  if [ "$1" -ge 80 ]; then printf '%s' "$RED"; elif [ "$1" -ge 50 ]; then printf '%s' "$YELLOW"; else printf '%s' "$GREEN"; fi
}
bar() { # bar <percent> <width>
  local pct=$1 width=$2 full i out=""
  full=$((pct * width / 100))
  [ "$full" -gt "$width" ] && full=$width
  for ((i = 0; i < width; i++)); do
    if [ $i -lt $full ]; then out+="$FULL"; else out+="$EMPTY"; fi
  done
  paint "$(level_colour "$pct")" "$out"
}
join() { # join parts with the separator, skipping empties
  local out="" p
  for p in "$@"; do
    [ -z "$p" ] && continue
    if [ -z "$out" ]; then out=$p; else out+="$SEP$p"; fi
  done
  printf '%s' "$out"
}
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }

dir=$(jq -r '.workspace.project_dir // .workspace.current_dir // .cwd // "."' <<<"$input")

# ---- Line 1: Flipside build position (kept from the original status line) ----
ledger="$dir/docs/features.json"
if [ -f "$ledger" ]; then
  fs=$(jq -r '
    .features as $all
    | ($all | map(select(.status == "in_progress")) | first) as $f
    | ($all | map(select(.status == "done")) | length) as $fd
    | if $f == null then "idle\t0\t0\t\(.features | length)\t\($fd)\tno feature in progress"
      else
        ($f.tasks | map(select(.status == "done")) | length) as $done
        | ($f.tasks | length) as $total
        | ($f.tasks | map(select(.status != "done")) | first) as $next
        | (if $f.pr != null then "merging"
           elif $next != null then "building \($next.id) \($next.title)"
           else "feature gate" end) as $stage
        | "\($f.id) \($f.name)\t\($done)\t\($total)\t\($all | length)\t\($fd)\t\($stage)"
      end' "$ledger" 2>/dev/null)
  if [ -n "$fs" ]; then
    IFS=$'\t' read -r label done total feats featsdone stage <<<"$fs"
    if [ "$label" = idle ]; then
      line1="$(paint "$PURPLE" "$BRAND") $(paint "$PURPLE" Flipside) $(paint "$GRAY" "$featsdone/$feats features done")$SEP$(paint "$GRAY" "$stage")"
    else
      pct=0
      [ "$total" -gt 0 ] && pct=$((done * 100 / total))
      line1="$(paint "$PURPLE" "$BRAND") $(paint "$PURPLE" "$label") $(bar "$pct" 10) $done/$total$SEP$stage${SEP}features $featsdone/$feats"
    fi
    printf '%s\n' "$line1"
  fi
fi

# ---- Line 2: model, context, cost, time, rate limits ----
read -r model ctxpct ctxsize cost ms r5 r7 < <(jq -r '
  [ (.model.display_name // "Claude"),
    (.context_window.used_percentage // 0 | floor),
    (.context_window.context_window_size // 0),
    (.cost.total_cost_usd // 0),
    (.cost.total_duration_ms // 0),
    (.rate_limits.five_hour.used_percentage // -1 | floor),
    (.rate_limits.seven_day.used_percentage // -1 | floor)
  ] | map(tostring | gsub(" "; "_")) | join(" ")' <<<"$input")
model=${model//_/ }

ctxlabel=""
if [ "${ctxsize:-0}" -ge 1000000 ] 2>/dev/null; then ctxlabel="1M"; elif [ "${ctxsize:-0}" -ge 1000 ] 2>/dev/null; then ctxlabel="$((ctxsize / 1000))k"; fi
case "$model" in *1M* | *200k*) ctxlabel="" ;; esac # model name already says it

ctx="$(bar "$ctxpct" 10) ${ctxpct}%"
[ -n "$ctxlabel" ] && ctx+=" $(paint "$GRAY" "$ctxlabel")"
[ "$ctxpct" -ge 90 ] && ctx+=" $(paint "$RED" "$WARN")"

costtxt=$(printf '$%.2f' "$cost")
if awk "BEGIN{exit !($cost > 10)}"; then costc=$RED; elif awk "BEGIN{exit !($cost > 0)}"; then costc=$YELLOW; else costc=$GRAY; fi

mins=$((${ms%.*} / 60000))
timetxt=""
if [ "$mins" -ge 60 ]; then timetxt="$((mins / 60))h$((mins % 60))m"; elif [ "$mins" -gt 0 ]; then timetxt="${mins}m"; fi

rate=""
for pair in "5h:$r5" "7d:$r7"; do
  [ "${pair#*:}" -ge 0 ] 2>/dev/null || continue
  p=${pair#*:}
  [ "$p" -ge 80 ] && c=$RED || c=$GRAY
  rate+="${rate:+ }$(paint "$c" "${pair%%:*} ${p}%")"
done

line2=$(join \
  "$(paint "$PURPLE" "$BRAND") $(icon '')$model" \
  "$ctx" \
  "$(paint "$costc" "$costtxt")" \
  "$([ -n "$timetxt" ] && paint "$GRAY" "$timetxt")" \
  "$rate")
printf '%s\n' "$line2"

# ---- Line 3: git, lines changed, directory, agent or worktree ----
cwd=$(jq -r '.workspace.current_dir // .cwd // "."' <<<"$input")
git_part=""
if git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
  # Dirty check is cached for 5 seconds per directory so redraws stay cheap.
  key=$(printf '%s' "$cwd" | cksum | cut -d' ' -f1)
  cache="${TMPDIR:-/tmp}/claude-statusline-git-$key"
  now=$(date +%s)
  if [ -f "$cache" ] && [ $((now - $(mtime "$cache"))) -lt 5 ]; then
    dirty=$(<"$cache")
  else
    if [ -n "$(git -C "$cwd" status --porcelain 2>/dev/null | head -n1)" ]; then dirty='*'; else dirty=''; fi
    printf '%s' "$dirty" >"$cache" 2>/dev/null
  fi
  git_part="$(icon '')$(paint "$CYAN" "$branch$dirty")"
fi

read -r added removed agent wt < <(jq -r '
  [ (.cost.total_lines_added // 0), (.cost.total_lines_removed // 0),
    (.agent.name // "-"), (.worktree.name // "-") ] | map(tostring | gsub(" "; "_")) | join(" ")' <<<"$input")
lines=""
[ "$added" -gt 0 ] && lines+="$(paint "$GREEN" "+$added")"
[ "$removed" -gt 0 ] && lines+="${lines:+ }$(paint "$RED" "-$removed")"

who=""
[ "$agent" != "-" ] && who="$(paint "$YELLOW" "⚙ ${agent//_/ }")"
[ "$wt" != "-" ] && who="${who:+$who }$(paint "$YELLOW" "⚙ worktree:${wt//_/ }")"
[ $tier = ascii ] && who=${who//⚙/@}

line3=$(join "$git_part" "$lines" "$(paint "$GRAY" "$(basename "$cwd")")" "$who")
[ -n "$line3" ] && printf '%s\n' "$line3"
exit 0
