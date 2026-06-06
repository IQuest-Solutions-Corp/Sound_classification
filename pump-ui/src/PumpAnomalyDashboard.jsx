/**
 * Pump Anomaly Detection System — React Frontend
 * ================================================
 * Migrated from Streamlit | FastAPI Backend: http://localhost:8001
 *
 * Color scheme preserved exactly:
 *   Primary Blue  : #1f77b4
 *   Secondary Blue: #4a9eff
 *   Light Blue    : #80b9ff
 *   Background    : #0e1117
 *   Card BG       : #1a1a1a
 *   Sidebar BG    : #000000
 *   Text          : #ffffff
 *   Muted         : #999999
 *   Border        : #333333
 *   Red (abnormal): #ff6b6b
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend, ResponsiveContainer, ReferenceLine, LabelList,
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const API_URL = "http://localhost:8001";

const C = {
  primary:    "#1f77b4",
  secondary:  "#4a9eff",
  light:      "#80b9ff",
  bg:         "#0e1117",
  cardBg:     "#1a1a1a",
  sidebarBg:  "#000000",
  text:       "#ffffff",
  muted:      "#999999",
  border:     "#333333",
  red:        "#ff6b6b",
  green:      "#28a745",
};

// Feature groups matching Streamlit app.py exactly
const FEATURE_GROUPS = {
  "MFCCs": {
    range: [0, 13],
    desc: "Represent the short-term power spectrum of sound, capturing timbre and texture characteristics similar to human hearing perception.",
  },
  "Spectral": {
    range: [13, 19],
    desc: "Measure frequency distribution properties like brightness, energy concentration, and tonal balance in the audio signal over time.",
  },
  "Temporal": {
    range: [19, 23],
    desc: "Capture time-domain characteristics including signal energy variations, zero-crossing patterns, and amplitude envelope dynamics over duration.",
  },
  "Advanced": {
    range: [23, 35],
    desc: "Complex acoustic properties including spectral entropy, harmonic content, and energy distribution patterns for detailed sound characterization.",
  },
  "New Features": {
    range: [35, 42],
    desc: "Discriminative attributes like pitch tracking, flatness, crest factor, and kurtosis measuring signal impulsiveness and statistical distribution shape.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const barColor = (absZ) =>
  absZ >= 2 ? C.primary : absZ >= 1 ? C.secondary : C.light;

const boldify = (text) =>
  (text || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

const toPercent = (v) => `${((v || 0) * 100).toFixed(2)}%`;

// ═══════════════════════════════════════════════════════════════════════════
// BASE UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Divider = ({ my = "1.5rem" }) => (
  <div style={{ height: 1, backgroundColor: C.border, margin: `${my} 0` }} />
);

const Card = ({ children, style = {} }) => (
  <div
    style={{
      backgroundColor: C.cardBg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "1.25rem",
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionHeading = ({ children, level = 2, style = {} }) => {
  const sizes  = { 1: "1.5rem", 2: "1.2rem", 3: "1rem" };
  const colors = { 1: C.text,   2: C.secondary, 3: C.secondary };
  return (
    <div
      style={{
        color: colors[level],
        fontWeight: 700,
        fontSize: sizes[level],
        marginBottom: "1rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const AlertBox = ({ type = "info", children }) => {
  const map = {
    error:   { bg: "#1a1a1a", border: C.red },
    warning: { bg: "#1a1a1a", border: C.secondary },
    success: { bg: C.sidebarBg, border: C.primary },
    info:    { bg: C.sidebarBg, border: C.primary },
  };
  const s = map[type] || map.info;
  return (
    <div
      style={{
        backgroundColor: s.bg,
        color: C.text,
        padding: "1.25rem 1.5rem",
        borderRadius: 12,
        borderLeft: `6px solid ${s.border}`,
        margin: "0.5rem 0",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        lineHeight: 1.7,
      }}
    >
      {children}
    </div>
  );
};

const Badge = ({ severity }) => {
  const cfg = {
    Severe:   { bg: C.red,       icon: "🔴" },
    Moderate: { bg: C.secondary, icon: "🟡" },
    Normal:   { bg: C.primary,   icon: "🟢" },
  };
  const { bg, icon } = cfg[severity] || { bg: C.primary, icon: "⚪" };
  return (
    <span
      style={{
        backgroundColor: bg,
        color: "#fff",
        padding: "0.2rem 0.55rem",
        borderRadius: 4,
        fontSize: "0.75rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {icon} {severity}
    </span>
  );
};

const MetricCard = ({ label, value, delta, deltaColor }) => (
  <div
    style={{
      backgroundColor: C.cardBg,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "1.25rem",
      textAlign: "center",
    }}
  >
    <div
      style={{
        color: C.muted,
        fontSize: "0.78rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "0.5rem",
      }}
    >
      {label}
    </div>
    <div
      style={{
        color: C.primary,
        fontSize: "1.85rem",
        fontWeight: 700,
        marginBottom: delta ? "0.25rem" : 0,
      }}
    >
      {value}
    </div>
    {delta && (
      <div style={{ color: deltaColor || C.secondary, fontSize: "0.8rem", fontWeight: 600 }}>
        {delta}
      </div>
    )}
  </div>
);

const Collapsible = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        marginBottom: "0.5rem",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "0.8rem 1rem",
          backgroundColor: C.cardBg,
          color: C.primary,
          fontWeight: 600,
          fontSize: "0.9rem",
          textAlign: "left",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: "0.75rem", color: C.muted }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div style={{ padding: "1rem 1.25rem", backgroundColor: C.bg }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const SidebarCard = ({ title, children }) => (
  <div
    style={{
      backgroundColor: C.sidebarBg,
      border: `1px solid ${C.primary}`,
      borderRadius: 8,
      padding: "1rem",
      marginBottom: "1rem",
    }}
  >
    <div
      style={{
        color: C.primary,
        fontWeight: 600,
        fontSize: "0.9rem",
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: "0.5rem",
        marginBottom: "0.75rem",
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

const SidebarRow = ({ label, value, small = false }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "0.3rem",
    }}
  >
    <span style={{ color: C.muted, fontSize: "0.85rem" }}>{label}:</span>
    <span
      style={{
        color: C.primary,
        fontWeight: 600,
        fontSize: small ? "0.72rem" : "0.85rem",
        textAlign: "right",
      }}
    >
      {value}
    </span>
  </div>
);

function Sidebar({ apiHealthy, trainingReport, onToggle }) {
  const ds  = trainingReport?.dataset_info || {};
  const tot = ds?.class_distribution?.total || {};
  const tp  = trainingReport?.test_performance || {};
  const m   = tp?.metrics || {};
  const cm  = tp?.confusion_matrix || {};
  const md  = trainingReport?.metadata || {};

  const cmCells = [
    { l: "TP", v: cm.true_positives  ?? 0 },
    { l: "FP", v: cm.false_positives ?? 0, bL: true },
    { l: "FN", v: cm.false_negatives ?? 0, bT: true },
    { l: "TN", v: cm.true_negatives  ?? 0, bT: true, bL: true },
  ];

  return (
    <div
      className="sidebar-scroll"
      style={{
        width: 280,
        minWidth: 280,
        backgroundColor: C.sidebarBg,
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        padding: "1.5rem 1rem",
        borderRight: `1px solid ${C.border}`,
      }}
    >
      {/* Header row: title left, toggle button right — fully inside sidebar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ color: C.primary, fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
          System Status
        </h2>
        <button
          onClick={onToggle}
          title="Toggle sidebar"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = C.primary;
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = C.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = C.secondary;
            e.currentTarget.style.borderColor = C.border;
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: "transparent",
            border: `1px solid ${C.border}`,
            color: C.secondary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          <PanelLeftIcon size={16} color="currentColor" />
        </button>
      </div>

      {trainingReport ? (
        <>
          <SidebarCard title="Dataset">
            <SidebarRow label="Total Samples" value={(ds.total_samples || 0).toLocaleString()} />
            <SidebarRow label="Normal"         value={(tot.normal    || 0).toLocaleString()} />
            <SidebarRow label="Abnormal"       value={(tot.abnormal  || 0).toLocaleString()} />
          </SidebarCard>

          <SidebarCard title="Model Performance">
            <SidebarRow label="F1 Score"  value={m?.f1_score?.percentage  || "N/A"} />
            <SidebarRow label="Recall"    value={m?.recall?.percentage     || "N/A"} />
            <SidebarRow label="Precision" value={m?.precision?.percentage  || "N/A"} />
            <SidebarRow label="Version"   value={md?.version || "N/A"} small />
          </SidebarCard>

          <SidebarCard title="Confusion Matrix">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {cmCells.map(({ l, v, bT, bL }) => (
                <div
                  key={l}
                  style={{
                    padding: "0.75rem",
                    textAlign: "center",
                    borderTop:  bT ? `1px solid ${C.border}` : "none",
                    borderLeft: bL ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <div style={{ color: C.muted, fontSize: "0.75rem", marginBottom: "0.3rem" }}>{l}</div>
                  <div style={{ color: C.primary, fontWeight: 600, fontSize: "1.2rem" }}>{v}</div>
                </div>
              ))}
            </div>
          </SidebarCard>
        </>
      ) : (
        <div style={{ color: C.muted, fontSize: "0.875rem" }}>Data summary unavailable</div>
      )}

      {/* About */}
      <div style={{ marginTop: "1.5rem" }}>
        <h3
          style={{ color: C.primary, fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}
        >
          About
        </h3>
        <p style={{ color: C.text, fontSize: "0.8rem", lineHeight: 1.75, margin: 0 }}>
          <strong>Pump Anomaly Detection System</strong>
          <br /><br />
          Uses XGBoost machine learning model to detect abnormal pump sounds.
          <br /><br />
          <strong>Features:</strong>
          <br />
          • Real-time audio analysis<br />
          • Explainable AI predictions<br />
          • Interactive visualizations<br />
          • 42 acoustic features
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function DeviationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d   = payload[0]?.payload || {};
  const nm  = d.normal_mean ?? 0;
  const ns  = d.normal_std  ?? 0;
  return (
    <div
      style={{
        backgroundColor: C.cardBg,
        border: `1px solid ${C.primary}`,
        borderRadius: 8,
        padding: "0.85rem",
        fontSize: "0.78rem",
        color: C.text,
        maxWidth: 270,
        lineHeight: 1.8,
      }}
    >
      <div style={{ fontWeight: 700, color: C.primary, marginBottom: "0.4rem" }}>
        {d.feature_name}
      </div>
      <div>Test Value: <strong>{(d.user_value ?? 0).toFixed(6)}</strong></div>
      <div>Normal Mean: <strong>{nm.toFixed(6)}</strong></div>
      <div style={{ marginTop: "0.3rem", color: C.muted }}>Normal Range (±1σ):</div>
      <div>&nbsp;&nbsp;{(nm - ns).toFixed(4)} → {(nm + ns).toFixed(4)}</div>
      <div style={{ color: C.muted }}>Moderate Range (±2σ):</div>
      <div>&nbsp;&nbsp;{(nm - 2 * ns).toFixed(4)} → {(nm + 2 * ns).toFixed(4)}</div>
      <div style={{ marginTop: "0.3rem" }}>
        Z-Score: <strong>{(d.z_score ?? 0).toFixed(2)}σ</strong>
      </div>
      <div>
        Severity: <strong style={{ color: d.severity === "Severe" ? C.red : d.severity === "Moderate" ? C.secondary : C.primary }}>{d.severity}</strong>
      </div>
    </div>
  );
}

function DeviationChart({ deviations }) {
  const data = (deviations || []).slice(0, 10).map((d) => ({
    ...d,
    display_name: (d.feature_name || "").replace(/_/g, " "),
  }));

  return (
    <>
      <SectionHeading level={3}>Feature Deviation from Normal (Z-Scores)</SectionHeading>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 65, left: 130, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: C.text, fontSize: 11 }}
            domain={["auto", "auto"]}
            tickLine={{ stroke: C.border }}
            axisLine={{ stroke: C.border }}
          />
          <YAxis
            type="category"
            dataKey="display_name"
            tick={{ fill: C.text, fontSize: 10 }}
            width={130}
            tickLine={false}
            axisLine={{ stroke: C.border }}
          />
          <Tooltip content={<DeviationTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <ReferenceLine x={0}  stroke="gray"     strokeOpacity={0.5} />
          <ReferenceLine x={2}  stroke={C.secondary} strokeDasharray="5 4" strokeOpacity={0.7} />
          <ReferenceLine x={-2} stroke={C.secondary} strokeDasharray="5 4" strokeOpacity={0.7} />
          <ReferenceLine x={1}  stroke={C.light}   strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine x={-1} stroke={C.light}   strokeDasharray="3 3" strokeOpacity={0.4} />
          <Bar dataKey="z_score" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="z_score"
              position="right"
              formatter={(v) => `${Number(v).toFixed(2)}σ`}
              style={{ fill: C.text, fontSize: 10 }}
            />
            {data.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.abs_z_score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

function SeverityPie({ deviations }) {
  const severe   = (deviations || []).filter((d) => d.severity === "Severe").length;
  const moderate = (deviations || []).filter((d) => d.severity === "Moderate").length;
  const normal   = (deviations || []).filter((d) => d.severity === "Normal").length;

  const data = [
    { name: "Severe",   value: severe,   fill: C.primary   },
    { name: "Moderate", value: moderate, fill: C.secondary },
    { name: "Normal",   value: normal,   fill: C.light     },
  ].filter((d) => d.value > 0);

  return (
    <>
      <SectionHeading level={3}>Deviation Severity Distribution</SectionHeading>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            outerRadius={85}
            innerRadius={38}
            strokeWidth={2}
            stroke={C.bg}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Legend
            wrapperStyle={{ color: C.text, fontSize: "0.85rem", paddingTop: "0.5rem" }}
          />
          <Tooltip
            formatter={(value, name) => [value + " features", name]}
            contentStyle={{
              backgroundColor: C.cardBg,
              border: `1px solid ${C.primary}`,
              borderRadius: 8,
              color: C.text,
              fontSize: "0.8rem",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: EXPLAINABILITY
// ═══════════════════════════════════════════════════════════════════════════

function ExplainabilityTab({ explainability }) {
  const { explanation_text, deviations, stats_available } = explainability || {};
  const allDevs = deviations?.all || [];
  const top10   = allDevs.slice(0, 10);

  if (!stats_available) {
    return (
      <AlertBox type="warning">
        <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>⚠️ Limited Explainability</div>
        <div style={{ fontSize: "0.875rem" }}>
          Training statistics not available. Run{" "}
          <code
            style={{
              backgroundColor: "#2a2a2a",
              padding: "0.1rem 0.4rem",
              borderRadius: 4,
              fontFamily: "monospace",
            }}
          >
            training_stats_generator.py
          </code>{" "}
          to enable full explainability features.
        </div>
        {explanation_text && (
          <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
            {explanation_text}
          </div>
        )}
      </AlertBox>
    );
  }

  return (
    <div>
      <SectionHeading level={1}>Why This Prediction?</SectionHeading>

      {/* Natural language explanation */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <SectionHeading level={2} style={{ marginBottom: "0.75rem" }}>Explanation</SectionHeading>
        {(explanation_text || "").split("\n").map((line, i) => (
          <p
            key={i}
            style={{ color: C.text, margin: "0.2rem 0", fontSize: "0.9rem", lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: boldify(line) || "&nbsp;" }}
          />
        ))}
      </Card>

      <Divider />

      {allDevs.length > 0 && (
        <>
          <SectionHeading level={2}>Feature Deviation Analysis</SectionHeading>

          {/* Charts row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <Card>
              <DeviationChart deviations={allDevs} />
            </Card>
            <Card>
              <SeverityPie deviations={allDevs} />
            </Card>
          </div>

          {/* Top 10 Feature Table */}
          <Card style={{ marginBottom: "1.5rem" }}>
            <SectionHeading level={2}>Top 10 Deviating Features</SectionHeading>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                <thead>
                  <tr>
                    {["Feature", "Z-Score", "Severity", "Your Value", "Normal Mean", "Description"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "0.65rem 0.6rem",
                            color: C.muted,
                            textAlign: "left",
                            borderBottom: `1px solid ${C.border}`,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {top10.map((d, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      }}
                    >
                      <td style={{ padding: "0.55rem 0.6rem", color: C.text, fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {d.feature_name}
                      </td>
                      <td style={{ padding: "0.55rem 0.6rem", color: C.primary, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {(d.z_score ?? 0).toFixed(2)}σ
                      </td>
                      <td style={{ padding: "0.55rem 0.6rem" }}>
                        <Badge severity={d.severity} />
                      </td>
                      <td style={{ padding: "0.55rem 0.6rem", color: C.text, fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {(d.user_value ?? 0).toFixed(4)}
                      </td>
                      <td style={{ padding: "0.55rem 0.6rem", color: C.text, fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {(d.normal_mean ?? 0).toFixed(4)}
                      </td>
                      <td style={{ padding: "0.55rem 0.6rem", color: C.muted, fontSize: "0.78rem" }}>
                        {d.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Interpretation Guide */}
          <Collapsible title="How to Interpret These Results">
            <div style={{ color: C.text, fontSize: "0.875rem", lineHeight: 1.75 }}>
              <p style={{ margin: "0 0 0.5rem" }}>
                <strong style={{ color: C.primary }}>Z-Score (Standard Deviations):</strong>
              </p>
              <p style={{ margin: "0 0 0.25rem" }}>
                Shows how far each feature is from normal training data
              </p>
              <ul style={{ paddingLeft: "1.5rem", margin: "0.5rem 0 1rem" }}>
                <li>🔴 <strong>|Z| &gt; 2.0</strong> — Severe deviation (high alert)</li>
                <li>🟠 <strong>1.0 &lt; |Z| &lt; 2.0</strong> — Moderate deviation (warning)</li>
                <li>🟢 <strong>|Z| &lt; 1.0</strong> — Within normal range</li>
              </ul>

              <Divider my="0.75rem" />

              <p style={{ margin: "0 0 0.5rem" }}>
                <strong style={{ color: C.primary }}>Why Use 2σ Instead of 3σ?</strong>
              </p>
              <p style={{ margin: "0 0 1rem" }}>
                This is a safety-critical design decision for industrial equipment monitoring.
                In pump monitoring: it's better to inspect 10 times unnecessarily than miss 1 real failure.
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      {["Error Type", "In 3σ System", "In 2σ System", "Cost"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "0.5rem",
                            color: C.muted,
                            textAlign: "left",
                            borderBottom: `1px solid ${C.border}`,
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "0.5rem", color: C.text }}>False Positive</td>
                      <td style={{ padding: "0.5rem", color: C.text }}>Lower</td>
                      <td style={{ padding: "0.5rem", color: C.text }}>Higher</td>
                      <td style={{ padding: "0.5rem", color: C.muted }}>Unnecessary inspection = ~$1,000</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "0.5rem", color: C.text }}>False Negative</td>
                      <td style={{ padding: "0.5rem", color: C.text }}>Higher</td>
                      <td style={{ padding: "0.5rem", color: C.text }}>Lower</td>
                      <td style={{ padding: "0.5rem", color: C.muted }}>Missed failure = $100,000+ (damage, safety risk)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: "rgba(31,119,180,0.12)",
                  borderRadius: 6,
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  color: C.light,
                }}
              >
                Statistical Interpretation:<br />
                • 2σ threshold = 95% confidence<br />
                • Only 5% of truly normal samples exceed this<br />
                • If your pump exceeds 2σ, there's a 95% chance something is wrong
              </div>
            </div>
          </Collapsible>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: FEATURE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function FeatureAnalysisTab({ features, filename }) {
  const values = features?.values || [];
  const names  = features?.names  || [];

  const download = (content, fname, mime) => {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const rows = [
      ["Index", "Feature Name", "Value"],
      ...names.map((n, i) => [i + 1, n, values[i]]),
    ];
    download(rows.map((r) => r.join(",")).join("\n"), `pump_features_${(filename || "audio").replace(".wav", "")}.csv`, "text/csv");
  };

  const downloadJSON = () => {
    const data = {
      filename,
      features: Object.fromEntries(names.map((n, i) => [n, values[i]])),
    };
    download(JSON.stringify(data, null, 2), `pump_analysis_${(filename || "audio").replace(".wav", "")}.json`, "application/json");
  };

  return (
    <div>
      <SectionHeading level={1}>Extracted Features</SectionHeading>
      <p style={{ color: C.muted, marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Complete list of 42 acoustic features extracted from your audio.
      </p>

      {Object.entries(FEATURE_GROUPS).map(([groupName, { range, desc }], gi) => {
        const gNames  = names.slice(range[0], range[1]);
        const gValues = values.slice(range[0], range[1]);
        const count   = range[1] - range[0];
        return (
          <Collapsible
            key={groupName}
            title={`${groupName}  (${count} features)`}
            defaultOpen={gi === 0}
          >
            <p style={{ color: C.muted, fontSize: "0.85rem", marginBottom: "1rem", lineHeight: 1.6 }}>
              {desc}
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr>
                  {["Index", "Feature Name", "Value"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.55rem 0.6rem",
                        color: C.muted,
                        textAlign: "left",
                        borderBottom: `1px solid ${C.border}`,
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gNames.map((n, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    }}
                  >
                    <td style={{ padding: "0.5rem 0.6rem", color: C.muted }}>{range[0] + i + 1}</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: C.text, fontFamily: "monospace", fontSize: "0.8rem" }}>{n}</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: C.primary, fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {typeof gValues[i] === "number" ? gValues[i].toFixed(6) : gValues[i]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: C.muted, fontSize: "0.78rem", marginTop: "0.5rem", textAlign: "right" }}>
              {count} features in this group
            </p>
          </Collapsible>
        );
      })}

      <Divider />

      <SectionHeading level={2}>Download Feature Data</SectionHeading>
      <div style={{ display: "flex", gap: "1rem" }}>
        {[
          { label: "⬇  Download Features (CSV)", fn: downloadCSV },
          { label: "⬇  Download Full Report (JSON)", fn: downloadJSON },
        ].map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            style={{
              flex: 1,
              padding: "0.75rem 1.25rem",
              backgroundColor: C.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = C.secondary)}
            onMouseLeave={(e) => (e.target.style.backgroundColor = C.primary)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════

function RecommendationsTab({ recommendations, prediction }) {
  const getType = (rec) => {
    if (rec.includes("URGENT") || rec.includes("Immediate"))  return "error";
    if (rec.includes("⚠️"))  return "warning";
    return "success";
  };

  return (
    <div>
      <SectionHeading level={1}>Recommendations</SectionHeading>

      {recommendations?.length > 0 ? (
        recommendations.map((rec, i) => (
          <AlertBox key={i} type={getType(rec)}>
            <span style={{ fontSize: "0.9rem" }} dangerouslySetInnerHTML={{ __html: boldify(rec) }} />
          </AlertBox>
        ))
      ) : prediction === "Normal" ? (
        <AlertBox type="success">
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>✅ Continue Normal Operations</div>
          <ul style={{ paddingLeft: "1.5rem", fontSize: "0.875rem", margin: 0 }}>
            <li>Monitor regularly for any changes</li>
            <li>Maintain scheduled maintenance</li>
            <li>Keep logs for trend analysis</li>
          </ul>
        </AlertBox>
      ) : (
        <AlertBox type="warning">
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>⚠️ Immediate Action Required</div>
          <ul style={{ paddingLeft: "1.5rem", fontSize: "0.875rem", margin: 0 }}>
            <li>Schedule inspection immediately</li>
            <li>Check features with high deviation scores</li>
            <li>Review maintenance records</li>
            <li>Consider backup pump activation</li>
          </ul>
        </AlertBox>
      )}

      <Divider />

      <SectionHeading level={2}>Next Steps</SectionHeading>
      <AlertBox type="info">
        <ol style={{ paddingLeft: "1.5rem", fontSize: "0.875rem", margin: 0, lineHeight: 2 }}>
          <li><strong>Document the results</strong> — Save this report for records</li>
          <li><strong>Compare with history</strong> — Look at trends over time</li>
          <li><strong>Take action</strong> — Follow the recommendations above</li>
          <li><strong>Re-test</strong> — Monitor and re-test after any interventions</li>
          <li><strong>Contact support</strong> — If unsure, consult maintenance team</li>
        </ol>
      </AlertBox>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════

const TABS = ["Explainability", "Feature Analysis", "Recommendations"];

// ── SIDEBAR TOGGLE ICON ───────────────────────────────────────────────────
// Same icon always — open or closed state. Looks like a panel-left layout.
// Identical to the icon style used in VS Code, Notion, Linear for sidebar toggle.
const PanelLeftIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", flexShrink: 0 }}
  >
    {/* Outer app window frame */}
    <rect
      x="1.5" y="1.5" width="15" height="15" rx="2"
      stroke={color} strokeWidth="1.5"
    />
    {/* Vertical divider — the sidebar panel boundary */}
    <line
      x1="6.5" y1="1.5" x2="6.5" y2="16.5"
      stroke={color} strokeWidth="1.5"
    />
    {/* Three short lines in the left panel (sidebar content hint) */}
    <line x1="3" y1="5.5"  x2="5.2" y2="5.5"  stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="3" y1="8"    x2="5.2" y2="8"    stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="3" y1="10.5" x2="5.2" y2="10.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export default function App() {
  const [apiHealthy,     setApiHealthy]     = useState(false);
  const [trainingReport, setTrainingReport] = useState(null);
  const [file,           setFile]           = useState(null);
  const [audioUrl,       setAudioUrl]       = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState(null);
  const [activeTab,      setActiveTab]      = useState(0);
  const [showRaw,        setShowRaw]        = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [dragging,       setDragging]       = useState(false);
  const inputRef = useRef(null);

  // On mount: check API health + fetch training report
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const r = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
        setApiHealthy(r.ok);
      } catch { setApiHealthy(false); }
    };
    const fetchReport = async () => {
      try {
        const r = await fetch(`${API_URL}/training-report`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) setTrainingReport(await r.json());
      } catch {}
    };
    checkHealth();
    fetchReport();
    // Poll health every 30 s
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".wav")) {
      setError("Invalid file format. Only .wav files are supported.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10 MB.");
      return;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(f);
    setAudioUrl(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    setShowRaw(false);
  }, [audioUrl]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const r = await fetch(`${API_URL}/predict`, { method: "POST", body: form });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${r.status}`);
      }
      const data = await r.json();
      setResult(data);
      setActiveTab(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const prediction = result?.prediction;
  const isAbnormal = prediction === "Abnormal";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: C.bg,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        color: C.text,
      }}
    >
      {/* ── SIDEBAR ── */}
      {/* Sidebar — toggle button lives inside the component now, no wrapper needed */}
      {sidebarOpen && (
        <Sidebar
          apiHealthy={apiHealthy}
          trainingReport={trainingReport}
          onToggle={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MAIN CONTENT ── */}
      <div
        className="main-scroll"
        style={{
          flex: 1,
          padding: "2rem 3rem",
          overflowY: "auto",
          maxWidth: sidebarOpen ? "calc(100vw - 280px)" : "100vw",
        }}
      >
        {/* Expand sidebar button when collapsed — same PanelLeftIcon, always */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="Toggle sidebar"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.primary; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = C.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.cardBg; e.currentTarget.style.color = C.secondary; e.currentTarget.style.borderColor = C.border; }}
            style={{
              marginBottom: "1.5rem",
              backgroundColor: C.cardBg,
              border: `1px solid ${C.border}`,
              color: C.secondary,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              flexShrink: 0,
            }}
          >
            <PanelLeftIcon size={16} color="currentColor" />
          </button>
        )}

        {/* ── HEADER ── */}
        <h1
          style={{
            textAlign: "center",
            fontSize: "2.6rem",
            fontWeight: 700,
            color: C.primary,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            marginBottom: "0.4rem",
          }}
        >
          Faulty Pump Detection System
        </h1>
        <p style={{ textAlign: "center", color: C.muted, fontSize: "1.15rem", marginBottom: "2rem" }}>
          AI-Powered Acoustic Analysis with Explainability
        </p>

        {/* ── API OFFLINE BANNER ── */}
        {!apiHealthy && (
          <AlertBox type="error">
            <strong>⚠️ API Server Not Connected!</strong> Please start the API server before using this interface.
            <div
              style={{
                marginTop: "0.5rem",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                color: C.muted,
                backgroundColor: "#111",
                padding: "0.4rem 0.75rem",
                borderRadius: 6,
                display: "inline-block",
              }}
            >
              uvicorn main:app --host 0.0.0.0 --port 8001 --reload
            </div>
          </AlertBox>
        )}

        {/* ── UPLOAD SECTION ── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ color: C.text, fontWeight: 600, marginBottom: "0.75rem" }}>
            Upload Pump Audio
          </h3>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            style={{
              backgroundColor: dragging ? "rgba(31,119,180,0.12)" : C.sidebarBg,
              border: `2px dashed ${dragging ? C.secondary : C.primary}`,
              borderRadius: 10,
              padding: "2.25rem",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".wav"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div style={{ color: C.text, fontWeight: 500, marginBottom: "0.3rem", fontSize: "0.95rem" }}>
              {file ? file.name : "Drag & drop a .wav file here, or click to browse"}
            </div>
            <div style={{ color: C.muted, fontSize: "0.82rem" }}>
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB — ready to analyze`
                : "Only .wav files are supported (max 10 MB)"}
            </div>
          </div>
        </div>

        {/* ── AUDIO PLAYER ── */}
        {audioUrl && (
          <div style={{ marginBottom: "1.5rem" }}>
            <audio
              controls
              src={audioUrl}
              style={{
                width: "100%",
                borderRadius: 8,
                outline: "none",
              }}
            />
          </div>
        )}

        {/* ── ANALYZE BUTTON ── */}
        {file && (
          <button
            onClick={handleAnalyze}
            disabled={loading || !apiHealthy}
            style={{
              width: "100%",
              padding: "0.9rem",
              backgroundColor: loading || !apiHealthy ? C.muted : C.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loading || !apiHealthy ? "not-allowed" : "pointer",
              marginBottom: "1.5rem",
              transition: "background 0.2s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => { if (!loading && apiHealthy) e.target.style.backgroundColor = C.secondary; }}
            onMouseLeave={(e) => { if (!loading && apiHealthy) e.target.style.backgroundColor = C.primary; }}
          >
            {loading ? "Analyzing audio…" : "Analyze Pump Audio"}
          </button>
        )}

        {/* ── ERROR ── */}
        {error && (
          <AlertBox type="error">
            <strong>❌ Error:</strong> {error}
          </AlertBox>
        )}

        {/* ── RESULTS ── */}
        {result && (
          <>
            <Divider />

            <h3 style={{ color: C.text, fontWeight: 700, fontSize: "1.15rem", marginBottom: "1rem" }}>
              Prediction Metrics
            </h3>

            {/* 4 Metric Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "1rem",
                marginBottom: "2rem",
                padding: "1rem",
                border: `1px solid ${isAbnormal ? C.red : C.primary}`,
                borderRadius: 12,
                backgroundColor: `${isAbnormal ? "rgba(255,107,107,0.04)" : "rgba(31,119,180,0.04)"}`,
              }}
            >
              <MetricCard
                label="Prediction"
                value={result.prediction}
                delta={isAbnormal ? "Anomaly Detected" : "Normal"}
                deltaColor={isAbnormal ? C.red : C.primary}
              />
              <MetricCard
                label="Confidence"
                value={toPercent(result.confidence)}
                delta={result.is_confident ? "High Confidence" : "Low Confidence"}
                deltaColor={result.is_confident ? C.primary : C.red}
              />
              <MetricCard
                label="Normal Probability"
                value={toPercent(result.probability_normal)}
              />
              <MetricCard
                label="Abnormal Probability"
                value={toPercent(result.probability_abnormal)}
                deltaColor={isAbnormal ? C.red : C.text}
              />
            </div>

            {/* Tabs */}
            <Divider my="1rem" />

            <div
              style={{
                display: "flex",
                gap: 8,
                backgroundColor: C.sidebarBg,
                padding: 10,
                borderRadius: 10,
                marginBottom: "1.5rem",
              }}
            >
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(i)}
                  style={{
                    flex: 1,
                    padding: "0.7rem 1rem",
                    backgroundColor: activeTab === i ? C.primary : C.cardBg,
                    color: activeTab === i ? "#fff" : C.muted,
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <Card>
              {activeTab === 0 && (
                <ExplainabilityTab explainability={result.explainability || {}} />
              )}
              {activeTab === 1 && (
                <FeatureAnalysisTab features={result.features} filename={file?.name} />
              )}
              {activeTab === 2 && (
                <RecommendationsTab
                  recommendations={result.explainability?.recommendations}
                  prediction={result.prediction}
                />
              )}
            </Card>

            {/* Raw API Response */}
            <div style={{ marginTop: "1.5rem" }}>
              <button
                onClick={() => setShowRaw((r) => !r)}
                style={{
                  width: "100%",
                  padding: "0.65rem 1rem",
                  backgroundColor: C.cardBg,
                  color: C.primary,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>View Raw API Response</span>
                <span style={{ fontSize: "0.75rem", color: C.muted }}>{showRaw ? "▲" : "▼"}</span>
              </button>
              {showRaw && (
                <div
                  className="json-scroll"
                  style={{
                    backgroundColor: C.cardBg,
                    borderRadius: "0 0 8px 8px",
                    padding: "1rem",
                    maxHeight: 420,
                    overflowY: "auto",
                    border: `1px solid ${C.border}`,
                    borderTop: "none",
                  }}
                >
                  <pre
                    style={{
                      color: C.text,
                      fontSize: "0.72rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── HOW TO USE (when no file uploaded) ── */}
        {!file && !result && (
          <>
            <h3
              style={{
                color: C.text,
                fontWeight: 600,
                fontSize: "1.1rem",
                marginTop: "2rem",
                marginBottom: "1rem",
              }}
            >
              How to Use This System
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1.5rem",
              }}
            >
              {[
                {
                  step: "1️⃣",
                  title: "Upload Audio",
                  desc:  "Drag & drop .WAV file or click to browse of your pump sound recording.",
                },
                {
                  step: "2️⃣",
                  title: "AI Analysis",
                  desc:  'Click "Analyze" to process your audio.',
                },
                {
                  step: "3️⃣",
                  title: "Get Insights",
                  desc:  "Review the prediction, deviation analysis, and actionable maintenance recommendations.",
                },
              ].map(({ step, title, desc }) => (
                <Card key={step}>
                  <div style={{ fontSize: "1.6rem", marginBottom: "0.6rem" }}>{step}</div>
                  <div
                    style={{
                      color: C.primary,
                      fontWeight: 700,
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {title}
                  </div>
                  <p style={{ color: C.muted, fontSize: "0.875rem", lineHeight: 1.65, margin: 0 }}>
                    {desc}
                  </p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}