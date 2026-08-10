#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
GITHUB_DIR="$ROOT_DIR/.github"
AGENTS_DIR="$GITHUB_DIR/agents"
PROMPTS_DIR="$GITHUB_DIR/prompts"
SKILLS_DIR="$GITHUB_DIR/skills"
INSTRUCTIONS_FILE="$GITHUB_DIR/copilot-instructions.md"

errors=0
warnings=0

info() { printf '[INFO] %s\n' "$1"; }
ok() { printf '[OK] %s\n' "$1"; }
warn() { printf '[WARN] %s\n' "$1"; warnings=$((warnings + 1)); }
err() { printf '[ERROR] %s\n' "$1"; errors=$((errors + 1)); }

require_dir() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    ok "Diretorio encontrado: ${dir#$ROOT_DIR/}"
  else
    err "Diretorio ausente: ${dir#$ROOT_DIR/}"
  fi
}

require_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    ok "Arquivo encontrado: ${file#$ROOT_DIR/}"
  else
    err "Arquivo ausente: ${file#$ROOT_DIR/}"
  fi
}

resolve_path() {
  local base_dir="$1"
  local rel_path="$2"

  if command -v realpath >/dev/null 2>&1; then
    (cd "$base_dir" && realpath "$rel_path" 2>/dev/null) || true
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY' "$base_dir" "$rel_path" 2>/dev/null || true
import os
import sys

base = sys.argv[1]
rel = sys.argv[2]
print(os.path.realpath(os.path.join(base, rel)))
PY
    return
  fi

  local rel_dir rel_base
  rel_dir="$(dirname "$rel_path")"
  rel_base="$(basename "$rel_path")"

  (cd "$base_dir" && cd "$rel_dir" 2>/dev/null && printf '%s/%s\n' "$(pwd -P)" "$rel_base") || true
}

check_prompt_links() {
  info "Validando links #file dos prompts"
  local prompt
  local found_any=0

  for prompt in "$PROMPTS_DIR"/*.prompt.md; do
    [[ -e "$prompt" ]] || continue
    found_any=1

    local target_line_count
    target_line_count="$(grep -Ec '^#file:' "$prompt" || true)"
    if [[ "$target_line_count" -eq 0 ]]; then
      err "Prompt sem #file: ${prompt#$ROOT_DIR/}"
      continue
    fi

    if [[ "$target_line_count" -gt 1 ]]; then
      err "Prompt com multiplas linhas #file (esperado: 1): ${prompt#$ROOT_DIR/}"
      continue
    fi

    local target_line
    target_line="$(grep -E '^#file:' "$prompt" || true)"

    local rel_target
    rel_target="${target_line#\#file:}"
    rel_target="${rel_target#"${rel_target%%[![:space:]]*}"}"
    rel_target="${rel_target%"${rel_target##*[![:space:]]}"}"
    local target
    target="$(resolve_path "$(dirname "$prompt")" "$rel_target")"

    if [[ -z "$target" ]]; then
      err "Prompt com #file invalido: ${prompt#$ROOT_DIR/} -> $rel_target"
      continue
    fi

    if [[ -f "$target" ]]; then
      local prompt_base target_base expected_target
      prompt_base="$(basename "$prompt" .prompt.md)"
      target_base="$(basename "$target" .md)"
      expected_target="$AGENTS_DIR/$prompt_base.md"

      if [[ "$target_base" != "$prompt_base" ]]; then
        err "Prompt aponta para agent com nome divergente: ${prompt#$ROOT_DIR/} -> ${target#$ROOT_DIR/} (esperado: ${expected_target#$ROOT_DIR/})"
      else
        ok "Prompt aponta para agent valido: ${prompt#$ROOT_DIR/}"
      fi
    else
      err "Prompt aponta para arquivo inexistente: ${prompt#$ROOT_DIR/} -> $rel_target"
    fi
  done

  if [[ $found_any -eq 0 ]]; then
    warn "Nenhum prompt encontrado em .github/prompts"
  fi
}

check_agent_prompt_pairs() {
  info "Validando paridade agent <-> prompt"
  local agent
  local found_any=0

  for agent in "$AGENTS_DIR"/agent*.md; do
    [[ -e "$agent" ]] || continue
    found_any=1

    local base
    base="$(basename "$agent")"
    local expected_prompt="$PROMPTS_DIR/${base%.md}.prompt.md"

    if [[ -f "$expected_prompt" ]]; then
      ok "Par agent/prompt ok: ${base%.md}"
    else
      err "Prompt faltando para agent: ${agent#$ROOT_DIR/}"
    fi
  done

  if [[ $found_any -eq 0 ]]; then
    err "Nenhum agent encontrado em .github/agents"
  fi
}

check_skill_bundles() {
  info "Validando bundles de skills locais"

  local required_skills=(
    "scaffold-bolton-api-suite"
    "scaffold-bolton-api-suite-pytest"
    "scaffold-bolton-frontend-suite"
  )

  local skill
  for skill in "${required_skills[@]}"; do
    local skill_dir="$SKILLS_DIR/$skill"
    local skill_file="$skill_dir/SKILL.md"
    local templates_dir="$skill_dir/templates"

    if [[ -d "$skill_dir" ]]; then
      ok "Skill encontrada: .github/skills/$skill"
    else
      err "Diretorio da skill ausente: .github/skills/$skill"
      continue
    fi

    if [[ -f "$skill_file" ]]; then
      ok "SKILL.md encontrado: .github/skills/$skill/SKILL.md"
    else
      err "SKILL.md ausente: .github/skills/$skill/SKILL.md"
    fi

    if [[ -d "$templates_dir" ]]; then
      ok "Templates encontrados: .github/skills/$skill/templates"
      local file_count
      file_count="$(find "$templates_dir" -type f | wc -l | tr -d ' ')"
      if [[ "$file_count" -eq 0 ]]; then
        warn "Templates vazios em .github/skills/$skill/templates"
      else
        ok "Templates com arquivos: $file_count"
      fi
    else
      err "Diretorio templates ausente: .github/skills/$skill/templates"
    fi
  done
}

check_routing_mentions() {
  info "Validando roteamento em copilot-instructions"

  if [[ ! -f "$INSTRUCTIONS_FILE" ]]; then
    err "Arquivo ausente: .github/copilot-instructions.md"
    return
  fi

  local agent found_any
  found_any=0

  for agent in "$AGENTS_DIR"/agent*.md; do
    [[ -e "$agent" ]] || continue
    found_any=1

    local base expected_path expected_slash
    base="$(basename "$agent" .md)"
    expected_path=".github/agents/$base.md"
    expected_slash="/$base"

    local row_count
    row_count="$(awk -v p="$expected_path" -v s="$expected_slash" '$0 ~ /^\|/ && index($0, p) && index($0, s) { c++ } END { print c + 0 }' "$INSTRUCTIONS_FILE")"

    if [[ "$row_count" -eq 1 ]]; then
      ok "Tabela referencia arquivo e slash-command do $base na mesma linha"
    elif [[ "$row_count" -eq 0 ]]; then
      err "Tabela nao referencia par esperado na mesma linha: $expected_path + $expected_slash"
    else
      err "Tabela tem entradas duplicadas para: $expected_path + $expected_slash"
    fi
  done

  if [[ $found_any -eq 0 ]]; then
    err "Nenhum agent encontrado para validar roteamento"
  fi

  local routing_rows_found
  routing_rows_found=0

  while IFS= read -r row; do
    local agent_from_path slash_from_row
    agent_from_path=""
    slash_from_row=""

    if [[ "$row" =~ \.github/agents/(agent[0-9]+-[a-z0-9-]+)\.md ]]; then
      agent_from_path="${BASH_REMATCH[1]}"
    fi

    if [[ "$row" =~ /(agent[0-9]+-[a-z0-9-]+) ]]; then
      slash_from_row="/${BASH_REMATCH[1]}"
    fi

    if [[ -z "$agent_from_path" && -z "$slash_from_row" ]]; then
      continue
    fi

    routing_rows_found=1

    if [[ -z "$agent_from_path" || -z "$slash_from_row" ]]; then
      err "Tabela contem linha de roteamento malformada: $row"
      continue
    fi

    local expected_agent_file expected_slash
    expected_agent_file="$AGENTS_DIR/$agent_from_path.md"
    expected_slash="/$agent_from_path"

    if [[ ! -f "$expected_agent_file" ]]; then
      err "Tabela contem entrada obsoleta: .github/agents/$agent_from_path.md"
      continue
    fi

    if [[ "$slash_from_row" != "$expected_slash" ]]; then
      err "Tabela contem linha com slash divergente para $agent_from_path (esperado: $expected_slash, atual: $slash_from_row)"
    fi
  done < <(grep -E '^\|' "$INSTRUCTIONS_FILE")

  if [[ $routing_rows_found -eq 0 ]]; then
    err "Tabela de roteamento nao contem linhas parseaveis de agent em .github/copilot-instructions.md"
  fi
}

check_bug_report_convention() {
  info "Validando convencao de bug-report com tema"

  local legacy_hits
  legacy_hits="$(grep -RIn --include='*.md' 'bug-report-<data>\.md' "$GITHUB_DIR" || true)"

  if [[ -n "$legacy_hits" ]]; then
    err "Encontradas referencias legadas de bug-report sem <tema>"
    while IFS= read -r hit; do
      [[ -n "$hit" ]] || continue
      err "Referencia legada: ${hit#$ROOT_DIR/}"
    done <<< "$legacy_hits"
  else
    ok "Nao ha referencias legadas de bug-report sem <tema>"
  fi

  local required_files=(
    "$INSTRUCTIONS_FILE"
    "$AGENTS_DIR/agent7-gerador-bug-report.md"
    "$GITHUB_DIR/instructions/tests.instructions.md"
    "$SKILLS_DIR/scaffold-bolton-api-suite/templates/COPILOT.md"
    "$SKILLS_DIR/scaffold-bolton-api-suite-pytest/templates/COPILOT.md"
    "$SKILLS_DIR/scaffold-bolton-frontend-suite/templates/COPILOT.md"
  )

  local file
  for file in "${required_files[@]}"; do
    if grep -Fq 'bug-report-<data>-<tema>.md' "$file"; then
      ok "Convencao com tema presente: ${file#$ROOT_DIR/}"
    else
      err "Convencao com tema ausente: ${file#$ROOT_DIR/}"
    fi
  done
}

main() {
  info "Iniciando verificacao de portabilidade do sistema de agentes"

  require_dir "$GITHUB_DIR"
  require_dir "$AGENTS_DIR"
  require_dir "$PROMPTS_DIR"
  require_dir "$SKILLS_DIR"
  require_file "$INSTRUCTIONS_FILE"

  check_prompt_links
  check_agent_prompt_pairs
  check_skill_bundles
  check_routing_mentions
  check_bug_report_convention

  printf '\nResumo: %d erro(s), %d aviso(s).\n' "$errors" "$warnings"

  if [[ $errors -gt 0 ]]; then
    exit 1
  fi

  exit 0
}

main "$@"
