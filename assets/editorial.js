/* global React */
const {
  useState: useState2,
  useEffect: useEffect2,
  useRef: useRef2
} = React;
const WORKFLOWS_2 = window.OPENSOP_WORKFLOWS;
const STEP_TYPES_2 = window.OPENSOP_STEP_TYPES;
function highlightYaml2(src) {
  return src.replace(/(#.*)$/gm, '<span class="ec-com">$1</span>').replace(/^(\s*-?\s*)([a-zA-Z_][\w-]*)(\s*:)/gm, '$1<span class="ec-key">$2</span>$3').replace(/(:\s*)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '$1<span class="ec-str">$2</span>').replace(/(:\s*)(true|false|null)\b/g, '$1<span class="ec-bool">$2</span>').replace(/(:\s*)(\d+(?:\.\d+)?[a-z]*)\b/g, '$1<span class="ec-num">$2</span>');
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
    fetch("https://api.github.com/repos/" + repo).then(r => r.ok ? r.json() : null).then(d => {
      if (d && typeof d.stargazers_count === "number") {
        setCount(d.stargazers_count);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            n: d.stargazers_count,
            t: Date.now()
          }));
        } catch (e) {}
      }
    }).catch(() => {});
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
function HarnessDiagram({
  workflow
}) {
  const canvasRef = useRef2(null);
  useEffect2(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * dpr;
      c.height = r.height * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    const ctx = c.getContext("2d");
    let raf, t0;
    const sources = ["agent", "human", "cron", "webhook"];
    const sinks = ["github", "stripe", "docusign", "postgres", "smtp", "slack"];
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
    const draw = now => {
      if (!t0) t0 = now;
      const r = c.getBoundingClientRect();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      const W = r.width,
        H = r.height;
      const leftX = 90,
        midX = W / 2,
        rightX = W - 90;
      const srcY = i => 30 + i * ((H - 60) / (sources.length - 1));
      const sinkY = i => 30 + i * ((H - 60) / (sinks.length - 1));

      // edges
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(20, 16, 10, 0.08)";
      sources.forEach((_, i) => {
        ctx.beginPath();
        ctx.moveTo(leftX, srcY(i));
        ctx.bezierCurveTo(midX - 60, srcY(i), midX - 80, H / 2, midX - 8, H / 2);
        ctx.stroke();
      });
      sinks.forEach((_, i) => {
        ctx.beginPath();
        ctx.moveTo(midX + 8, H / 2);
        ctx.bezierCurveTo(midX + 80, sinkY(i), midX + 60, sinkY(i), rightX, sinkY(i));
        ctx.stroke();
      });

      // tokens
      tokens.forEach(tok => {
        tok.t += 0.012 * tok.speed;
        if (tok.t > 1.2) return;
        let x, y;
        if (tok.from === "src") {
          // src -> hub -> sink
          if (tok.t < 0.5) {
            const u = tok.t / 0.5;
            const sx = leftX,
              sy = srcY(tok.srcIdx);
            const ex = midX,
              ey = H / 2;
            const cx1 = midX - 60,
              cx2 = midX - 80;
            x = bezier(u, sx, cx1, cx2, ex);
            y = bezier(u, sy, sy, H / 2, ey);
          } else {
            const u = (tok.t - 0.5) / 0.5;
            const sx = midX,
              sy = H / 2;
            const ex = rightX,
              ey = sinkY(tok.sinkIdx);
            const cx1 = midX + 80,
              cx2 = midX + 60;
            x = bezier(u, sx, cx1, cx2, ex);
            y = bezier(u, sy, ey, ey, ey);
          }
        } else {
          // sink response back to src
          const u = tok.t / 1.0;
          if (u < 0.5) {
            const v = u / 0.5;
            x = bezier(v, rightX, midX + 60, midX + 80, midX);
            y = bezier(v, sinkY(tok.idx), sinkY(tok.idx), H / 2, H / 2);
          } else {
            const v = (u - 0.5) / 0.5;
            x = bezier(v, midX, midX - 80, midX - 60, leftX);
            y = bezier(v, H / 2, H / 2, srcY(tok.srcIdx), srcY(tok.srcIdx));
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
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, [workflow.id]);
  function bezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "ed-harness"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-col ed-harness-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-h"
  }, "callers"), ["agent", "human", "cron", "webhook"].map(s => /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-pill",
    key: s
  }, s))), /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-mid"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    className: "ed-harness-canvas"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-hub"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-hub-tag"
  }, "opensop"), /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-hub-id"
  }, workflow.id), /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-hub-v"
  }, "v", (workflow.yaml.match(/version: "(.+?)"/) || [, "1.0"])[1]), /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-hub-trace"
  }, "trace 0x9f3a4c"))), /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-col ed-harness-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-h"
  }, "systems"), ["github", "stripe", "docusign", "postgres", "smtp", "slack"].map(s => /*#__PURE__*/React.createElement("div", {
    className: "ed-harness-pill",
    key: s
  }, s))));
}
function ProcessRibbon({
  workflow
}) {
  const [t, setT] = useState2(0);
  const total = workflow.steps.reduce((m, s) => Math.max(m, s.ms + s.dur), 0) + 600;
  useEffect2(() => {
    let raf, start;
    const tick = now => {
      if (!start) start = now;
      setT((now - start) % total);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [workflow.id, total]);
  return /*#__PURE__*/React.createElement("div", {
    className: "ed-ribbon"
  }, workflow.steps.map((s, i) => {
    const status = t < s.ms ? "pending" : t < s.ms + s.dur ? "running" : "done";
    const color = STEP_TYPES_2[s.type].color;
    return /*#__PURE__*/React.createElement("div", {
      className: `ed-ribbon-step ed-ribbon-${status}`,
      key: s.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "ed-ribbon-num"
    }, String(i + 1).padStart(2, "0")), /*#__PURE__*/React.createElement("div", {
      className: "ed-ribbon-type",
      style: {
        color
      }
    }, STEP_TYPES_2[s.type].label), /*#__PURE__*/React.createElement("div", {
      className: "ed-ribbon-name"
    }, s.name), /*#__PURE__*/React.createElement("div", {
      className: "ed-ribbon-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ed-ribbon-fill",
      style: {
        width: status === "done" ? "100%" : status === "running" ? `${(t - s.ms) / s.dur * 100}%` : "0%",
        background: color
      }
    })));
  }));
}
function EditorialPage({
  tweaks,
  setTweak
}) {
  const [wfId, setWfId] = useState2(tweaks.workflow);
  useEffect2(() => setWfId(tweaks.workflow), [tweaks.workflow]);
  const stars = useGitHubStars("Chosen9115/opensop");
  const starsLabel = formatStars(stars);
  const wf = WORKFLOWS_2.find(w => w.id === wfId) || WORKFLOWS_2[0];
  const heroes = {
    yaml: "yaml",
    harness: "harness",
    graph: "graph"
  };
  const heroId = heroes[tweaks.hero] || "harness";
  return /*#__PURE__*/React.createElement("div", {
    className: `ed ed-${tweaks.density}`,
    "data-screen-label": "V2 Editorial"
  }, /*#__PURE__*/React.createElement("header", {
    className: "ed-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-nav-l"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-logo"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 22 22"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "10",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 11h12 M5 7h8 M5 15h6",
    stroke: "currentColor",
    strokeWidth: "1.4"
  })), /*#__PURE__*/React.createElement("span", {
    className: "ed-logo-word"
  }, "OpenSOP"))), /*#__PURE__*/React.createElement("nav", {
    className: "ed-nav-c"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#runtime"
  }, "Runtime"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/blob/main/SPEC.md",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Spec"), /*#__PURE__*/React.createElement("a", {
    href: "#workflows"
  }, "Workflows"), /*#__PURE__*/React.createElement("a", {
    href: "#audit"
  }, "Audit"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/tree/main/docs",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Docs")), /*#__PURE__*/React.createElement("div", {
    className: "ed-nav-r"
  }, /*#__PURE__*/React.createElement("a", {
    className: "ed-nav-link",
    href: "#mvp"
  }, "MVP status"), /*#__PURE__*/React.createElement("a", {
    className: "ed-nav-cta",
    href: "https://github.com/Chosen9115/opensop",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "\u2605 Star", starsLabel ? " · " + starsLabel : ""))), /*#__PURE__*/React.createElement("section", {
    className: "ed-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-eb-num"
  }, "No. 01"), /*#__PURE__*/React.createElement("span", {
    className: "ed-eb-sep"
  }, "/"), /*#__PURE__*/React.createElement("span", null, "Process runtime + safety harness for agents"), /*#__PURE__*/React.createElement("span", {
    className: "ed-eb-sep"
  }, "/"), /*#__PURE__*/React.createElement("span", null, "v0.1 developer preview")), /*#__PURE__*/React.createElement("h1", {
    className: "ed-hero-h"
  }, "AI agents need a ", /*#__PURE__*/React.createElement("span", {
    className: "ed-italic"
  }, "harness"), ",", /*#__PURE__*/React.createElement("br", null), "not another ", /*#__PURE__*/React.createElement("span", {
    className: "ed-italic"
  }, "prompt"), "."), /*#__PURE__*/React.createElement("p", {
    className: "ed-hero-sub"
  }, "Define a process or agent workflow in YAML. Get a typed, versioned, auditable API. Humans and agents run the same steps through the same endpoints, with deterministic gates, append-only receipts and replayable state."), /*#__PURE__*/React.createElement("div", {
    className: "ed-hero-row"
  }, /*#__PURE__*/React.createElement("a", {
    className: "ed-btn ed-btn-dark",
    href: "https://github.com/Chosen9115/opensop",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "\u2605 Star on GitHub"), /*#__PURE__*/React.createElement("a", {
    className: "ed-btn ed-btn-ghost",
    href: "https://github.com/Chosen9115/opensop#readme",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Read the spec \u2192"), /*#__PURE__*/React.createElement("span", {
    className: "ed-hero-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-pulse"
  }), " v0.1 developer preview \xB7 Apache 2.0 \xB7 self-hostable")), /*#__PURE__*/React.createElement("div", {
    className: "ed-hero-figure"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-hero-fig-tabs"
  }, [["harness", "Agent harness"], ["yaml", "YAML → API"], ["graph", "Live run"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: `ed-fig-tab ${heroId === k ? "is-on" : ""}`,
    onClick: () => setTweak("hero", k)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "ed-hero-fig-body"
  }, heroId === "harness" && /*#__PURE__*/React.createElement(HarnessDiagram, {
    workflow: wf
  }), heroId === "yaml" && /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-pair"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-pane"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-head"
  }, /*#__PURE__*/React.createElement("span", null, wf.id, ".sop.yaml"), /*#__PURE__*/React.createElement("span", {
    className: "ed-yaml-meta"
  }, "v", (wf.yaml.match(/version: "(.+?)"/) || [, "1.0"])[1])), /*#__PURE__*/React.createElement("pre", {
    className: "ed-yaml-code",
    dangerouslySetInnerHTML: {
      __html: highlightYaml2(wf.yaml)
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-pane"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-head"
  }, /*#__PURE__*/React.createElement("span", null, "generated REST API"), /*#__PURE__*/React.createElement("span", {
    className: "ed-yaml-meta ed-live"
  }, "live")), /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-endpoints"
  }, wf.endpoints.map(e => {
    const [m, ...r] = e.split(/\s+/);
    return /*#__PURE__*/React.createElement("div", {
      className: "ed-ep",
      key: e
    }, /*#__PURE__*/React.createElement("span", {
      className: `ed-ep-m ed-ep-${m.toLowerCase()}`
    }, m), /*#__PURE__*/React.createElement("span", {
      className: "ed-ep-p"
    }, r.join(" ")));
  })))), heroId === "graph" && /*#__PURE__*/React.createElement(ProcessRibbon, {
    workflow: wf
  })))), /*#__PURE__*/React.createElement("section", {
    className: "ed-quote"
  }, /*#__PURE__*/React.createElement("blockquote", null, "\u201CLLM creativity belongs inside deterministic gates. OpenSOP gives every agent run typed inputs, accepted outputs, receipts and replay.\u201D"), /*#__PURE__*/React.createElement("cite", null, "\u2014 OpenSOP launch note")), /*#__PURE__*/React.createElement("section", {
    className: "ed-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-sec-num"
  }, "02"), /*#__PURE__*/React.createElement("h2", {
    className: "ed-sec-h"
  }, "A process harness for the agents you're about to deploy.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-three"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-three-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-three-icon ed-icon-1"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 40 40",
    width: "40",
    height: "40"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "6",
    width: "28",
    height: "28",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 14h16 M12 20h12 M12 26h8",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }))), /*#__PURE__*/React.createElement("h3", null, "The workflow is the contract."), /*#__PURE__*/React.createElement("p", null, "One YAML file. Inputs, outputs, steps, gates, retries. The runtime exposes it as a REST API automatically, so prompts do not become the hidden source of truth.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-three-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-three-icon ed-icon-2"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 40 40",
    width: "40",
    height: "40"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "20",
    cy: "20",
    r: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "20",
    cy: "20",
    r: "3",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 6v4 M20 30v4 M6 20h4 M30 20h4",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }))), /*#__PURE__*/React.createElement("h3", null, "Every agent gets rails."), /*#__PURE__*/React.createElement("p", null, "Each LLM call sits inside a narrow gate: structured prompt, typed output, size cap, parser, and deterministic checks before any side effect.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-three-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-three-icon ed-icon-3"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 40 40",
    width: "40",
    height: "40"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 30 L20 10 L34 30 Z",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 22h12",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }))), /*#__PURE__*/React.createElement("h3", null, "Receipts, audit, replay."), /*#__PURE__*/React.createElement("p", null, "Every run writes an append-only receipt with inputs, outputs, actor, process version and result. Diff a process change, replay a failed step, then ship the safer path.")))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section ed-section-worker",
    id: "agent-harness"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-sec-num"
  }, "03"), /*#__PURE__*/React.createElement("h2", {
    className: "ed-sec-h"
  }, "LLM creativity inside deterministic gates."), /*#__PURE__*/React.createElement("p", {
    className: "ed-sec-sub"
  }, "At Coba, OpenSOP runs opensop-worker: a Rust daemon that schedules 11 specialized agents across our Rails projects.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-three"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-three-col"
  }, /*#__PURE__*/React.createElement("h3", null, "Useful agents on schedule."), /*#__PURE__*/React.createElement("p", null, "PR review, dependency bumps, conflict resolution, Slack cooks, AGENTS.md generation, CI re-runs and release notes. The routine engineering work humans defer or forget runs on time.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-three-col"
  }, /*#__PURE__*/React.createElement("h3", null, "Narrow gates around every call."), /*#__PURE__*/React.createElement("p", null, "Each job has typed inputs and outputs, prompt templates with marker protocols, structured responses parsed by Rust, size caps and critical-path exclusions.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-three-col"
  }, /*#__PURE__*/React.createElement("h3", null, "Receipts before side effects."), /*#__PURE__*/React.createElement("p", null, "Every fire writes an append-only receipt. Ground-truth git diff checks catch schema drift, scope creep, hallucinated files and unsafe changes before anything touches production.")))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section ed-section-vs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-vs-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-vs-eb"
  }, "Not another agent framework"), /*#__PURE__*/React.createElement("h3", {
    className: "ed-vs-h"
  }, "OpenSOP defines the operational boundary."), /*#__PURE__*/React.createElement("p", null, "LangGraph, CrewAI, AutoGen and custom scripts decide how agents think and collaborate. OpenSOP defines what agent work is allowed to do: accepted inputs, expected outputs, validation before side effects and a receipt after every action."))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section ed-section-mvp",
    id: "mvp"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-sec-num"
  }, "04"), /*#__PURE__*/React.createElement("h2", {
    className: "ed-sec-h"
  }, "Honest v0.1 status."), /*#__PURE__*/React.createElement("p", {
    className: "ed-sec-sub"
  }, "The parser, executor, REST API, admin UI and RSpec coverage are real. ", /*#__PURE__*/React.createElement("code", null, "form"), ", ", /*#__PURE__*/React.createElement("code", null, "automated"), " and ", /*#__PURE__*/React.createElement("code", null, "notification"), " steps execute today. ", /*#__PURE__*/React.createElement("code", null, "judgment"), ", ", /*#__PURE__*/React.createElement("code", null, "approval"), ", ", /*#__PURE__*/React.createElement("code", null, "webhook"), ", ", /*#__PURE__*/React.createElement("code", null, "subprocess"), " and ", /*#__PURE__*/React.createElement("code", null, "wait"), " are modeled and callable as state transitions while full side effects harden."))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section ed-section-wf",
    id: "workflows"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-sec-num"
  }, "05"), /*#__PURE__*/React.createElement("h2", {
    className: "ed-sec-h"
  }, "Used internally at Coba; examples below."), /*#__PURE__*/React.createElement("p", {
    className: "ed-sec-sub"
  }, "Pick a process. The YAML below shows the contract OpenSOP turns into endpoints, state and audit trails.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-wf-pills"
  }, WORKFLOWS_2.map(w => /*#__PURE__*/React.createElement("button", {
    key: w.id,
    className: `ed-wf-pill ${wfId === w.id ? "is-on" : ""}`,
    onClick: () => {
      setWfId(w.id);
      setTweak("workflow", w.id);
    }
  }, w.name))), /*#__PURE__*/React.createElement("div", {
    className: "ed-wf-stats-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "runs"), /*#__PURE__*/React.createElement("b", null, wf.runs)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "p50"), /*#__PURE__*/React.createElement("b", null, wf.p50)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "success"), /*#__PURE__*/React.createElement("b", null, wf.success)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "endpoints"), /*#__PURE__*/React.createElement("b", null, wf.endpoints.length)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "steps"), /*#__PURE__*/React.createElement("b", null, wf.steps.length))), /*#__PURE__*/React.createElement("p", {
    className: "ed-wf-blurb-2"
  }, wf.blurb), /*#__PURE__*/React.createElement(ProcessRibbon, {
    workflow: wf
  }), /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-pair ed-yaml-pair-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-pane"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-head"
  }, /*#__PURE__*/React.createElement("span", null, wf.id, ".sop.yaml"), /*#__PURE__*/React.createElement("span", {
    className: "ed-yaml-meta"
  }, "v", (wf.yaml.match(/version: "(.+?)"/) || [, "1.0"])[1])), /*#__PURE__*/React.createElement("pre", {
    className: "ed-yaml-code",
    dangerouslySetInnerHTML: {
      __html: highlightYaml2(wf.yaml)
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-pane"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-head"
  }, /*#__PURE__*/React.createElement("span", null, "generated REST API"), /*#__PURE__*/React.createElement("span", {
    className: "ed-yaml-meta ed-live"
  }, "live")), /*#__PURE__*/React.createElement("div", {
    className: "ed-yaml-endpoints"
  }, wf.endpoints.map(e => {
    const [m, ...r] = e.split(/\s+/);
    return /*#__PURE__*/React.createElement("div", {
      className: "ed-ep",
      key: e
    }, /*#__PURE__*/React.createElement("span", {
      className: `ed-ep-m ed-ep-${m.toLowerCase()}`
    }, m), /*#__PURE__*/React.createElement("span", {
      className: "ed-ep-p"
    }, r.join(" ")));
  }))))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section ed-section-ledger",
    id: "audit"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-sec-num"
  }, "06"), /*#__PURE__*/React.createElement("h2", {
    className: "ed-sec-h"
  }, "Audit, diff, replay."), /*#__PURE__*/React.createElement("p", {
    className: "ed-sec-sub"
  }, "Every instance keeps inputs, outputs, agent confidences, and the exact process version. Diff ", /*#__PURE__*/React.createElement("em", null, "v1"), " against ", /*#__PURE__*/React.createElement("em", null, "v3"), ". Replay a failed step against a new threshold. Ship the improvement.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-ledger"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-ledger-head"
  }, /*#__PURE__*/React.createElement("span", null, "instance_id"), /*#__PURE__*/React.createElement("span", null, "v"), /*#__PURE__*/React.createElement("span", null, "status"), /*#__PURE__*/React.createElement("span", null, "at_step"), /*#__PURE__*/React.createElement("span", null, "duration"), /*#__PURE__*/React.createElement("span", null, "actor"), /*#__PURE__*/React.createElement("span", null)), [["i_9f3a4c", "v1.4", "running", "step.review", "+02m 14s", "agent"], ["i_8b21de", "v1.4", "completed", "—", "+04m 12s", "human"], ["i_7c10aa", "v1.3", "completed", "—", "+05m 31s", "agent"], ["i_6a09c1", "v1.3", "escalated", "step.compliance", "+03m 02s", "human"], ["i_5d99a0", "v1.2", "completed", "—", "+06m 48s", "agent"], ["i_4e8801", "v1.2", "failed", "step.verify", "+01m 09s", "system"]].map(r => /*#__PURE__*/React.createElement("div", {
    className: "ed-ledger-row",
    key: r[0]
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-ledger-id"
  }, r[0]), /*#__PURE__*/React.createElement("span", {
    className: "ed-ledger-v"
  }, r[1]), /*#__PURE__*/React.createElement("span", {
    className: `ed-ledger-st ed-ledger-${r[2]}`
  }, r[2]), /*#__PURE__*/React.createElement("span", {
    className: "ed-ledger-stp"
  }, r[3]), /*#__PURE__*/React.createElement("span", {
    className: "ed-ledger-dur"
  }, r[4]), /*#__PURE__*/React.createElement("span", {
    className: "ed-ledger-actor"
  }, r[5]), /*#__PURE__*/React.createElement("span", {
    className: "ed-ledger-replay"
  }, "\u21BB replay on v1.4")))), /*#__PURE__*/React.createElement("div", {
    className: "ed-diff"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-diff-pane ed-diff-old"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-diff-h"
  }, "v1.2"), /*#__PURE__*/React.createElement("pre", null, `steps:
  - id: review
    type: judgment
    judgment:
      confidence_threshold: 0.85
      escalation: manual
    retry: { max: 2 }

success: 91.4%`)), /*#__PURE__*/React.createElement("div", {
    className: "ed-diff-arrow"
  }, "\u2192"), /*#__PURE__*/React.createElement("div", {
    className: "ed-diff-pane ed-diff-new"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-diff-h"
  }, "v1.4 ", /*#__PURE__*/React.createElement("span", {
    className: "ed-diff-tag"
  }, "CURRENT")), /*#__PURE__*/React.createElement("pre", null, `steps:
  - id: review
    type: judgment
    judgment:
      confidence_threshold: 0.92  # tightened
      escalation: manual
      allow_agent: true
    retry: { max: 3, backoff: exponential }

success: ${wf.success}`)))), /*#__PURE__*/React.createElement("section", {
    className: "ed-section ed-section-api",
    id: "runtime"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-sec-num"
  }, "07"), /*#__PURE__*/React.createElement("h2", {
    className: "ed-sec-h"
  }, "Discoverable, typed, operational."), /*#__PURE__*/React.createElement("p", {
    className: "ed-sec-sub"
  }, /*#__PURE__*/React.createElement("code", null, "GET /sop/"), " returns a typed catalogue of every process your org runs. Any agent can discover what it is allowed to do and how to invoke it without scraping docs or guessing from chat history.")), /*#__PURE__*/React.createElement("pre", {
    className: "ed-api-block"
  }, `# discover everything an org can do
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
}`)), /*#__PURE__*/React.createElement("section", {
    className: "ed-section ed-section-vs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-vs-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-vs-eb"
  }, "A note on positioning"), /*#__PURE__*/React.createElement("h3", {
    className: "ed-vs-h"
  }, "OpenSOP is not a connector canvas."), /*#__PURE__*/React.createElement("p", null, "n8n, Zapier and Make wire services together. OpenSOP defines the process contract those services and agents execute: typed inputs, valid next steps, state, audit, replay and versioning. It can call connector tools. It is not trying to replace them."))), /*#__PURE__*/React.createElement("section", {
    className: "ed-cta"
  }, /*#__PURE__*/React.createElement("h2", null, "Give agents a harness.", /*#__PURE__*/React.createElement("br", null), "Give processes a runtime."), /*#__PURE__*/React.createElement("div", {
    className: "ed-cta-row"
  }, /*#__PURE__*/React.createElement("a", {
    className: "ed-btn ed-btn-dark",
    href: "https://github.com/Chosen9115/opensop",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "\u2605 Star on GitHub")), /*#__PURE__*/React.createElement("div", {
    className: "ed-cta-meta"
  }, "Apache 2.0 \xB7 self-hostable \xB7 Rails + Postgres \xB7 v0.1 developer preview")), /*#__PURE__*/React.createElement("section", {
    className: "ed-quickstart"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-qs-eb"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ed-pulse"
  }), " Quickstart"), /*#__PURE__*/React.createElement("h2", {
    className: "ed-qs-h"
  }, "Ship your first process", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "ed-italic"
  }, "with receipts.")), /*#__PURE__*/React.createElement("pre", {
    className: "ed-qs-block"
  }, `$ git clone https://github.com/Chosen9115/opensop && cd opensop
$ bin/setup                                          # bundle + db:prepare + bin/dev → http://localhost:3000

$ curl http://localhost:3000/sop/                    # discover the example processes
{ "processes": [
  { "name": "customer-onboarding", "version": "1.0", "schema_url": "/sop/customer-onboarding/schema" },
  { "name": "lead-qualification",  "version": "1.0", "schema_url": "/sop/lead-qualification/schema" }
] }

$ curl -X POST http://localhost:3000/sop/customer-onboarding/start \\
       -H "Content-Type: application/json" \\
       -d '{"company_name":"Acme Corp"}'
{ "instance_id": "01HX...", "next_step": "collect-business-info" }`), /*#__PURE__*/React.createElement("div", {
    className: "ed-qs-row"
  }, /*#__PURE__*/React.createElement("a", {
    className: "ed-btn ed-btn-dark",
    href: "https://github.com/Chosen9115/opensop",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "\u2605 Star on GitHub"))), /*#__PURE__*/React.createElement("footer", {
    className: "ed-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-foot-l"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-logo"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 22 22"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "10",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 11h12 M5 7h8 M5 15h6",
    stroke: "currentColor",
    strokeWidth: "1.4"
  })), " ", /*#__PURE__*/React.createElement("span", null, "OpenSOP")), /*#__PURE__*/React.createElement("p", null, "A process runtime and safety harness for agent workflows.", /*#__PURE__*/React.createElement("br", null), "Apache 2.0 \xB7 2026.")), /*#__PURE__*/React.createElement("div", {
    className: "ed-foot-cols"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h6", null, "Product"), /*#__PURE__*/React.createElement("a", {
    href: "#runtime"
  }, "Runtime"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/blob/main/SPEC.md",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Spec v0.1"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/blob/main/ROADMAP.md",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Roadmap"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Changelog")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h6", null, "Developers"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/tree/main/docs",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Docs"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/blob/main/docs/API.md",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "API reference"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/blob/main/docs/opensop.postman.json",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Postman"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/tree/main/processes/examples",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Examples")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h6", null, "Community"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "GitHub"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/discussions",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Discussions"), /*#__PURE__*/React.createElement("a", {
    href: "#agent-harness"
  }, "Case study"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/Chosen9115/opensop/blob/main/CONTRIBUTING.md",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Contributing")))));
}
window.EditorialPage = EditorialPage;

// --- Boot stub: stateful App so hero/workflow switchers work ---
function __OpenSOPApp() {
  const [tweaks, setTweaks] = React.useState({
    workflow: "kyb",
    hero: "graph",
    density: "medium"
  });
  const setTweak = (k, v) => setTweaks(prev => ({
    ...prev,
    [k]: v
  }));
  return /*#__PURE__*/React.createElement(EditorialPage, {
    tweaks: tweaks,
    setTweak: setTweak
  });
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(__OpenSOPApp, null));
