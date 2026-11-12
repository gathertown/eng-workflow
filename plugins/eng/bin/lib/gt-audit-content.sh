#!/usr/bin/env bash

# Content checks for gt-audit. The caller installs traps and renders findings.

AUDIT_REPOSITORY_CREATED=false
AUDIT_REPOSITORY_DIR=""
AUDIT_REPOSITORY_PARENT=""
AUDIT_GIT_DIR=""
AUDIT_OBJECT_DIR=""
AUDIT_SOURCE_GIT_DIR=""
AUDIT_SOURCE_COMMON_DIR=""
AUDIT_SOURCE_OBJECT_DIR=""
AUDIT_SOURCE_ROOT=""
AUDIT_OBJECT_FORMAT=""
AUDIT_OID_LENGTH=""
AUDIT_ZERO_OID=""
AUDIT_TIMEOUT_COMMAND=""
AUDIT_GIT_EXECUTABLE="${GT_AUDIT_GIT_EXECUTABLE:-git}"
AUDIT_GIT_TIMEOUT_SECONDS="${GT_AUDIT_GIT_TIMEOUT_SECONDS:-5}"
AUDIT_MERGE_CAPABLE=false
AUDIT_MERGE_CAPABILITY_REASON=""
AUDIT_MERGE_BASE=""
AUDIT_CONTENT_REASON=""

audit_create_repository() {
  local source_repository="$1" template_dir object_format

  AUDIT_CONTENT_REASON=""
  audit_find_timeout || return 2
  [[ "$AUDIT_GIT_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]] || {
    AUDIT_CONTENT_REASON="invalid Git timeout"
    return 2
  }

  AUDIT_SOURCE_GIT_DIR="$(_audit_discovery_git "$source_repository" rev-parse --path-format=absolute --absolute-git-dir)" || {
    AUDIT_CONTENT_REASON="source repository unavailable"
    return 2
  }
  AUDIT_SOURCE_COMMON_DIR="$(_audit_discovery_git "$source_repository" rev-parse --path-format=absolute --git-common-dir)" || {
    AUDIT_CONTENT_REASON="source repository unavailable"
    return 2
  }
  AUDIT_SOURCE_OBJECT_DIR="$(_audit_discovery_git "$source_repository" rev-parse --path-format=absolute --git-path objects)" || {
    AUDIT_CONTENT_REASON="source object directory unavailable"
    return 2
  }
  AUDIT_SOURCE_ROOT="$(_audit_discovery_git "$source_repository" rev-parse --show-toplevel)" || {
    AUDIT_CONTENT_REASON="source repository unavailable"
    return 2
  }
  object_format="$(_audit_discovery_git "$source_repository" rev-parse --show-object-format)" || {
    AUDIT_CONTENT_REASON="object format unavailable"
    return 2
  }
  audit_set_object_format "$object_format" || return 2

  mkdir -p "$AUDIT_SOURCE_ROOT/.repo/local/tmp" || {
    AUDIT_CONTENT_REASON="temporary directory unavailable"
    return 2
  }
  AUDIT_REPOSITORY_PARENT="$(cd "$AUDIT_SOURCE_ROOT/.repo/local/tmp" && pwd -P)" || {
    AUDIT_CONTENT_REASON="temporary directory unavailable"
    return 2
  }
  AUDIT_REPOSITORY_DIR="$(mktemp -d "$AUDIT_REPOSITORY_PARENT/gt-audit-content.XXXXXX")" || {
    AUDIT_CONTENT_REASON="temporary repository unavailable"
    return 2
  }
  AUDIT_REPOSITORY_CREATED=true
  AUDIT_GIT_DIR="$AUDIT_REPOSITORY_DIR/repository.git"
  template_dir="$AUDIT_REPOSITORY_DIR/template"
  mkdir "$template_dir" || {
    AUDIT_CONTENT_REASON="temporary repository unavailable"
    return 2
  }

  _audit_discovery_git "$source_repository" init --quiet --bare \
    --template="$template_dir" --object-format="$AUDIT_OBJECT_FORMAT" "$AUDIT_GIT_DIR" || {
    AUDIT_CONTENT_REASON="temporary repository initialization failed"
    return 2
  }
  AUDIT_OBJECT_DIR="$AUDIT_GIT_DIR/objects"

  audit_detect_capabilities
  return 0
}

audit_find_timeout() {
  local candidate version

  for candidate in gtimeout timeout; do
    command -v "$candidate" >/dev/null 2>&1 || continue
    version="$("$candidate" --version 2>/dev/null)" || continue
    [[ "$version" == *"GNU coreutils"* ]] || continue
    AUDIT_TIMEOUT_COMMAND="$(command -v "$candidate")"
    return 0
  done

  AUDIT_CONTENT_REASON="GNU timeout unavailable"
  return 2
}

audit_set_object_format() {
  AUDIT_OBJECT_FORMAT="$1"

  case "$AUDIT_OBJECT_FORMAT" in
  sha1)
    AUDIT_OID_LENGTH=40
    AUDIT_ZERO_OID="0000000000000000000000000000000000000000"
    ;;
  sha256)
    AUDIT_OID_LENGTH=64
    AUDIT_ZERO_OID="0000000000000000000000000000000000000000000000000000000000000000"
    ;;
  *)
    AUDIT_CONTENT_REASON="unsupported object format"
    return 2
    ;;
  esac
}

audit_detect_capabilities() {
  local help_output shallow replacements

  AUDIT_MERGE_CAPABLE=false
  AUDIT_MERGE_CAPABILITY_REASON=""

  shallow="$(audit_source_git rev-parse --is-shallow-repository)" || {
    AUDIT_MERGE_CAPABILITY_REASON="shallow history could not be checked"
    return
  }
  if [[ "$shallow" == "true" ]]; then
    AUDIT_MERGE_CAPABILITY_REASON="shallow history"
    return
  fi

  replacements="$(audit_source_git for-each-ref --format='%(objectname)' refs/replace/)" || {
    AUDIT_MERGE_CAPABILITY_REASON="replacement refs could not be checked"
    return
  }
  if [[ -n "$replacements" || -s "$AUDIT_SOURCE_COMMON_DIR/info/grafts" ]]; then
    AUDIT_MERGE_CAPABILITY_REASON="history substitution"
    return
  fi

  help_output="$(audit_git merge-tree -h 2>&1 || true)"
  if [[ "$help_output" != *"--write-tree"* || "$help_output" != *"--[no-]messages"* ]]; then
    AUDIT_MERGE_CAPABILITY_REASON="merge-tree unavailable"
    return
  fi

  help_output="$(audit_git check-attr -h 2>&1 || true)"
  if [[ "$help_output" != *"--source"* || "$help_output" != *"-z"* ]]; then
    AUDIT_MERGE_CAPABILITY_REASON="committed attribute inspection unavailable"
    return
  fi

  AUDIT_MERGE_CAPABLE=true
}

audit_source_git() {
  _audit_run_git "$AUDIT_SOURCE_GIT_DIR" "$AUDIT_SOURCE_OBJECT_DIR" "" "$@"
}

audit_git() {
  _audit_run_git "$AUDIT_GIT_DIR" "$AUDIT_OBJECT_DIR" "$AUDIT_SOURCE_OBJECT_DIR" "$@"
}

_audit_discovery_git() {
  local source_repository="$1"
  shift

  "$AUDIT_TIMEOUT_COMMAND" --signal=TERM --kill-after=1s "${AUDIT_GIT_TIMEOUT_SECONDS}s" \
    env -i \
    PATH="$PATH" \
    HOME=/dev/null \
    LC_ALL=C \
    GIT_CONFIG_NOSYSTEM=1 \
    GIT_CONFIG_GLOBAL=/dev/null \
    GIT_ATTR_NOSYSTEM=1 \
    GIT_NO_REPLACE_OBJECTS=1 \
    GIT_NO_LAZY_FETCH=1 \
    GIT_OPTIONAL_LOCKS=0 \
    GIT_TERMINAL_PROMPT=0 \
    GIT_PROTOCOL_FROM_USER=0 \
    "$AUDIT_GIT_EXECUTABLE" \
    -c gc.auto=0 \
    -c maintenance.auto=false \
    -c core.attributesFile=/dev/null \
    -c protocol.allow=never \
    -c merge.default=text \
    -c merge.renormalize=false \
    -C "$source_repository" "$@"
}

_audit_run_git() {
  local git_dir="$1" object_dir="$2" alternate_object_dir="$3"
  shift 3

  "$AUDIT_TIMEOUT_COMMAND" --signal=TERM --kill-after=1s "${AUDIT_GIT_TIMEOUT_SECONDS}s" \
    env -i \
    PATH="$PATH" \
    HOME=/dev/null \
    LC_ALL=C \
    GIT_DIR="$git_dir" \
    GIT_OBJECT_DIRECTORY="$object_dir" \
    GIT_ALTERNATE_OBJECT_DIRECTORIES="$alternate_object_dir" \
    GIT_CONFIG_NOSYSTEM=1 \
    GIT_CONFIG_GLOBAL=/dev/null \
    GIT_ATTR_NOSYSTEM=1 \
    GIT_NO_REPLACE_OBJECTS=1 \
    GIT_NO_LAZY_FETCH=1 \
    GIT_OPTIONAL_LOCKS=0 \
    GIT_TERMINAL_PROMPT=0 \
    GIT_PROTOCOL_FROM_USER=0 \
    "$AUDIT_GIT_EXECUTABLE" \
    -c gc.auto=0 \
    -c maintenance.auto=false \
    -c core.attributesFile=/dev/null \
    -c protocol.allow=never \
    -c merge.default=text \
    -c merge.renormalize=false \
    "$@"
}

audit_check_merge_inputs() {
  local old_oid="$1" surviving_oid="$2" merge_bases merge_base_count

  AUDIT_CONTENT_REASON=""
  if [[ "$AUDIT_MERGE_CAPABLE" != "true" ]]; then
    AUDIT_CONTENT_REASON="$AUDIT_MERGE_CAPABILITY_REASON"
    return 2
  fi
  if ! audit_oid_is_valid "$old_oid" || ! audit_oid_is_valid "$surviving_oid"; then
    AUDIT_CONTENT_REASON="invalid object ID"
    return 2
  fi
  audit_git cat-file -e "$old_oid^{commit}" 2>/dev/null || {
    AUDIT_CONTENT_REASON="unavailable object"
    return 2
  }
  audit_git cat-file -e "$surviving_oid^{commit}" 2>/dev/null || {
    AUDIT_CONTENT_REASON="unavailable object"
    return 2
  }

  merge_bases="$(audit_git merge-base --all "$old_oid" "$surviving_oid")"
  case "$?" in
  0) ;;
  1)
    AUDIT_CONTENT_REASON="no merge base"
    return 2
    ;;
  124 | 137)
    AUDIT_CONTENT_REASON="Git timeout"
    return 2
    ;;
  *)
    AUDIT_CONTENT_REASON="merge base unavailable"
    return 2
    ;;
  esac

  merge_base_count="$(printf '%s\n' "$merge_bases" | awk 'NF { count++ } END { print count + 0 }')"
  if [[ "$merge_base_count" -ne 1 ]]; then
    AUDIT_CONTENT_REASON="multiple merge bases"
    return 2
  fi
  AUDIT_MERGE_BASE="$merge_bases"

  audit_check_merge_attributes "$AUDIT_MERGE_BASE" "$old_oid" "$surviving_oid"
}

audit_check_merge_attributes() {
  local merge_base="$1" old_oid="$2" surviving_oid="$3"
  local paths_file attributes_file revision status

  paths_file="$(mktemp "$AUDIT_REPOSITORY_DIR/merge-paths.XXXXXX")" || {
    AUDIT_CONTENT_REASON="temporary file unavailable"
    return 2
  }
  attributes_file="$(mktemp "$AUDIT_REPOSITORY_DIR/merge-attributes.XXXXXX")" || {
    AUDIT_CONTENT_REASON="temporary file unavailable"
    return 2
  }

  audit_git diff-tree --no-commit-id -r -z --name-only --no-renames "$merge_base" "$old_oid" -- >"$paths_file"
  status=$?
  if [[ "$status" -ne 0 ]]; then
    audit_set_git_failure_reason "$status" "changed paths unavailable"
    return 2
  fi
  audit_git diff-tree --no-commit-id -r -z --name-only --no-renames "$merge_base" "$surviving_oid" -- >>"$paths_file"
  status=$?
  if [[ "$status" -ne 0 ]]; then
    audit_set_git_failure_reason "$status" "changed paths unavailable"
    return 2
  fi

  for revision in "$merge_base" "$old_oid" "$surviving_oid"; do
    audit_git check-attr --source="$revision" --stdin -z merge <"$paths_file" >"$attributes_file"
    status=$?
    if [[ "$status" -ne 0 ]]; then
      audit_set_git_failure_reason "$status" "committed attributes unavailable"
      return 2
    fi
    audit_validate_merge_attributes "$attributes_file" || return 2
  done
}

audit_validate_merge_attributes() {
  local attributes_file="$1" _path _attribute value

  while IFS= read -r -d '' _path; do
    IFS= read -r -d '' _attribute || {
      AUDIT_CONTENT_REASON="invalid committed attributes"
      return 2
    }
    IFS= read -r -d '' value || {
      AUDIT_CONTENT_REASON="invalid committed attributes"
      return 2
    }
    case "$value" in
    unspecified | unset | set | text | binary) ;;
    union)
      AUDIT_CONTENT_REASON="union merge driver"
      return 2
      ;;
    *)
      AUDIT_CONTENT_REASON="custom merge driver"
      return 2
      ;;
    esac
  done <"$attributes_file"
}

audit_compare_trees() {
  local old_oid="$1" surviving_oid="$2" old_tree surviving_tree status

  AUDIT_CONTENT_REASON=""
  if ! audit_oid_is_valid "$old_oid" || ! audit_oid_is_valid "$surviving_oid"; then
    AUDIT_CONTENT_REASON="invalid object ID"
    return 2
  fi

  old_tree="$(audit_git rev-parse --verify "$old_oid^{tree}")"
  status=$?
  if [[ "$status" -ne 0 ]]; then
    audit_set_git_failure_reason "$status" "unavailable object"
    return 2
  fi
  surviving_tree="$(audit_git rev-parse --verify "$surviving_oid^{tree}")"
  status=$?
  if [[ "$status" -ne 0 ]]; then
    audit_set_git_failure_reason "$status" "unavailable object"
    return 2
  fi

  if [[ "$old_tree" == "$surviving_tree" ]]; then
    printf 'identical-tree\t%s\n' "$surviving_oid"
    return 0
  fi

  audit_check_merge_inputs "$old_oid" "$surviving_oid" || return 2
  audit_compare_merge "$old_oid" "$surviving_oid"
}

audit_compare_merge() {
  local old_oid="$1" surviving_oid="$2" merged_tree surviving_tree status

  surviving_tree="$(audit_git rev-parse --verify "$surviving_oid^{tree}")"
  status=$?
  if [[ "$status" -ne 0 ]]; then
    audit_set_git_failure_reason "$status" "unavailable object"
    return 2
  fi

  merged_tree="$(audit_git merge-tree --write-tree --no-messages "$surviving_oid" "$old_oid")"
  status=$?
  if [[ "$status" -eq 0 ]]; then
    if ! audit_oid_is_valid "$merged_tree"; then
      AUDIT_CONTENT_REASON="invalid merge result"
      return 2
    fi
    if [[ "$merged_tree" == "$surviving_tree" ]]; then
      printf 'contained-tree\t%s\n' "$surviving_oid"
      return 0
    fi
    AUDIT_CONTENT_REASON="no matching tree"
    return 1
  fi
  if [[ "$status" -eq 1 ]]; then
    AUDIT_CONTENT_REASON="conflict"
    return 1
  fi

  audit_set_git_failure_reason "$status" "merge comparison failed"
  return 2
}

audit_oid_is_valid() {
  local oid="$1"
  [[ "$oid" != "$AUDIT_ZERO_OID" && "${#oid}" -eq "$AUDIT_OID_LENGTH" && "$oid" =~ ^[0-9a-f]+$ ]]
}

audit_set_git_failure_reason() {
  local status="$1" fallback="$2"

  if [[ "$status" -eq 124 || "$status" -eq 137 ]]; then
    AUDIT_CONTENT_REASON="Git timeout"
  else
    AUDIT_CONTENT_REASON="$fallback"
  fi
}

audit_remove_repository() {
  [[ "$AUDIT_REPOSITORY_CREATED" == "true" ]] || return 0
  [[ -n "$AUDIT_REPOSITORY_DIR" && -n "$AUDIT_REPOSITORY_PARENT" ]] || return 2

  case "$AUDIT_REPOSITORY_DIR" in
  "$AUDIT_REPOSITORY_PARENT"/gt-audit-content.*) ;;
  *)
    AUDIT_CONTENT_REASON="refused unsafe temporary repository path"
    : "$AUDIT_CONTENT_REASON"
    return 2
    ;;
  esac

  rm -rf -- "$AUDIT_REPOSITORY_DIR" || return 2
  AUDIT_REPOSITORY_CREATED=false
  AUDIT_REPOSITORY_DIR=""
  AUDIT_GIT_DIR=""
  AUDIT_OBJECT_DIR=""
}

audit_patch_ids() {
  local oids="$1" output="$2"

  audit_git diff-tree --stdin -p --no-renames <"$oids" |
    audit_git patch-id --stable >"$output"
}

# Prints the surviving commit whose patch matches the first candidate, and fails when any candidate
# has no match.
audit_match_patch_ids() {
  local candidate_oids="$1" surviving_oids="$2" prefix="$3"
  local candidates="$prefix.candidates" candidate_patches="$prefix.candidate-patches"
  local surviving_patches="$prefix.surviving-patches" matches="$prefix.matches"

  AUDIT_CONTENT_REASON=""
  [[ -s "$candidate_oids" && -s "$surviving_oids" ]] || return 1
  awk '!seen[$0]++' "$candidate_oids" >"$candidates"

  audit_patch_ids "$candidates" "$candidate_patches" || return 1
  audit_patch_ids "$surviving_oids" "$surviving_patches" || return 1

  awk '
    FNR == NR {
      if (!($1 in surviving)) surviving[$1] = $2
      next
    }
    ($1 in surviving) { print $2 "\t" surviving[$1] }
  ' "$surviving_patches" "$candidate_patches" >"$matches"

  # A root commit produces no patch, so it never matches and the caller falls back to the merge
  # comparison.
  [[ "$(awk 'END { print NR }' "$matches")" -eq "$(awk 'END { print NR }' "$candidates")" ]] ||
    return 1
  awk -F'\t' -v tip="$(head -n 1 "$candidates")" '$1 == tip { print $2; exit }' "$matches"
}
