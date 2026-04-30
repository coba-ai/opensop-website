// Shared workflow data for all OpenSOP variants.
window.OPENSOP_WORKFLOWS = [
  {
    id: "kyb",
    name: "Customer onboarding (KYB)",
    blurb: "Onboard a business customer end-to-end. Collect docs, verify, judge, route to compliance, provision account.",
    runs: "12,438",
    p50: "4m 12s",
    success: "98.4%",
    yaml: `opensop: "0.2"

process:
  name: customer-onboarding
  version: "1.4"
  description: "Onboard a business for cross-border banking"
  owner: banking-team

  trigger: { type: api }

  inputs:
    - { name: company_name,  type: string, required: true }
    - { name: contact_email, type: string, format: email }
    - { name: country,       type: enum, values: [US, MX] }

  outputs:
    - { name: account_id, from: steps.provision.outputs.account_id }
    - { name: status,     from: steps.review.outputs.decision }

  steps:
    - id: collect
      type: form
      name: "Collect business info"
      timeout: 7d
    - id: verify
      type: automated
      name: "Verify KYB documents"
      run: ./steps/verify-documents.py
      retry: { max: 3, backoff: exponential }
    - id: review
      type: judgment
      name: "Risk review"
      outputs:
        - { name: decision, type: enum, values: [approve, reject] }
      judgment:
        allow_agent: true
        confidence_threshold: 0.9
        escalation: manual
    - id: compliance
      type: webhook
      name: "Submit to compliance provider"
      condition: "steps.review.outputs.decision == 'approve'"
    - id: provision
      type: automated
      name: "Provision account"
      outputs:
        - { name: account_id, type: string }`,
    steps: [
      { id: "collect",    name: "Collect business info",     type: "form",      ms: 0,    dur: 1100 },
      { id: "verify",     name: "Verify KYB documents",      type: "automated", ms: 1100, dur: 900 },
      { id: "review",     name: "Risk review",               type: "judgment",  ms: 2000, dur: 1300 },
      { id: "compliance", name: "Submit to compliance",      type: "webhook",   ms: 3300, dur: 1500 },
      { id: "provision",  name: "Provision account",         type: "automated", ms: 4800, dur: 700 }
    ],
    endpoints: [
      "POST   /sop/customer-onboarding/start",
      "GET    /sop/customer-onboarding/:id",
      "GET    /sop/customer-onboarding/:id/steps",
      "POST   /sop/customer-onboarding/:id/steps/review/submit",
      "POST   /sop/customer-onboarding/:id/cancel"
    ]
  },

  {
    id: "pr",
    name: "Continuous PR review",
    blurb: "Triage every PR. Lint, run agent review, check policy, request changes or approve. Auditable per-PR.",
    runs: "84,221",
    p50: "47s",
    success: "99.7%",
    yaml: `opensop: "0.2"

process:
  name: continuous-pr-review
  version: "2.1"
  description: "Agent + policy review on every pull request"
  owner: platform

  trigger: { type: api }

  inputs:
    - { name: repo, type: string }
    - { name: pr_number, type: number }
    - { name: diff_url, type: string }

  steps:
    - id: fetch
      type: automated
      name: "Fetch diff + context"
    - id: lint
      type: automated
      name: "Static analysis"
      retry: { max: 2 }
    - id: review
      type: llm
      name: "Agent code review"
      model: claude-sonnet-4-7
      tools: [Read, Grep]
    - id: policy
      type: judgment
      name: "Policy check"
      judgment: { allow_agent: true, confidence_threshold: 0.95 }
    - id: post
      type: webhook
      name: "Post review on GitHub"`,
    steps: [
      { id: "fetch",  name: "Fetch diff + context",  type: "automated", ms: 0,    dur: 500 },
      { id: "lint",   name: "Static analysis",        type: "automated", ms: 500,  dur: 700 },
      { id: "review", name: "Agent code review",      type: "llm",       ms: 1200, dur: 1900 },
      { id: "policy", name: "Policy check",           type: "judgment",  ms: 3100, dur: 600 },
      { id: "post",   name: "Post review on GitHub",  type: "webhook",   ms: 3700, dur: 500 }
    ],
    endpoints: [
      "POST   /sop/continuous-pr-review/start",
      "GET    /sop/continuous-pr-review/:id",
      "GET    /sop/continuous-pr-review/:id/steps",
      "POST   /sop/triggers/continuous-pr-review (HMAC)",
      "GET    /sop/instances?process=continuous-pr-review"
    ]
  },

  {
    id: "bounty",
    name: "Bug bounty triage",
    blurb: "Validate report, dedupe, reproduce, score severity, route to engineer. Every report is an audited instance.",
    runs: "3,902",
    p50: "11m 06s",
    success: "94.1%",
    yaml: `opensop: "0.2"

process:
  name: bug-bounty-triage
  version: "1.2"
  description: "Triage incoming bug bounty submissions"
  owner: security

  trigger: { type: api }

  steps:
    - id: validate
      type: automated
      name: "Validate report shape"
    - id: dedupe
      type: llm
      name: "Dedupe against known issues"
      model: claude-sonnet-4-7
      tools: [Read, Grep]
    - id: reproduce
      type: automated
      name: "Auto-reproduce in sandbox"
      timeout: 30m
    - id: severity
      type: judgment
      name: "Score severity (CVSS)"
      judgment: { allow_agent: true, confidence_threshold: 0.85 }
    - id: route
      type: webhook
      name: "Open ticket + notify owner"
    - id: pay
      type: approval
      name: "Approve bounty payout"
      condition: "steps.severity.outputs.cvss >= 7.0"`,
    steps: [
      { id: "validate",  name: "Validate report",      type: "automated", ms: 0,    dur: 500 },
      { id: "dedupe",    name: "Dedupe known issues",  type: "llm",       ms: 500,  dur: 1100 },
      { id: "reproduce", name: "Reproduce in sandbox", type: "automated", ms: 1600, dur: 1400 },
      { id: "severity",  name: "Score severity",       type: "judgment",  ms: 3000, dur: 800 },
      { id: "route",     name: "Open ticket",          type: "webhook",   ms: 3800, dur: 500 },
      { id: "pay",       name: "Approve payout",       type: "approval",  ms: 4300, dur: 1000 }
    ],
    endpoints: [
      "POST   /sop/bug-bounty-triage/start",
      "GET    /sop/bug-bounty-triage/:id",
      "GET    /sop/bug-bounty-triage/:id/steps",
      "POST   /sop/bug-bounty-triage/:id/steps/pay/submit"
    ]
  },

  {
    id: "proposal",
    name: "Send customer proposal",
    blurb: "Generate, review, get internal sign-off, dispatch via DocuSign, log in CRM.",
    runs: "1,184",
    p50: "2m 38s",
    success: "100%",
    yaml: `opensop: "0.2"

process:
  name: send-proposal
  version: "1.0"
  owner: revenue

  trigger: { type: api }

  inputs:
    - { name: deal_id, type: string }
    - { name: contact_email, type: string }

  steps:
    - id: draft
      type: llm
      name: "Draft proposal"
      model: claude-sonnet-4-7
    - id: internal-review
      type: approval
      name: "Internal review"
      approvers: [account-exec, sales-eng]
    - id: dispatch
      type: webhook
      name: "Send via DocuSign"
    - id: log
      type: automated
      name: "Log in CRM"`,
    steps: [
      { id: "draft",          name: "Draft proposal",  type: "llm",       ms: 0,    dur: 1200 },
      { id: "internal-review",name: "Internal review", type: "approval",  ms: 1200, dur: 1800 },
      { id: "dispatch",       name: "Send via DocuSign",type: "webhook",  ms: 3000, dur: 700 },
      { id: "log",            name: "Log in CRM",      type: "automated", ms: 3700, dur: 400 }
    ],
    endpoints: [
      "POST   /sop/send-proposal/start",
      "GET    /sop/send-proposal/:id",
      "POST   /sop/send-proposal/:id/steps/internal-review/submit"
    ]
  },

  {
    id: "inquiry",
    name: "Inbound inquiry triage",
    blurb: "Classify, enrich, score, auto-reply to qualified leads, queue the rest for sales.",
    runs: "27,613",
    p50: "8s",
    success: "99.1%",
    yaml: `opensop: "0.2"

process:
  name: inbound-inquiry-triage
  version: "3.0"
  owner: growth

  trigger: { type: api }

  steps:
    - id: classify
      type: llm
      name: "Classify intent"
      model: claude-sonnet-4-7
    - id: enrich
      type: webhook
      name: "Enrich via Clearbit"
    - id: score
      type: judgment
      name: "Score lead quality"
      judgment: { allow_agent: true, confidence_threshold: 0.8 }
    - id: respond
      type: automated
      name: "Auto-reply to qualified"
      condition: "steps.score.outputs.tier == 'A'"
    - id: queue
      type: automated
      name: "Queue for sales"
      condition: "steps.score.outputs.tier != 'A'"`,
    steps: [
      { id: "classify", name: "Classify intent",     type: "llm",       ms: 0,    dur: 700 },
      { id: "enrich",   name: "Enrich via Clearbit", type: "webhook",   ms: 700,  dur: 600 },
      { id: "score",    name: "Score lead quality",  type: "judgment",  ms: 1300, dur: 800 },
      { id: "respond",  name: "Auto-reply",          type: "automated", ms: 2100, dur: 400 }
    ],
    endpoints: [
      "POST   /sop/triggers/inbound-inquiry-triage (HMAC)",
      "GET    /sop/inbound-inquiry-triage/:id",
      "GET    /sop/inbound-inquiry-triage/:id/steps",
      "GET    /sop/instances?process=inbound-inquiry-triage"
    ]
  }
];

window.OPENSOP_STEP_TYPES = {
  automated: { label: "auto",      color: "#22c55e" },
  form:      { label: "form",      color: "#60a5fa" },
  judgment:  { label: "judgment",  color: "#f59e0b" },
  approval:  { label: "approval",  color: "#a78bfa" },
  webhook:   { label: "webhook",   color: "#f472b6" },
  llm:       { label: "llm",       color: "#22d3ee" }
};
