/* global React */
const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

const WORKFLOWS_2 = window.OPENSOP_WORKFLOWS;
const STEP_TYPES_2 = window.OPENSOP_STEP_TYPES;

function highlightYaml2(src) {
  return src
    .replace(/(#.*)$/gm, '<span class="ec-com">$1</span>')
    .replace(/^(\s*-?\s*)([a-zA-Z_][\w-]*)(\s*:)/gm, '$1<span class="ec-key">$2</span>$3')
    .replace(/(:\s*)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '$1<span class="ec-str">$2</span>')
    .replace(/(:\s*)(true|false|null)\b/g, '$1<span class="ec-bool">$2</span>')
    .replace(/(:\s*)(\d+(?:\.\d+)?[a-z]*)\b/g, '$1<span class="ec-num">$2</span>');
}

function useGitHubStars(repo) {
  const [count, setCount] = useState2(null);
  useEffect2(() => {
    const cacheKey = "gh-stars:" + repo;
    const ttl = 60 * 60 * 1000;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached && typeof cached.n === "number" && Date.now() - cached.t < ttl) {
        setCount(cached.n);
        return;
      }
    } catch (e) {}
    fetch("https://api.github.com/repos/" + repo)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.stargazers_count === "number") {
          setCount(d.stargazers_count);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ n: d.stargazers_count, t: Date.now() }));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, [repo]);
  return count;
}

function formatStars(n) {
  if (n == null) return null;
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return Math.round(n / 1000) + "k";
}

// Animated harness diagram with travelling tokens
function HarnessDiagram({ workflow }) {
  const canvasRef = useRef2(null);
  useEffect2(() => {
    const c = canvasRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * dpr; c.height = r.height * dpr;
    };
    resize(); window.addEventListener("resize", resize);
    const ctx = c.getContext("2d");
    let raf, t0;
    const sources = ["agent", "human", "cron", "webhook"];
    const sinks   = ["github", "stripe", "docusign", "postgres", "smtp", "slack"];
    const tokens = [];
    const spawn = () => {
      const fromSrc = Math.random() < 0.7;
      tokens.push({
        from: fromSrc ? "src" : "sink",
        idx: Math.floor(Math.random() * (fromSrc ? sources.length : sinks.length)),
        sinkIdx: Math.floor(Math.random() * sinks.length),
        srcIdx: Math.floor(Math.random() * sources.length),
        t: 0,
        speed: 0.45 + Math.random() * 0.4
      });
      if (tokens.length > 30) tokens.shift();
    };
    const interval = setInterval(spawn, 350);
    const draw = (now) => {
      if (!t0) t0 = now;
      const r = c.getBoundingClientRect();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      const W = r.width, H = r.height;
      const leftX = 90, midX = W / 2, rightX = W - 90;
      const srcY = (i) => 30 + i * ((H - 60) / (sources.length - 1));
      const sinkY = (i) => 30 + i * ((H - 60) / (sinks.length - 1));

      // edges
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(20, 16, 10, 0.08)";
      sources.forEach((_, i) => {
        ctx.beginPath();
        ctx.moveTo(leftX, srcY(i));
        ctx.bezierCurveTo(midX - 60, srcY(i), midX - 80, H/2, midX - 8, H/2);
        ctx.stroke();
      });
      sinks.forEach((_, i) => {
        ctx.beginPath();
        ctx.moveTo(midX + 8, H/2);
        ctx.bezierCurveTo(midX + 80, sinkY(i), midX + 60, sinkY(i), rightX, sinkY(i));
        ctx.stroke();
      });

      // tokens
      tokens.forEach((tok) => {
        tok.t += 0.012 * tok.speed;
        if (tok.t > 1.2) return;
        let x, y;
        if (tok.from === "src") {
          // src -> hub -> sink
          if (tok.t < 0.5) {
            const u = tok.t / 0.5;
            const sx = leftX, sy = srcY(tok.srcIdx);
            const ex = midX, ey = H/2;
            const cx1 = midX - 60, cx2 = midX - 80;
            x = bezier(u, sx, cx1, cx2, ex);
            y = bezier(u, sy, sy, H/2, ey);
          } else {
            const u = (tok.t - 0.5) / 0.5;
            const sx = midX, sy = H/2;
            const ex = rightX, ey = sinkY(tok.sinkIdx);
            const cx1 = midX + 80, cx2 = midX + 60;
            x = bezier(u, sx, cx1, cx2, ex);
            y = bezier(u, sy, ey, ey, ey);
          }
        } else {
          // sink response back to src
          const u = tok.t / 1.0;
          if (u < 0.5) {
            const v = u / 0.5;
            x = bezier(v, rightX, midX + 60, midX + 80, midX);
            y = bezier(v, sinkY(tok.idx), sinkY(tok.idx), H/2, H/2);
          } else {
            const v = (u - 0.5) / 0.5;
            x = bezier(v, midX, midX - 80, midX - 60, leftX);
            y = bezier(v, H/2, H/2, srcY(tok.srcIdx), srcY(tok.srcIdx));
          }
        }
        ctx.beginPath();
        ctx.fillStyle = tok.from === "src" ? "#d24c2a" : "#0a0a0a";
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); clearInterval(interval); window.removeEventListener("resize", resize); };
  }, [workflow.id]);

  function bezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
  }

  return (
    <div className="ed-harness">
      <div className="ed-harness-col ed-harness-left">
        <div className="ed-harness-h">callers</div>
        {["agent", "human", "cron", "webhook"].map((s) => (
          <div className="ed-harness-pill" key={s}>{s}</div>
        ))}
      </div>
      <div className="ed-harness-mid">
        <canvas ref={canvasRef} className="ed-harness-canvas" />
        <div className="ed-harness-hub">
          <div className="ed-harness-hub-tag">opensop</div>
          <div className="ed-harness-hub-id">{workflow.id}</div>
          <div className="ed-harness-hub-v">v{(workflow.yaml.match(/version: "(.+?)"/) || [,"1.0"])[1]}</div>
          <div className="ed-harness-hub-trace">trace 0x9f3a4c</div>
        </div>
      </div>
      <div className="ed-harness-col ed-harness-right">
        <div className="ed-harness-h">systems</div>
        {["github", "stripe", "docusign", "postgres", "smtp", "slack"].map((s) => (
          <div className="ed-harness-pill" key={s}>{s}</div>
        ))}
      </div>
    </div>
  );
}

function ProcessRibbon({ workflow }) {
  const [t, setT] = useState2(0);
  const total = workflow.steps.reduce((m, s) => Math.max(m, s.ms + s.dur), 0) + 600;
  useEffect2(() => {
    let raf, start;
    const tick = (now) => {
      if (!start) start = now;
      setT(((now - start) % total));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [workflow.id, total]);

  return (
    <div className="ed-ribbon">
      {workflow.steps.map((s, i) => {
        const status = t < s.ms ? "pending" : t < s.ms + s.dur ? "running" : "done";
        const color = STEP_TYPES_2[s.type].color;
        return (
          <div className={`ed-ribbon-step ed-ribbon-${status}`} key={s.id}>
            <div className="ed-ribbon-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="ed-ribbon-type" style={{ color }}>{STEP_TYPES_2[s.type].label}</div>
            <div className="ed-ribbon-name">{s.name}</div>
            <div className="ed-ribbon-bar"><div className="ed-ribbon-fill" style={{ width: status === "done" ? "100%" : status === "running" ? `${((t - s.ms) / s.dur) * 100}%` : "0%", background: color }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function EditorialPage({ tweaks, setTweak }) {
  const [wfId, setWfId] = useState2(tweaks.workflow);
  useEffect2(() => setWfId(tweaks.workflow), [tweaks.workflow]);
  const stars = useGitHubStars("Chosen9115/opensop");
  const starsLabel = formatStars(stars);
  const wf = WORKFLOWS_2.find((w) => w.id === wfId) || WORKFLOWS_2[0];

  const heroes = {
    yaml:    "yaml",
    harness: "harness",
    graph:   "graph"
  };
  const heroId = heroes[tweaks.hero] || "harness";

  return (
    <div className={`ed ed-${tweaks.density}`} data-screen-label="V2 Editorial">
      <header className="ed-nav">
        <div className="ed-nav-l">
          <span className="ed-logo">
            <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M5 11h12 M5 7h8 M5 15h6" stroke="currentColor" strokeWidth="1.4"/></svg>
            <span className="ed-logo-word">OpenSOP</span>
          </span>
        </div>
        <nav className="ed-nav-c">
          <a>Runtime</a><a>Spec</a><a>Workflows</a><a>Audit</a><a>Docs</a><a>Blog</a>
        </nav>
        <div className="ed-nav-r">
          <a className="ed-nav-link">Sign in</a>
          <a className="ed-nav-cta" href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">★ Star{starsLabel ? " · " + starsLabel : ""}</a>
        </div>
      </header>

      <section className="ed-hero">
        <div className="ed-hero-eyebrow">
          <span className="ed-eb-num">No. 01</span>
          <span className="ed-eb-sep">/</span>
          <span>An open runtime for business processes</span>
          <span className="ed-eb-sep">/</span>
          <span>v0.2 · April 2026</span>
        </div>
        <h1 className="ed-hero-h">
          Your business <span className="ed-italic">processes</span><br />
          deserve a <span className="ed-italic">runtime</span>,<br />
          not another doc.
        </h1>
        <p className="ed-hero-sub">
          Define a process in YAML. Get a versioned, typed, auditable API.
          Agents and humans interact with the same endpoint &mdash; and every
          run is a replayable instance you can branch, diff and improve.
        </p>
        <div className="ed-hero-row">
          <a className="ed-btn ed-btn-dark" href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">★ Star on GitHub</a>
          <a className="ed-btn ed-btn-ghost" href="https://github.com/Chosen9115/opensop#readme" target="_blank" rel="noopener noreferrer">Read the spec →</a>
          <span className="ed-hero-meta">
            <span className="ed-pulse" /> v0.2 stable · Apache 2.0 · self-host in 60s
          </span>
        </div>

        <div className="ed-hero-figure">
          <div className="ed-hero-fig-tabs">
            {[["harness","Agent harness"],["yaml","YAML → API"],["graph","Live run"]].map(([k,l]) => (
              <button key={k} className={`ed-fig-tab ${heroId===k?"is-on":""}`} onClick={() => setTweak("hero", k)}>{l}</button>
            ))}
          </div>
          <div className="ed-hero-fig-body">
            {heroId === "harness" && <HarnessDiagram workflow={wf} />}
            {heroId === "yaml" && (
              <div className="ed-yaml-pair">
                <div className="ed-yaml-pane">
                  <div className="ed-yaml-head">
                    <span>{wf.id}.sop.yaml</span>
                    <span className="ed-yaml-meta">v{(wf.yaml.match(/version: "(.+?)"/) || [,"1.0"])[1]}</span>
                  </div>
                  <pre className="ed-yaml-code" dangerouslySetInnerHTML={{ __html: highlightYaml2(wf.yaml) }} />
                </div>
                <div className="ed-yaml-pane">
                  <div className="ed-yaml-head">
                    <span>generated REST API</span>
                    <span className="ed-yaml-meta ed-live">live</span>
                  </div>
                  <div className="ed-yaml-endpoints">
                    {wf.endpoints.map((e) => {
                      const [m, ...r] = e.split(/\s+/);
                      return (
                        <div className="ed-ep" key={e}>
                          <span className={`ed-ep-m ed-ep-${m.toLowerCase()}`}>{m}</span>
                          <span className="ed-ep-p">{r.join(" ")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {heroId === "graph" && <ProcessRibbon workflow={wf} />}
          </div>
        </div>
      </section>

      <section className="ed-quote">
        <blockquote>
          “Processes are company IP. They live in heads, Notion pages, tribal knowledge.
          OpenSOP makes them <span className="ed-italic">callable</span>.”
        </blockquote>
        <cite>— OpenSOP Spec, §1</cite>
      </section>

      <section className="ed-section">
        <div className="ed-sec-head">
          <span className="ed-sec-num">02</span>
          <h2 className="ed-sec-h">A workflow brain — for the agents you're about to deploy.</h2>
        </div>
        <div className="ed-three">
          <div className="ed-three-col">
            <div className="ed-three-icon ed-icon-1">
              <svg viewBox="0 0 40 40" width="40" height="40"><rect x="6" y="6" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M12 14h16 M12 20h12 M12 26h8" stroke="currentColor" strokeWidth="1.2"/></svg>
            </div>
            <h3>The definition is the contract.</h3>
            <p>One YAML file. Inputs, outputs, steps, conditions, retries. The runtime exposes it as a REST API automatically — no separate API layer to build, no drift.</p>
          </div>
          <div className="ed-three-col">
            <div className="ed-three-icon ed-icon-2">
              <svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="20" cy="20" r="3" fill="currentColor"/><path d="M20 6v4 M20 30v4 M6 20h4 M30 20h4" stroke="currentColor" strokeWidth="1.2"/></svg>
            </div>
            <h3>Every step has a type.</h3>
            <p>Automated, form, judgment, approval, webhook, llm. The runtime knows which steps need a human, which need an LLM, and which just run — and routes accordingly.</p>
          </div>
          <div className="ed-three-col">
            <div className="ed-three-icon ed-icon-3">
              <svg viewBox="0 0 40 40" width="40" height="40"><path d="M6 30 L20 10 L34 30 Z" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M14 22h12" stroke="currentColor" strokeWidth="1.2"/></svg>
            </div>
            <h3>Audit, diff, replay.</h3>
            <p>Every instance keeps inputs, outputs, agent confidences, and the exact process version. Diff <em>v1</em> against <em>v3</em>. Replay a failed step. Ship the improvement.</p>
          </div>
        </div>
      </section>

      <section className="ed-section ed-section-wf">
        <div className="ed-sec-head">
          <span className="ed-sec-num">03</span>
          <h2 className="ed-sec-h">Workflows in production.</h2>
          <p className="ed-sec-sub">Pick a process. The YAML below is the actual file. The endpoints are auto-generated.</p>
        </div>

        <div className="ed-wf-pills">
          {WORKFLOWS_2.map((w) => (
            <button key={w.id}
                    className={`ed-wf-pill ${wfId === w.id ? "is-on" : ""}`}
                    onClick={() => { setWfId(w.id); setTweak("workflow", w.id); }}>
              {w.name}
            </button>
          ))}
        </div>

        <div className="ed-wf-stats-grid">
          <div><span>runs</span><b>{wf.runs}</b></div>
          <div><span>p50</span><b>{wf.p50}</b></div>
          <div><span>success</span><b>{wf.success}</b></div>
          <div><span>endpoints</span><b>{wf.endpoints.length}</b></div>
          <div><span>steps</span><b>{wf.steps.length}</b></div>
        </div>

        <p className="ed-wf-blurb-2">{wf.blurb}</p>

        <ProcessRibbon workflow={wf} />

        <div className="ed-yaml-pair ed-yaml-pair-block">
          <div className="ed-yaml-pane">
            <div className="ed-yaml-head">
              <span>{wf.id}.sop.yaml</span>
              <span className="ed-yaml-meta">v{(wf.yaml.match(/version: "(.+?)"/) || [,"1.0"])[1]}</span>
            </div>
            <pre className="ed-yaml-code" dangerouslySetInnerHTML={{ __html: highlightYaml2(wf.yaml) }} />
          </div>
          <div className="ed-yaml-pane">
            <div className="ed-yaml-head">
              <span>generated REST API</span>
              <span className="ed-yaml-meta ed-live">live</span>
            </div>
            <div className="ed-yaml-endpoints">
              {wf.endpoints.map((e) => {
                const [m, ...r] = e.split(/\s+/);
                return (
                  <div className="ed-ep" key={e}>
                    <span className={`ed-ep-m ed-ep-${m.toLowerCase()}`}>{m}</span>
                    <span className="ed-ep-p">{r.join(" ")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="ed-section ed-section-ledger">
        <div className="ed-sec-head">
          <span className="ed-sec-num">04</span>
          <h2 className="ed-sec-h">Audit, diff, replay.</h2>
          <p className="ed-sec-sub">Every instance keeps inputs, outputs, agent confidences, and the exact process version. Diff <em>v1</em> against <em>v3</em>. Replay a failed step against a new threshold. Ship the improvement.</p>
        </div>
        <div className="ed-ledger">
          <div className="ed-ledger-head">
            <span>instance_id</span><span>v</span><span>status</span><span>at_step</span><span>duration</span><span>actor</span><span></span>
          </div>
          {[
            ["i_9f3a4c", "v1.4", "running",    "step.review",     "+02m 14s", "agent"],
            ["i_8b21de", "v1.4", "completed",  "—",               "+04m 12s", "human"],
            ["i_7c10aa", "v1.3", "completed",  "—",               "+05m 31s", "agent"],
            ["i_6a09c1", "v1.3", "escalated",  "step.compliance", "+03m 02s", "human"],
            ["i_5d99a0", "v1.2", "completed",  "—",               "+06m 48s", "agent"],
            ["i_4e8801", "v1.2", "failed",     "step.verify",     "+01m 09s", "system"]
          ].map((r) => (
            <div className="ed-ledger-row" key={r[0]}>
              <span className="ed-ledger-id">{r[0]}</span>
              <span className="ed-ledger-v">{r[1]}</span>
              <span className={`ed-ledger-st ed-ledger-${r[2]}`}>{r[2]}</span>
              <span className="ed-ledger-stp">{r[3]}</span>
              <span className="ed-ledger-dur">{r[4]}</span>
              <span className="ed-ledger-actor">{r[5]}</span>
              <span className="ed-ledger-replay">↻ replay on v1.4</span>
            </div>
          ))}
        </div>

        <div className="ed-diff">
          <div className="ed-diff-pane ed-diff-old">
            <div className="ed-diff-h">v1.2</div>
            <pre>{`steps:
  - id: review
    type: judgment
    judgment:
      confidence_threshold: 0.85
      escalation: manual
    retry: { max: 2 }

success: 91.4%`}</pre>
          </div>
          <div className="ed-diff-arrow">→</div>
          <div className="ed-diff-pane ed-diff-new">
            <div className="ed-diff-h">v1.4 <span className="ed-diff-tag">CURRENT</span></div>
            <pre>{`steps:
  - id: review
    type: judgment
    judgment:
      confidence_threshold: 0.92  # tightened
      escalation: manual
      allow_agent: true
    retry: { max: 3, backoff: exponential }

success: ${wf.success}`}</pre>
          </div>
        </div>
      </section>

      <section className="ed-section ed-section-api">
        <div className="ed-sec-head">
          <span className="ed-sec-num">05</span>
          <h2 className="ed-sec-h">Discoverable, typed, stable.</h2>
          <p className="ed-sec-sub"><code>GET /sop/</code> returns a typed catalogue of every process your org runs. Any agent can discover what your company does and how to invoke it &mdash; without reading docs.</p>
        </div>

        <pre className="ed-api-block">{`# discover everything an org can do
$ curl https://api.acme.com/sop/ -H "X-SOP-Token: $TOKEN"

{
  "processes": [
    {
      "name": "customer-onboarding",
      "version": "1.4",
      "description": "Onboard a business for cross-border banking",
      "tags": ["banking", "onboarding", "compliance", "kyb"],
      "inputs_summary":  "company_name (string, required), country (enum: US|MX, required)",
      "outputs_summary": "account_id (string), status (enum: approved|rejected)",
      "sla": "72h",
      "schema_url": "/sop/customer-onboarding/schema"
    },
    {
      "name": "continuous-pr-review",
      "version": "2.1",
      "description": "Agent + policy review on every pull request",
      "tags": ["dev", "review", "agent"],
      "inputs_summary":  "repo (string), pr_number (number), diff_url (string)",
      "outputs_summary": "decision (enum: approve|request-changes), comments (string[])",
      "sla": null,
      "schema_url": "/sop/continuous-pr-review/schema"
    }
    /* … */
  ]
}`}</pre>
      </section>

      <section className="ed-section ed-section-vs">
        <div className="ed-vs-card">
          <div className="ed-vs-eb">A note on positioning</div>
          <h3 className="ed-vs-h">OpenSOP is not workflow glue.</h3>
          <p>
            n8n, Zapier, Make &mdash; these are <em>connectors</em>. They wire services together
            with nodes. OpenSOP sits one layer above: it <em>hosts</em> your business processes
            so they're typed, versioned, auditable and callable from agents and humans through
            the same API. Different layer, different job.
          </p>
        </div>
      </section>

      <section className="ed-cta">
        <h2>Ship a process. Get an API.<br />Audit every run.</h2>
        <div className="ed-cta-row">
          <a className="ed-btn ed-btn-dark" href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">★ Star on GitHub</a>
        </div>
        <div className="ed-cta-meta">Apache 2.0 &middot; self-hostable &middot; Postgres + Ruby on Rails &middot; deployable in 60s</div>
      </section>

      <section className="ed-quickstart">
        <div className="ed-qs-eb"><span className="ed-pulse" /> Quickstart</div>
        <h2 className="ed-qs-h">Ship your first process<br /><span className="ed-italic">in 60 seconds.</span></h2>
        <pre className="ed-qs-block">{`$ git clone https://github.com/Chosen9115/opensop && cd opensop
$ bin/setup                                          # bundle + db:prepare + bin/dev → http://localhost:3000

$ curl http://localhost:3000/sop/                    # discover the example processes
{ "processes": [
  { "name": "customer-onboarding", "version": "1.0", "schema_url": "/sop/customer-onboarding/schema" },
  { "name": "lead-qualification",  "version": "1.0", "schema_url": "/sop/lead-qualification/schema" }
] }

$ curl -X POST http://localhost:3000/sop/customer-onboarding/start \\
       -H "Content-Type: application/json" \\
       -d '{"company_name":"Acme Corp"}'
{ "instance_id": "01HX...", "next_step": "collect-business-info" }`}</pre>
        <div className="ed-qs-row">
          <a className="ed-btn ed-btn-dark" href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">★ Star on GitHub</a>
        </div>
      </section>

      <footer className="ed-foot">
        <div className="ed-foot-l">
          <div className="ed-logo"><svg width="20" height="20" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M5 11h12 M5 7h8 M5 15h6" stroke="currentColor" strokeWidth="1.4"/></svg> <span>OpenSOP</span></div>
          <p>An open runtime for business processes.<br />Apache 2.0 · 2026.</p>
        </div>
        <div className="ed-foot-cols">
          <div><h6>Product</h6><a>Runtime</a><a>Spec v0.2</a><a>Roadmap</a><a>Changelog</a></div>
          <div><h6>Developers</h6><a>Docs</a><a>API reference</a><a>Postman</a><a>Examples</a></div>
          <div><h6>Community</h6><a href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">GitHub</a><a>Discord</a><a>Showcase</a><a>Contributing</a></div>
        </div>
      </footer>
    </div>
  );
}

window.EditorialPage = EditorialPage;

// --- Boot stub: stateful App so hero/workflow switchers work ---
function __OpenSOPApp() {
  const [tweaks, setTweaks] = React.useState({ workflow: "kyb", hero: "graph", density: "medium" });
  const setTweak = (k, v) => setTweaks(prev => ({ ...prev, [k]: v }));
  return <EditorialPage tweaks={tweaks} setTweak={setTweak} />;
}
ReactDOM.createRoot(document.getElementById("root")).render(<__OpenSOPApp />);
