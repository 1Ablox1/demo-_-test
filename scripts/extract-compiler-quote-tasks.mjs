import fs from 'node:fs'

const html = fs.readFileSync(
  'c:/Users/Administrator/Downloads/cargoware-os-operating-model-compiler-v8.html',
  'utf8',
)
const start = html.indexOf('const DATA = ')
const end = html.indexOf('const SIPOC', start)
// eslint-disable-next-line no-eval
const DATA = eval(`(${html.slice(start + 12, end).trim().replace(/;\s*$/, '')})`)

const quoteTasks = DATA.tasks
  .filter((t) => t.process === 'Universal quote & shipment setup')
  .sort((a, b) => a.seq - b.seq)

const profile = DATA.profiles.enterprise
console.log('Enterprise profile groups:', profile.groups?.map((g) => g.id).join(', '))

for (const t of quoteTasks) {
  const exec = Object.entries(t.raci || {})
    .filter(([, v]) => v === 'R' || v === 'RA')
    .map(([k]) => k)
  const appr = Object.entries(t.raci || {})
    .filter(([, v]) => v === 'A' || v === 'RA')
    .map(([k]) => k)
  console.log(`${t.id} [${t.type}] ${t.title}`)
  console.log(`  R: ${exec.join(', ') || '—'} | A: ${appr.join(', ') || '—'}`)
}

fs.writeFileSync(
  'd:/work/testenv/airfreight-western-ui/src/data/compiler-quote-tasks.json',
  JSON.stringify(quoteTasks, null, 2),
)
