import * as fs from 'fs';
import * as path from 'path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

type FailureRecord = {
  test: TestCase;
  result: TestResult;
};

type CatalogStatus = 'passed' | 'failed' | 'timedOut';

type CatalogRow = {
  suite: string;
  title: string;
  file: string;
  status: CatalogStatus;
  lastRun: string;
};

const CATALOG_PATH = path.resolve(__dirname, '../../docs/test-catalog.md');
const CATALOG_HEADER = [
  '# Catalogo de testes',
  '',
  'Gerado automaticamente pelo reporter (`src/reporters/console.reporter.ts`) apos cada execucao que valida (roda) o teste — nao editar manualmente, o conteudo e mesclado a cada corrida de `npm test` ou de qualquer script `test:*`.',
  '',
  '| Suite | Teste | Arquivo | Status | Ultima execucao |',
  '|---|---|---|---|---|',
].join('\n');

function catalogKey(row: Pick<CatalogRow, 'file' | 'suite' | 'title'>): string {
  return `${row.file}::${row.suite}::${row.title}`;
}

function statusBadge(status: CatalogStatus): string {
  switch (status) {
    case 'passed':
      return '✅ passou';
    case 'failed':
      return '❌ falhou';
    case 'timedOut':
      return '⏰ timeout';
  }
}

function parseStatusBadge(badge: string): CatalogStatus {
  if (badge.includes('✅')) return 'passed';
  if (badge.includes('⏰')) return 'timedOut';
  return 'failed';
}

function loadCatalog(): Map<string, CatalogRow> {
  const map = new Map<string, CatalogRow>();
  if (!fs.existsSync(CATALOG_PATH)) return map;

  const content = fs.readFileSync(CATALOG_PATH, 'utf8');
  const rows = content
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.startsWith('|---') && !line.includes('| Suite |'));

  for (const line of rows) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [suite, title, file, status, lastRun] = cells;
    if (!suite || !title) continue;
    const row: CatalogRow = { suite, title, file, status: parseStatusBadge(status), lastRun };
    map.set(catalogKey(row), row);
  }
  return map;
}

function saveCatalog(map: Map<string, CatalogRow>): void {
  const rows = [...map.values()].sort(
    (a, b) => a.file.localeCompare(b.file) || a.title.localeCompare(b.title),
  );
  const lines = rows.map(
    (r) => `| ${r.suite} | ${r.title} | ${r.file} | ${statusBadge(r.status)} | ${r.lastRun} |`,
  );
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
  fs.writeFileSync(CATALOG_PATH, `${CATALOG_HEADER}\n${lines.join('\n')}\n`);
}

const BUGS_INDEX_PATH = path.resolve(__dirname, '../../docs/bugs-index.md');

/**
 * Maps each .spec.ts file mentioned in an OPEN bug's "Teste(s)" column to the
 * bug ID(s) that reference it. Granularity is per-file, not per-test-title,
 * because that column is free text (e.g. "pagination.spec.ts (3 testes)") —
 * matching by file name is what's actually parseable there.
 */
function loadOpenBugFileMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!fs.existsSync(BUGS_INDEX_PATH)) return map;

  const content = fs.readFileSync(BUGS_INDEX_PATH, 'utf8');
  const rows = content.split('\n').filter((line) => /^\|\s*BUG-\d+\s*\|/.test(line));

  for (const line of rows) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [id, , , status, testes] = cells;
    if (!id || status.includes('✅')) continue;

    const files = [...(testes ?? '').matchAll(/`([\w.-]+\.spec\.ts)`/g)].map((m) => m[1]);
    for (const file of files) {
      const bugIds = map.get(file) ?? [];
      bugIds.push(id);
      map.set(file, bugIds);
    }
  }
  return map;
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function countTests(suite: Suite): number {
  let count = suite.tests.length;
  for (const child of suite.suites) {
    count += countTests(child);
  }
  return count;
}

class ConsoleReporter implements Reporter {
  private currentSuite = '';
  private failures: FailureRecord[] = [];
  private catalogUpdates: CatalogRow[] = [];
  private passed = 0;
  private failed = 0;
  private timedOut = 0;
  private skipped = 0;
  private total = 0;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.total = countTests(suite);
    const title = '__PROJECT_NAME__';
    const summary = `${this.total} testes encontrados`;
    const width = Math.max(title.length, summary.length) + 4;

    const top = `╔${'═'.repeat(width)}╗`;
    const mid1 = `║  ${title.padEnd(width - 2)}║`;
    const mid2 = `║  ${summary.padEnd(width - 2)}║`;
    const bot = `╚${'═'.repeat(width)}╝`;

    console.log();
    console.log(`${c.cyan}${c.bold}${top}${c.reset}`);
    console.log(`${c.cyan}${c.bold}${mid1}${c.reset}`);
    console.log(`${c.cyan}${c.bold}${mid2}${c.reset}`);
    console.log(`${c.cyan}${c.bold}${bot}${c.reset}`);
    console.log();
  }

  onTestBegin(test: TestCase): void {
    const suiteTitle = test.parent.title;
    if (suiteTitle && suiteTitle !== this.currentSuite) {
      this.currentSuite = suiteTitle;
      console.log(`  ${c.magenta}${c.bold}▸ ${suiteTitle}${c.reset}`);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const duration = formatDuration(result.duration);
    const title = test.title;

    switch (result.status) {
      case 'passed':
        this.passed++;
        console.log(`    ${c.green}✅ ${title}${c.reset} ${c.dim}${duration}${c.reset}`);
        break;
      case 'failed':
        this.failed++;
        console.log(`    ${c.red}${c.bold}❌ ${title}${c.reset} ${c.dim}${duration}${c.reset}`);
        this.failures.push({ test, result });
        break;
      case 'timedOut':
        this.timedOut++;
        console.log(`    ${c.yellow}⏰ ${title}${c.reset} ${c.dim}${duration}${c.reset}`);
        this.failures.push({ test, result });
        break;
      case 'skipped':
        this.skipped++;
        console.log(`    ${c.dim}⏭️  ${title}${c.reset}`);
        break;
    }

    if (result.status === 'passed' || result.status === 'failed' || result.status === 'timedOut') {
      const file = test.location ? path.relative(process.cwd(), test.location.file) : 'unknown';
      this.catalogUpdates.push({
        suite: test.parent.title,
        title,
        file,
        status: result.status,
        lastRun: new Date().toISOString().slice(0, 10),
      });
    }
  }

  onEnd(result: FullResult): void {
    const totalDuration = formatDuration(result.duration);

    if (this.failures.length > 0) {
      this.printFailures();
    }

    this.printSummary(totalDuration);

    if (this.catalogUpdates.length > 0) {
      const previousCatalog = loadCatalog();
      this.printBugRegressionWarnings(previousCatalog);
      for (const row of this.catalogUpdates) {
        previousCatalog.set(catalogKey(row), row);
      }
      saveCatalog(previousCatalog);
    }
  }

  private printBugRegressionWarnings(previousCatalog: Map<string, CatalogRow>): void {
    const bugFileMap = loadOpenBugFileMap();
    if (bugFileMap.size === 0) return;

    const flips: { row: CatalogRow; bugIds: string[] }[] = [];
    for (const row of this.catalogUpdates) {
      if (row.status !== 'passed') continue;
      const previous = previousCatalog.get(catalogKey(row));
      if (previous?.status !== 'failed') continue;

      const bugIds = bugFileMap.get(path.basename(row.file));
      if (bugIds?.length) flips.push({ row, bugIds: [...new Set(bugIds)] });
    }

    if (flips.length === 0) return;

    console.log();
    console.log(
      `${c.yellow}${c.bold}⚠ Possíveis bugs corrigidos — testes que falhavam agora passam:${c.reset}`,
    );
    for (const { row, bugIds } of flips) {
      console.log(
        `  ${c.yellow}${bugIds.join(', ')}${c.reset} — "${row.title}" (${row.file}) passou nesta execução.`,
      );
    }
    console.log(`  ${c.dim}Confirme e atualize docs/bugs-index.md se for uma correção real.${c.reset}`);
    console.log();
  }

  private printFailures(): void {
    const headerText = ' FALHAS DETALHADAS ';
    const headerWidth = 60;
    const padLeft = Math.floor((headerWidth - headerText.length) / 2);
    const padRight = headerWidth - headerText.length - padLeft;

    console.log();
    console.log(`${c.red}${c.bold}┌${'─'.repeat(headerWidth)}┐${c.reset}`);
    console.log(`${c.red}${c.bold}│${'─'.repeat(padLeft)}${headerText}${'─'.repeat(padRight)}│${c.reset}`);
    console.log(`${c.red}${c.bold}└${'─'.repeat(headerWidth)}┘${c.reset}`);

    for (let i = 0; i < this.failures.length; i++) {
      const { test, result } = this.failures[i];
      const location = test.location
        ? `${test.location.file}:${test.location.line}`
        : 'unknown';

      console.log();
      console.log(`  ${c.red}${c.bold}${i + 1}) ${test.title}${c.reset}`);
      console.log(`     ${c.dim}${location}${c.reset}`);

      for (const error of result.errors) {
        if (error.message) {
          const lines = error.message.split('\n').slice(0, 8);
          console.log();
          for (const line of lines) {
            console.log(`     ${c.red}${line}${c.reset}`);
          }
        }
        if (error.snippet) {
          const snippetLines = error.snippet.split('\n').slice(0, 6);
          console.log();
          for (const line of snippetLines) {
            console.log(`     ${c.dim}${line}${c.reset}`);
          }
        }
      }
    }
  }

  private printSummary(totalDuration: string): void {
    const executed = this.passed + this.failed + this.timedOut;
    const allPassed = this.failed === 0 && this.timedOut === 0;

    console.log();
    console.log(`${c.cyan}${c.bold}${'══'.repeat(30)}${c.reset}`);
    console.log(`${c.cyan}${c.bold}  RESULTADO${c.reset}  ${c.dim}${totalDuration}${c.reset}`);
    console.log(`${c.cyan}${c.bold}${'──'.repeat(30)}${c.reset}`);

    if (this.passed > 0) {
      console.log(`  ${c.green}✅ ${this.passed} passou${c.reset}`);
    }
    if (this.failed > 0) {
      console.log(`  ${c.red}❌ ${this.failed} falhou${c.reset}`);
    }
    if (this.timedOut > 0) {
      console.log(`  ${c.yellow}⏰ ${this.timedOut} timeout${c.reset}`);
    }
    if (this.skipped > 0) {
      console.log(`  ${c.dim}⏭️  ${this.skipped} pulados${c.reset}`);
    }

    console.log();
    if (allPassed) {
      console.log(`  ${c.bgGreen}${c.white}${c.bold} PASSOU ${c.reset}  ${c.green}${executed}/${this.total} testes passaram${c.reset}`);
    } else {
      console.log(`  ${c.bgRed}${c.white}${c.bold} FALHOU ${c.reset}  ${c.red}${executed - this.failed - this.timedOut}/${this.total} testes passaram${c.reset}`);
    }
    console.log(`${c.cyan}${c.bold}${'══'.repeat(30)}${c.reset}`);
    console.log();
  }
}

export default ConsoleReporter;
