import { homedir } from 'os'

export const SCAN_ROOT = homedir()

export const TRAVERSE_PRUNE_DIRS = [
  'node_modules',
  '.git',
  'Library',
  '.Trash',
  'Pictures',
  'Movies',
  'Music',
  '.pub-cache',
  'fvm',
  'DerivedData',
  '.npm',
  '.cargo',
  '.gradle',
  'build',
  'target',
] as const

export const RESULT_EXCLUDE_PATTERNS = [
  '.pub-cache',
  'fvm',
  'node_modules',
  '.Trash',
] as const

export const PROJECT_MARKERS = {
  node: ['package.json'],
  java: ['build.gradle', 'build.gradle.kts', 'pom.xml'],
  rust: ['Cargo.toml'],
  flutter: ['pubspec.yaml'],
  python: ['pyproject.toml', 'setup.py'],
  go: ['go.mod'],
} as const

export type ProjectStack = keyof typeof PROJECT_MARKERS

export const ALL_PROJECT_MARKER_FILES = [
  ...new Set(Object.values(PROJECT_MARKERS).flat()),
] as string[]

/** Cache directory names discovered in one batched find during scan init. */
export const ALL_CACHE_DIR_NAMES = [
  'dist',
  'coverage',
  '.parcel-cache',
  '.turbo',
  '.venv',
  'venv',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.tox',
  '.next',
  '.nuxt',
  '.vite',
  '.angular',
  '__pycache__',
] as const
