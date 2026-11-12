#!/usr/bin/env node
// Espera a revisão do Codex no commit atual de um PR e lista os achados.
// Uso: node scripts/codex-review.mjs <número do PR> [--timeout=minutos]
// Saída: código 0 sem achados, 1 com achados, 2 em caso de erro ou timeout.
import { execFileSync } from "node:child_process";

const pr = process.argv[2];
if (!pr || !/^\d+$/.test(pr)) {
  console.error("Uso: node scripts/codex-review.mjs <número do PR> [--timeout=minutos]");
  process.exit(2);
}
const timeoutArg = process.argv.find((a) => a.startsWith("--timeout="));
const timeoutMin = timeoutArg ? Number(timeoutArg.split("=")[1]) : 15;
const INTERVAL_MS = 30_000;

const gh = (...args) => JSON.parse(execFileSync("gh", args, { encoding: "utf8" }));
const repo = gh("repo", "view", "--json", "nameWithOwner").nameWithOwner;
const api = (path) => gh("api", "--paginate", "--slurp", `repos/${repo}/${path}`).flat();

const STATE_RE = /<!-- codex-review-state:v1 (\{.*?\}) -->/;
const PRIORITY_RE = /badge\/(P\d)-/;

// O Codex pode revisar o commit do PR ou o commit de merge de teste do GitHub
// (refs/pull/N/merge). Os dois valem como "commit atual".
function currentShas() {
  const p = gh("api", `repos/${repo}/pulls/${pr}`);
  return [p.head.sha, p.merge_commit_sha].filter(Boolean);
}

const isCodex = (c) => c.user?.login?.startsWith("chatgpt-codex-connector");

function reviewState(comments, shas) {
  const summary = comments.findLast((c) => isCodex(c) && STATE_RE.test(c.body ?? ""));
  if (!summary) return null;
  const state = JSON.parse(summary.body.match(STATE_RE)[1]).code_review;
  const sameCommit = state?.commit_sha && shas.includes(state.commit_sha);
  return sameCommit && state.status === "completed" ? state : null;
}

// Aviso de "create an environment" só conta se for mais recente que o último
// pedido de revisão e que o último resumo do Codex.
function setupMissing(comments) {
  const last = comments.at(-1);
  return last && isCodex(last) && last.body?.includes("create an environment") ? last : null;
}

function findings(shas) {
  return api(`pulls/${pr}/comments`)
    .filter((c) => c.body?.includes("codex-code-review-finding") && shas.includes(c.commit_id))
    .map((c) => ({
      priority: c.body.match(PRIORITY_RE)?.[1] ?? "P?",
      file: `${c.path}:${c.line ?? c.original_line ?? "?"}`,
      title: c.body.split("\n")[0].replace(/<[^>]+>|!\[[^\]]*\]\([^)]*\)|\*\*/g, "").trim(),
      url: c.html_url,
    }));
}

const deadline = Date.now() + timeoutMin * 60_000;
const headSha = gh("pr", "view", pr, "--json", "headRefOid").headRefOid;
console.log(`Aguardando a revisão do Codex no PR #${pr} (commit ${headSha.slice(0, 7)})...`);

for (;;) {
  const shas = currentShas();
  const comments = api(`issues/${pr}/comments`).filter((c) => isCodex(c) || c.body?.includes("@codex"));
  const state = reviewState(comments, shas);
  if (state) {
    const list = findings(shas);
    if (list.length === 0) {
      console.log("Codex não encontrou nada.");
      process.exit(0);
    }
    console.log(`Codex encontrou ${list.length} ponto(s):`);
    for (const f of list) console.log(`- [${f.priority}] ${f.file} · ${f.title}\n  ${f.url}`);
    process.exit(1);
  }
  const notice = setupMissing(comments);
  if (notice) {
    console.error(`O Codex não revisou: falta configurar o ambiente do repositório no Codex. ${notice.html_url}`);
    process.exit(2);
  }
  if (Date.now() > deadline) {
    console.error(`Timeout de ${timeoutMin} min sem revisão do Codex. Comente "@codex review" no PR e rode de novo.`);
    process.exit(2);
  }
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
