#!/usr/bin/env bash
# Claude Code status line: build position from the ledger, then session usage. Reads session JSON on stdin.
input=$(cat)
dir=$(jq -r '.workspace.project_dir // .workspace.current_dir // .cwd // "."' <<<"$input")
ledger="$dir/docs/features.json"

if [ -f "$ledger" ]; then
  jq -r '
    def bar($done; $total; $width):
      (if $total > 0 then ($done * $width / $total | floor) else 0 end) as $full
      | ("█" * $full) + ("░" * ($width - $full));
    .features as $all
    | ($all | map(select(.status == "in_progress")) | first) as $f
    | ($all | map(select(.status == "done")) | length) as $features_done
    | if $f == null then
        "Flipside \($features_done)/\($all | length) features done · no feature in progress"
      else
        ($f.tasks | map(select(.status == "done")) | length) as $done
        | ($f.tasks | length) as $total
        | ($f.tasks | map(select(.status != "done")) | first) as $next
        | (if $f.pr != null then "merging"
           elif $next != null then "building \($next.id) \($next.title)"
           else "feature gate" end) as $stage
        | "\($f.id) \($f.name) \(bar($done; $total; 10)) \($done)/\($total) · \($stage) · features \($features_done)/\($all | length)"
      end
  ' "$ledger" 2>/dev/null
fi

jq -r '
  def k: if . >= 1000000 then "\(. / 100000 | floor | . / 10)M"
         elif . >= 1000 then "\(. / 1000 | floor)k"
         else "\(.)" end;
  def elapsed: (. / 60000 | floor) as $m
    | if $m >= 60 then "\($m / 60 | floor)h\($m % 60)m" else "\($m)m" end;
  [ (.model.display_name // empty),
    (.context_window.used_percentage // empty | "context \(floor)%"),
    (.context_window | select(.total_input_tokens != null)
      | "tokens \(.total_input_tokens | k) in, \(.total_output_tokens // 0 | k) out"),
    (.cost.total_duration_ms // empty | "time \(elapsed)")
  ] | join(" · ")
' <<<"$input"
