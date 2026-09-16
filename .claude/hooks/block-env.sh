#!/usr/bin/env bash

input=$(cat)

decision=$(echo "$input" | jq -r '
  if (.tool_name == "Read" and (.tool_input.file_path // "" | test("\\.env$")))
  or (.tool_name == "Bash" and (.tool_input.command // "" | test("\\.env")))
  then "block" else "allow" end
')

if [ "$decision" = "block" ]; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Este archivo no lo puedes leer"}}'
  exit 2
fi

exit 0
