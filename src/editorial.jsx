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

const HERO_INSTALL_PROMPT = `# Install the OpenSOP CLI (local-first, no account required)
curl -fsSL https://raw.githubusercontent.com/Chosen9115/opensop/main/cli/bin/opensop -o opensop && chmod +x opensop
./opensop run morning-briefing.sop.yaml`;

function HeroPaste() {
  const [copied, setCopied] = useState2(false);
  const onCopy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(HERO_INSTALL_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <div className="ed-hero-paste">
      <div className="ed-paste-eb">
        <span className="ed-paste-arrow">▷</span> Install the CLI locally — no server, no account
        <span className="ed-paste-hint">— one curl, then opensop run</span>
      </div>
      <div className="ed-paste-body">
        <pre className="ed-paste-code">{HERO_INSTALL_PROMPT}</pre>
        <button className={`ed-paste-copy ${copied ? "is-copied" : ""}`} onClick={onCopy} aria-label="Copy install prompt">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

const HERO_DISCOVER_PROMPT = `Help me uncover the procedures my team repeats that would benefit from a deterministic gate around LLM calls. For each, sketch what it would look like as an OpenSOP process file — steps, gates, receipts. End with a comparison table per procedure: time, cost, reliability, token spend — today vs with OpenSOP, multiplier called out. Spec: https://github.com/Chosen9115/opensop/blob/main/SPEC.md`;

function HeroCli() {
  const [copied, setCopied] = useState2(false);
  const onCopy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(HERO_DISCOVER_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <div className="ed-hero-cli">
      <div className="ed-paste-eb">
        <span className="ed-paste-arrow">▷</span> See where your team already has repeatable processes
        <span className="ed-paste-hint">— same agent, same chat</span>
      </div>
      <div className="ed-paste-body">
        <pre className="ed-paste-code">{HERO_DISCOVER_PROMPT}</pre>
        <button className={`ed-paste-copy ${copied ? "is-copied" : ""}`} onClick={onCopy} aria-label="Copy discovery prompt">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
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
          <a href="#why">Why</a><a href="https://github.com/Chosen9115/opensop/blob/main/SPEC.md" target="_blank" rel="noopener noreferrer">Spec v0.6</a><a href="#workflows">Workflows</a><a href="#audit">Audit</a><a href="https://github.com/Chosen9115/opensop/tree/main/docs" target="_blank" rel="noopener noreferrer">Docs</a>
        </nav>
        <div className="ed-nav-r">
          <a className="ed-nav-link" href="#mvp">MVP status</a>
          <a className="ed-nav-cta" href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">★ Star{starsLabel ? " · " + starsLabel : ""}</a>
        </div>
      </header>

      <section className="ed-hero">
        <img
          className="ed-hero-illu"
          src="./assets/hero-illustration.jpg"
          alt=""
          width="1600"
          height="1066"
          loading="eager"
          decoding="async"
          aria-hidden="true"
        />
        <div className="ed-hero-eyebrow">
          <span className="ed-eb-num">No. 01</span>
          <span className="ed-eb-sep">/</span>
          <span>Process as Infrastructure for agentic workflows</span>
          <span className="ed-eb-sep">/</span>
          <span>CLI v0.8.0 · spec v0.6</span>
        </div>
        <h1 className="ed-hero-h">
          A process is a <span className="ed-italic">file</span>.<br />
          Declare it, version it, run it locally.
        </h1>
        <p className="ed-hero-sub">
          Like Terraform for cloud resources — but for agentic processes. Write a <code>.sop.yaml</code>, run it with the local CLI, get an auditable receipt. The server is optional and pluggable.
        </p>
        <div className="ed-hero-row">
          <a className="ed-btn ed-btn-dark" href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">★ Standard + CLI on GitHub</a>
          <a className="ed-btn ed-btn-ghost" href="https://github.com/Chosen9115/opensop/blob/main/SPEC.md" target="_blank" rel="noopener noreferrer">Read spec v0.6 →</a>
          <span className="ed-hero-meta">
            <span className="ed-pulse" /> CLI v0.8.0 · Apache 2.0 · local-first
          </span>
        </div>

        <HeroPaste />
        <HeroCli />

        <div className="ed-hero-figure">
          <div className="ed-hero-fig-tabs">
            {[["harness","Agent harness"],["yaml","Process file"],["graph","Live run"]].map(([k,l]) => (
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
                    <span>server endpoints (optional)</span>
                    <span className="ed-yaml-meta ed-live">when hosted</span>
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
          &ldquo;Terraform is to cloud resources what OpenSOP is to agentic processes.&rdquo;
        </blockquote>
      </section>

      <section className="ed-section ed-section-why" id="why">
        <div className="ed-sec-head">
          <span className="ed-sec-num">01b</span>
          <h2 className="ed-sec-h">Why we built this.</h2>
          <p className="ed-sec-sub">We got tired of agents claiming they did things when they hadn't, and noticed most of what we'd asked them to do was deterministic in the first place. OpenSOP runs the deterministic parts on a code runtime — auditable, reliable, cheaper than tokens — and reserves agents for what genuinely needs intelligence.</p>
        </div>
        <div className="ed-why-scene">
          <div className="ed-why-col">
            <h3>Without a harness.</h3>
            <p>The Calendar API times out at 07:51:34. The agent doesn't say that. It says <em>"your schedule looks clear this morning — no urgent meetings flagged."</em> You start your day assuming you're free. You had two meetings. You missed them. No exception thrown, no log entry — just absence of data laundered into a clean sentence.</p>
          </div>
          <div className="ed-why-col">
            <h3>With OpenSOP.</h3>
            <p>That briefing is a process. Five steps, each a deterministic CLI fetch with a required <code>success: true</code> output. Calendar fails at step three; the runtime stops. You get back exactly what was collected — <em>"Slack (3 unread DMs), Gmail (14 threads), Calendar unavailable at 07:51:34, Notion + Circleback skipped, synthesis not run"</em> — with a receipt. Honest, partial, useful.</p>
          </div>
        </div>
      </section>

      <section className="ed-section ed-section-sample" id="sample">
        <div className="ed-sec-head">
          <span className="ed-sec-num">02</span>
          <h2 className="ed-sec-h">What our agent surfaced.</h2>
          <p className="ed-sec-sub">We ran the prompt above on our own codebase. Where today and OpenSOP read the same, Claude is the bottleneck — not the harness. The wins concentrate in failure modes, debugging, and replay.</p>
        </div>

        <div className="ed-sample-wrap">
          <table className="ed-sample-table">
            <thead>
              <tr>
                <th>Procedure</th>
                <th>Wall time</th>
                <th>Cost</th>
                <th>Failure catch</th>
                <th>Debug + replay</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="ed-sample-proc">Morning briefing</div>
                  <div className="ed-sample-sig">gather(N sources, deterministic) → bundle → llm-judge(single call) → publish</div>
                </td>
                <td><span className="ed-sample-from">3–10 min, spikes 15+</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">70–145 s consistent</span></td>
                <td><span className="ed-sample-from">50–200K input tok</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">15–25K (pre-curated)</span></td>
                <td><span className="ed-sample-from">high variance, claude picks fetches</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">identical bundle each run</span></td>
                <td><span className="ed-sample-from">none</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">receipts per phase, replay</span></td>
                <td><span className="ed-sample-mult">3–5× faster</span><span className="ed-sample-mult-sub">5–10× cheaper · deterministic</span></td>
              </tr>
              <tr>
                <td>
                  <div className="ed-sample-proc">Document parse + verify</div>
                  <div className="ed-sample-sig">classify → chunk → extract(parallel) → dedup → integrity-gate → approve(if escalated) → notify</div>
                </td>
                <td><span className="ed-sample-from">~10 min</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">~10 min (1×)</span></td>
                <td><span className="ed-sample-from">~$2.88 / doc</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">~$2.88 (1×)</span></td>
                <td><span className="ed-sample-from">3 of 14 prompt edits regressed silently</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">schema-gated, 0 silent</span></td>
                <td><span className="ed-sample-from">log archaeology, hours</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">audit query, minutes</span></td>
                <td><span className="ed-sample-mult">~5× fewer regressions</span><span className="ed-sample-mult-sub">~10× faster MTTR · 1× wall time</span></td>
              </tr>
              <tr>
                <td>
                  <div className="ed-sample-proc">Bug triage + fix loop</div>
                  <div className="ed-sample-sig">ingest → classify-bugs → dispatch(per-bug) → regression-gate → deploy → retest → notify</div>
                </td>
                <td><span className="ed-sample-from">~6 h over 2 days</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">~3 h, gates fire on triggers</span></td>
                <td><span className="ed-sample-from">retry storms after reverts</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">fail-fast, gates catch upstream</span></td>
                <td><span className="ed-sample-from">3 of 14 PRs reverted</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">pre-deploy regression-gate</span></td>
                <td><span className="ed-sample-from">re-justify from chat history</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">audit log per cycle, PR refs</span></td>
                <td><span className="ed-sample-mult">2× faster cycle</span><span className="ed-sample-mult-sub">~3× fewer reverts · replay-capable</span></td>
              </tr>
              <tr>
                <td>
                  <div className="ed-sample-proc">Auto-answer template</div>
                  <div className="ed-sample-sig">embed → search → rank-gate → synthesize(citations bound to results) → human-confirm → persist</div>
                </td>
                <td><span className="ed-sample-from">~30 min / 78 questions</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">~20 min</span></td>
                <td><span className="ed-sample-from">~$0.50 / template</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">~$0.30</span></td>
                <td><span className="ed-sample-from">hallucinated citations, customer-visible</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">~0, citations gated to search results</span></td>
                <td><span className="ed-sample-from">implicit trust</span><span className="ed-sample-arrow">→</span><span className="ed-sample-to">explicit receipt: "47 cited / 12 manual"</span></td>
                <td><span className="ed-sample-mult">1.5× faster · 1.7× cheaper</span><span className="ed-sample-mult-sub">hallucinations gated out</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="ed-sample-meta">Real runs from our team. Your output will differ — different procedures, different multipliers — but the shape stays: flat happy-path, big wins on failure modes, debugging, and replay.</p>
      </section>

      <section className="ed-section ed-section-worker" id="agent-harness">
        <div className="ed-sec-head">
          <span className="ed-sec-num">03</span>
          <h2 className="ed-sec-h">Eleven agents on schedule. One harness.</h2>
          <p className="ed-sec-sub">Internally, OpenSOP runs opensop-worker: a Rust daemon that schedules 11 specialized agents across our Rails projects.</p>
        </div>
        <div className="ed-three">
          <div className="ed-three-col">
            <h3>Routine work runs on time.</h3>
            <p>PR review, dependency bumps, conflict resolution, Slack digests, AGENTS.md generation, CI re-runs, release notes. The work humans defer or forget runs on its own schedule.</p>
          </div>
          <div className="ed-three-col">
            <h3>Narrow gates around every call.</h3>
            <p>Each job has typed inputs and outputs, prompt templates with marker protocols, structured responses parsed by Rust, size caps and critical-path exclusions.</p>
          </div>
          <div className="ed-three-col">
            <h3>Receipts before side effects.</h3>
            <p>Every fire writes an append-only receipt. Ground-truth git diff checks catch schema drift, scope creep, hallucinated files and unsafe changes before anything touches production.</p>
          </div>
        </div>
        <div className="ed-loop-row">
          {["Create", "Test", "Audit", "Iterate", "Improve", "Cement"].map((step, i, arr) => (
            <React.Fragment key={step}>
              <span className="ed-loop-pill">{step}</span>
              {i < arr.length - 1 && <span className="ed-loop-sep">→</span>}
            </React.Fragment>
          ))}
          <p className="ed-loop-note">Agents can write the process for you. A new <code>.sop.yaml</code> takes seconds with the right prompt. Auditability is the superpower; reliability is the moat.</p>
        </div>
      </section>

      <section className="ed-section ed-section-wf" id="workflows">
        <div className="ed-sec-head">
          <span className="ed-sec-num">05</span>
          <h2 className="ed-sec-h">Running in production. Examples below.</h2>
          <p className="ed-sec-sub">Pick a process. The YAML below is the file you declare, version, and run — locally or against a server that implements the spec.</p>
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
              <span>server endpoints (when hosted)</span>
              <span className="ed-yaml-meta ed-live">optional</span>
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

      <section className="ed-section ed-section-ledger" id="audit">
        <div className="ed-sec-head">
          <span className="ed-sec-num">06</span>
          <h2 className="ed-sec-h">Audit, diff, replay.</h2>
          <p className="ed-sec-sub">Every run records inputs, outputs, agent confidences, and the exact process version. Diff <em>v1</em> against <em>v3</em>. Replay a failed step against a new threshold. Ship the improvement.</p>
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

      <section className="ed-section ed-section-api" id="cli">
        <div className="ed-sec-head">
          <span className="ed-sec-num">07</span>
          <h2 className="ed-sec-h">Local-first. One file. No account.</h2>
          <p className="ed-sec-sub">Install the CLI with a single curl. <code>opensop run</code> executes any <code>.sop.yaml</code> locally — no server, no sign-up. Add <code>--server</code> to route runs through a hosted instance when you want shared state and audit logs.</p>
        </div>

        <pre className="ed-api-block">{`# install — one curl, works without a server
$ curl -fsSL https://raw.githubusercontent.com/Chosen9115/opensop/main/cli/bin/opensop -o opensop && chmod +x opensop

# run a process locally — no account, no server
$ ./opensop run morning-briefing.sop.yaml
[opensop] running morning-briefing v1.4 locally
  step 01/05  fetch-slack       ✓  3 unread DMs
  step 02/05  fetch-gmail       ✓  14 threads
  step 03/05  fetch-calendar    ✗  unavailable at 07:51:34
[opensop] halted at step 03 — receipt written to ./receipts/i_9f3a4c.json

# list processes in the current directory
$ ./opensop list
morning-briefing   schedule, digest       Daily briefing from Slack, Gmail, Calendar
expense-approval   finance, approval      Submit an expense; LLM categorizes; manager approves
lead-qualify       sales, crm             Qualify an inbound lead and score their fit

# point at a server when you want shared state
$ ./opensop --server https://your-opensop-server.example.com list`}</pre>
      </section>

      <section className="ed-section ed-section-runtimes" id="runtimes">
        <div className="ed-sec-head">
          <span className="ed-sec-num">08</span>
          <h2 className="ed-sec-h">CLI is the default. Server is optional.</h2>
          <p className="ed-sec-sub">The CLI runs processes locally. The reference server adds shared state, audit logs, and a REST API — but nothing forces you to run one. Same <code>.sop.yaml</code> on both sides; the spec is the contract.</p>
        </div>
        <div className="ed-sample-wrap">
          <table className="ed-sample-table">
            <thead>
              <tr>
                <th></th>
                <th>CLI — local execution</th>
                <th>Reference server (Rails)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>What it is</strong></td>
                <td>Bash script, single file. Executes <code>.sop.yaml</code> locally. Deps: curl + jq.</td>
                <td>Rails app that implements the OpenSOP HTTP spec. State in PostgreSQL; admin UI included.</td>
              </tr>
              <tr>
                <td><strong>Best for</strong></td>
                <td>Local runs, CI pipelines, agent-driven execution without a server</td>
                <td>Team-shared flows — DDQs, onboarding, expense approval, multi-week runs</td>
              </tr>
              <tr>
                <td><strong>State</strong></td>
                <td>Receipt JSON written locally per run. No remote dependency.</td>
                <td>PostgreSQL + audit log. Any agent can query <code>GET /sop/</code> for the process catalogue.</td>
              </tr>
              <tr>
                <td><strong>Install</strong></td>
                <td><code>curl -fsSL …/cli/bin/opensop -o opensop {'&&'} chmod +x opensop</code></td>
                <td><a href="https://github.com/Chosen9115/opensop-rails" target="_blank" rel="noopener noreferrer">github.com/Chosen9115/opensop-rails</a> — self-host, bring your own Postgres</td>
              </tr>
              <tr>
                <td><strong>Spec compliance</strong></td>
                <td>Implements spec v0.6 locally</td>
                <td>Reference implementation of spec v0.6. Others can implement the same spec.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="ed-section ed-section-vs">
        <div className="ed-vs-card ed-vs-card-dual">
          <div className="ed-vs-eb">What OpenSOP is not</div>
          <div className="ed-vs-grid">
            <div className="ed-vs-col">
              <h3 className="ed-vs-h-sm">Not an agent framework.</h3>
              <p>LangGraph, CrewAI, AutoGen decide <em>how</em> agents think. OpenSOP defines what their work is allowed to do — typed inputs, accepted outputs, gates, receipts.</p>
            </div>
            <div className="ed-vs-col">
              <h3 className="ed-vs-h-sm">Not a connector canvas.</h3>
              <p>n8n, Zapier, Make wire services together. OpenSOP is the process contract those services and agents execute — it can call connector tools, not replace them.</p>
            </div>
            <div className="ed-vs-col">
              <h3 className="ed-vs-h-sm">Not a SaaS platform.</h3>
              <p>The spec is open. The CLI runs locally. The reference server is one implementation — you can write your own. Nothing in OpenSOP requires an account, a cloud, or a vendor.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ed-quote">
        <blockquote>
          &ldquo;What you wrote is what runs. What ran is what&rsquo;s in the receipt.&rdquo;
        </blockquote>
      </section>

      <section className="ed-cta">
        <h2>A process is a file.<br />Start with the <span className="ed-italic">CLI</span>.</h2>
        <div className="ed-cta-row">
          <a className="ed-btn ed-btn-dark" href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">★ Standard + CLI on GitHub</a>
          <a className="ed-btn ed-btn-ghost" href="https://github.com/Chosen9115/opensop-rails" target="_blank" rel="noopener noreferrer">Reference server →</a>
        </div>
        <div className="ed-cta-meta">Apache 2.0 &middot; local-first &middot; spec v0.6 &middot; CLI v0.8.0</div>
      </section>

      <footer className="ed-foot">
        <div className="ed-foot-l">
          <div className="ed-logo"><svg width="20" height="20" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M5 11h12 M5 7h8 M5 15h6" stroke="currentColor" strokeWidth="1.4"/></svg> <span>OpenSOP</span></div>
          <p>Process as Infrastructure for agentic workflows — open standard, local-first CLI.<br />Apache 2.0 · 2026.</p>
        </div>
        <div className="ed-foot-cols">
          <div><h6>Standard</h6><a href="https://github.com/Chosen9115/opensop/blob/main/SPEC.md" target="_blank" rel="noopener noreferrer">Spec v0.6</a><a href="https://github.com/Chosen9115/opensop/blob/main/ROADMAP.md" target="_blank" rel="noopener noreferrer">Roadmap</a><a href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">Changelog</a></div>
          <div><h6>Developers</h6><a href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">CLI + spec</a><a href="https://github.com/Chosen9115/opensop-rails" target="_blank" rel="noopener noreferrer">Reference server</a><a href="https://github.com/Chosen9115/opensop/tree/main/docs" target="_blank" rel="noopener noreferrer">Docs</a><a href="https://github.com/Chosen9115/opensop/blob/main/docs/API.md" target="_blank" rel="noopener noreferrer">API reference</a><a href="https://github.com/Chosen9115/opensop/tree/main/processes/examples" target="_blank" rel="noopener noreferrer">Examples</a></div>
          <div><h6>Community</h6><a href="https://github.com/Chosen9115/opensop" target="_blank" rel="noopener noreferrer">GitHub</a><a href="https://github.com/Chosen9115/opensop/discussions" target="_blank" rel="noopener noreferrer">Discussions</a><a href="#agent-harness">Case study</a><a href="https://github.com/Chosen9115/opensop/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">Contributing</a></div>
        </div>
      </footer>
    </div>
  );
}

window.EditorialPage = EditorialPage;

// --- Boot stub: stateful App so hero/workflow switchers work ---
function __OpenSOPApp() {
  const [tweaks, setTweaks] = React.useState({ workflow: "morning-briefing", hero: "harness", density: "medium" });
  const setTweak = (k, v) => setTweaks(prev => ({ ...prev, [k]: v }));
  return <EditorialPage tweaks={tweaks} setTweak={setTweak} />;
}
ReactDOM.createRoot(document.getElementById("root")).render(<__OpenSOPApp />);
