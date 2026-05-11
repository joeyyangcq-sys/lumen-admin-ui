import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader } from "@shared/ui";
import { isApiError } from "@core/api/errors";

export type FormDrawerMode = "view" | "create" | "edit";
export type ResourceKindForm = "routes" | "services" | "upstreams";

export interface RefOption { id: string; label: string }

// ─── plugin state types ────────────────────────────────────────────────────

interface RequestIdState {
  enabled: boolean; header_name: string; algorithm: string; include_in_response: boolean;
}
interface LimitCountState {
  enabled: boolean; count: number; time_window: number;
  key_type: string; key: string; rejected_code: number; rejected_msg: string;
}
interface ReplacePathState  { enabled: boolean; path: string }
interface StripPrefixState  { enabled: boolean; prefix: string }
interface AddPrefixState    { enabled: boolean; prefix: string }
interface RegexRule         { pattern: string; replacement: string }
interface RewriteRegexState { enabled: boolean; rules: RegexRule[] }
interface KV                { key: string; value: string }
interface ReqTransState {
  enabled: boolean; method: string; host: string;
  add_headers: KV[]; set_headers: KV[]; remove_headers: string[];
  add_query: KV[];   set_query: KV[];   remove_query: string[];
}
interface RespTransState {
  enabled: boolean; status: number; body: string; content_type: string;
  add_headers: KV[]; set_headers: KV[]; remove_headers: string[];
}
interface PluginsState {
  request_id: RequestIdState; limit_count: LimitCountState;
  replace_path: ReplacePathState; strip_prefix: StripPrefixState; add_prefix: AddPrefixState;
  rewrite_path_regex: RewriteRegexState; request_transformer: ReqTransState;
  response_transformer: RespTransState;
}

type UriMatchMode = "exact" | "prefix" | "regex";

interface RouteState {
  id: string; uri: string; uri_match: UriMatchMode; methods: string[]; service_id: string;
  status: number; priority: number; plugins: PluginsState;
}
interface ServiceState {
  id: string; upstream_id: string; plugins: PluginsState;
}
interface UpstreamNode { addr: string; weight: number }
interface UpstreamState {
  id: string; type: string; scheme: string;
  nodes: UpstreamNode[]; pass_host: string; upstream_host: string;
  timeout_connect: number; timeout_read: number; timeout_write: number;
}

// ─── defaults ─────────────────────────────────────────────────────────────

const DEFAULT_PLUGINS: PluginsState = {
  request_id:          { enabled: false, header_name: "X-Request-Id", algorithm: "uuid", include_in_response: true },
  limit_count:         { enabled: false, count: 100, time_window: 60, key_type: "var", key: "remote_addr", rejected_code: 503, rejected_msg: "" },
  replace_path:        { enabled: false, path: "" },
  strip_prefix:        { enabled: false, prefix: "" },
  add_prefix:          { enabled: false, prefix: "" },
  rewrite_path_regex:  { enabled: false, rules: [{ pattern: "", replacement: "" }] },
  request_transformer: { enabled: false, method: "", host: "", add_headers: [], set_headers: [], remove_headers: [], add_query: [], set_query: [], remove_query: [] },
  response_transformer:{ enabled: false, status: 0, body: "", content_type: "", add_headers: [], set_headers: [], remove_headers: [] },
};
const DEFAULT_ROUTE: RouteState    = { id: "", uri: "/", uri_match: "exact", methods: ["GET"], service_id: "", status: 1, priority: 0, plugins: DEFAULT_PLUGINS };
const DEFAULT_SERVICE: ServiceState = { id: "", upstream_id: "", plugins: DEFAULT_PLUGINS };
const DEFAULT_UPSTREAM: UpstreamState = { id: "", type: "roundrobin", scheme: "http", nodes: [{ addr: "127.0.0.1:8080", weight: 1 }], pass_host: "pass", upstream_host: "", timeout_connect: 60, timeout_read: 60, timeout_write: 60 };

// ─── form → JSON ───────────────────────────────────────────────────────────

function pluginsToJson(p: PluginsState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.request_id.enabled) out.request_id = { header_name: p.request_id.header_name, algorithm: p.request_id.algorithm, include_in_response: p.request_id.include_in_response };
  if (p.limit_count.enabled) out.limit_count = { count: p.limit_count.count, time_window: p.limit_count.time_window, key_type: p.limit_count.key_type, key: p.limit_count.key, rejected_code: p.limit_count.rejected_code, ...(p.limit_count.rejected_msg ? { rejected_msg: p.limit_count.rejected_msg } : {}) };
  if (p.replace_path.enabled) out.replace_path = { path: p.replace_path.path };
  if (p.strip_prefix.enabled) out.strip_prefix = { prefix: p.strip_prefix.prefix };
  if (p.add_prefix.enabled) out.add_prefix = { prefix: p.add_prefix.prefix };
  if (p.rewrite_path_regex.enabled) out.rewrite_path_regex = { rules: p.rewrite_path_regex.rules };
  if (p.request_transformer.enabled) {
    const t = p.request_transformer;
    out.request_transformer = {
      ...(t.method ? { method: t.method } : {}), ...(t.host ? { host: t.host } : {}),
      add: { headers: Object.fromEntries(t.add_headers.map(kv => [kv.key, kv.value])), query: Object.fromEntries(t.add_query.map(kv => [kv.key, kv.value])) },
      set: { headers: Object.fromEntries(t.set_headers.map(kv => [kv.key, kv.value])), query: Object.fromEntries(t.set_query.map(kv => [kv.key, kv.value])) },
      remove: { headers: t.remove_headers.filter(Boolean), query: t.remove_query.filter(Boolean) },
    };
  }
  if (p.response_transformer.enabled) {
    const r = p.response_transformer;
    out.response_transformer = {
      ...(r.status > 0 ? { status: r.status } : {}), ...(r.body ? { body: r.body } : {}), ...(r.content_type ? { content_type: r.content_type } : {}),
      add: { headers: Object.fromEntries(r.add_headers.map(kv => [kv.key, kv.value])) },
      set: { headers: Object.fromEntries(r.set_headers.map(kv => [kv.key, kv.value])) },
      remove: { headers: r.remove_headers.filter(Boolean) },
    };
  }
  return out;
}

function encodeUri(uri: string, mode: UriMatchMode): string {
  let path = uri.trim();
  if (!path.startsWith("/") && mode !== "regex") path = "/" + path;
  switch (mode) {
    case "exact":
      // Strip any trailing wildcard the user may have typed by mistake
      path = path.replace(/\/?\*+$/, "") || "/";
      return path; // Plain /path → translator adds "= " prefix
    case "prefix":
      // Ensure trailing /* so normalizeApisixURI recognises it as prefix
      path = path.replace(/\/?\*+$/, ""); // strip any existing wildcard first
      return path.endsWith("/") ? path + "*" : path + "/*";
    case "regex":
      // Stored as Lumen-native "~ pattern" — normalizeApisixURI passes it through
      return "~ " + path;
  }
}

function decodeUri(raw: string): { uri: string; uri_match: UriMatchMode } {
  if (raw.startsWith("~ "))  return { uri: raw.slice(2),  uri_match: "regex"  };
  if (raw.startsWith("~*"))  return { uri: raw.slice(2).trimStart(), uri_match: "regex" };
  if (raw.startsWith("= "))  return { uri: raw.slice(2),  uri_match: "exact"  };
  if (raw.includes("*")) {
    const base = raw.replace(/\/?\*+$/, "") || "/";
    return { uri: base, uri_match: "prefix" };
  }
  // Plain path stored by older data or APISIX → treat as exact
  return { uri: raw, uri_match: "exact" };
}

function routeToJson(s: RouteState): Record<string, unknown> {
  const json: Record<string, unknown> = { id: s.id, uri: encodeUri(s.uri, s.uri_match) };
  if (s.methods.length) json.methods = s.methods;
  if (s.service_id) json.service_id = s.service_id;
  if (s.status === 0) json.status = 0;
  if (s.priority !== 0) json.priority = s.priority;
  const pl = pluginsToJson(s.plugins);
  if (Object.keys(pl).length) json.plugins = pl;
  return json;
}

function serviceToJson(s: ServiceState): Record<string, unknown> {
  const json: Record<string, unknown> = { id: s.id };
  if (s.upstream_id) json.upstream_id = s.upstream_id;
  const pl = pluginsToJson(s.plugins);
  if (Object.keys(pl).length) json.plugins = pl;
  return json;
}

function upstreamToJson(s: UpstreamState): Record<string, unknown> {
  const nodes: Record<string, number> = {};
  s.nodes.forEach(n => { if (n.addr) nodes[n.addr] = n.weight; });
  const json: Record<string, unknown> = { id: s.id, type: s.type, scheme: s.scheme, nodes };
  if (s.pass_host !== "pass") json.pass_host = s.pass_host;
  if (s.pass_host === "rewrite" && s.upstream_host) json.upstream_host = s.upstream_host;
  const t = s.timeout_connect || s.timeout_read || s.timeout_write;
  if (t) json.timeout = { connect: s.timeout_connect, read: s.timeout_read, write: s.timeout_write };
  return json;
}

// ─── JSON → form (best-effort) ────────────────────────────────────────────

function jsonToPlugins(raw: Record<string, unknown>): PluginsState {
  const p = structuredClone(DEFAULT_PLUGINS);
  const pl = (raw.plugins ?? {}) as Record<string, Record<string, unknown>>;

  if (pl.request_id) { p.request_id = { enabled: true, header_name: String(pl.request_id.header_name ?? "X-Request-Id"), algorithm: String(pl.request_id.algorithm ?? "uuid"), include_in_response: pl.request_id.include_in_response !== false }; }
  if (pl.limit_count) { p.limit_count = { enabled: true, count: Number(pl.limit_count.count ?? 100), time_window: Number(pl.limit_count.time_window ?? 60), key_type: String(pl.limit_count.key_type ?? "var"), key: String(pl.limit_count.key ?? "remote_addr"), rejected_code: Number(pl.limit_count.rejected_code ?? 503), rejected_msg: String(pl.limit_count.rejected_msg ?? "") }; }
  if (pl.replace_path) { p.replace_path = { enabled: true, path: String(pl.replace_path.path ?? "") }; }
  if (pl.strip_prefix) { p.strip_prefix = { enabled: true, prefix: String((pl.strip_prefix.prefixes as string[])?.[0] ?? pl.strip_prefix.prefix ?? "") }; }
  if (pl.add_prefix) { p.add_prefix = { enabled: true, prefix: String(pl.add_prefix.prefix ?? "") }; }
  if (pl.rewrite_path_regex) {
    const rules = (pl.rewrite_path_regex.rules as { pattern: string; replacement: string }[]) ?? [];
    p.rewrite_path_regex = { enabled: true, rules: rules.length ? rules : [{ pattern: "", replacement: "" }] };
  }
  if (pl.request_transformer) {
    const t = pl.request_transformer;
    const add = (t.add ?? {}) as Record<string, Record<string, string>>;
    const set = (t.set ?? {}) as Record<string, Record<string, string>>;
    const remove = (t.remove ?? {}) as Record<string, string[]>;
    p.request_transformer = { enabled: true, method: String(t.method ?? ""), host: String(t.host ?? ""), add_headers: toKVList(add.headers ?? {}), set_headers: toKVList(set.headers ?? {}), remove_headers: remove.headers ?? [], add_query: toKVList(add.query ?? {}), set_query: toKVList(set.query ?? {}), remove_query: remove.query ?? [] };
  }
  if (pl.response_transformer) {
    const r = pl.response_transformer;
    const add = (r.add ?? {}) as Record<string, Record<string, string>>;
    const set = (r.set ?? {}) as Record<string, Record<string, string>>;
    const remove = (r.remove ?? {}) as Record<string, string[]>;
    p.response_transformer = { enabled: true, status: Number(r.status ?? 0), body: String(r.body ?? ""), content_type: String(r.content_type ?? ""), add_headers: toKVList(add.headers ?? {}), set_headers: toKVList(set.headers ?? {}), remove_headers: remove.headers ?? [] };
  }
  return p;
}

function toKVList(obj: Record<string, string>): KV[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

function jsonToRoute(raw: Record<string, unknown>): RouteState {
  const { uri, uri_match } = decodeUri(String(raw.uri ?? "/"));
  return { id: String(raw.id ?? ""), uri, uri_match, methods: (raw.methods as string[]) ?? ["GET"], service_id: String(raw.service_id ?? ""), status: Number(raw.status ?? 1), priority: Number(raw.priority ?? 0), plugins: jsonToPlugins(raw) };
}

function jsonToService(raw: Record<string, unknown>): ServiceState {
  return { id: String(raw.id ?? ""), upstream_id: String(raw.upstream_id ?? ""), plugins: jsonToPlugins(raw) };
}

function jsonToUpstream(raw: Record<string, unknown>): UpstreamState {
  const nodes = (raw.nodes ?? {}) as Record<string, number>;
  const t = (raw.timeout ?? {}) as Record<string, number>;
  return { id: String(raw.id ?? ""), type: String(raw.type ?? "roundrobin"), scheme: String(raw.scheme ?? "http"), nodes: Object.entries(nodes).map(([addr, weight]) => ({ addr, weight })), pass_host: String(raw.pass_host ?? "pass"), upstream_host: String(raw.upstream_host ?? ""), timeout_connect: Number(t.connect ?? 60), timeout_read: Number(t.read ?? 60), timeout_write: Number(t.write ?? 60) };
}

// ─── tiny shared UI helpers ───────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-fg">{label}</div>
      {hint && <div className="text-[11px] text-fg-subtle leading-snug">{hint}</div>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, disabled, type = "text" }: { value: string | number; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="h-8 w-full rounded border border-border bg-bg px-3 text-xs text-fg outline-none focus:border-accent disabled:opacity-50" />;
}

function NumberInput({ value, onChange, min, placeholder }: { value: number; onChange: (v: number) => void; min?: number; placeholder?: string }) {
  return <input type="number" value={value || ""} min={min} onChange={e => onChange(Number(e.target.value))} placeholder={placeholder} className="h-8 w-full rounded border border-border bg-bg px-3 text-xs text-fg outline-none focus:border-accent" />;
}

function Select({ value, onChange, children, disabled }: { value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="h-8 w-full rounded border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent disabled:opacity-50">{children}</select>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className={`relative w-8 h-4 rounded-full transition-colors ${checked ? "bg-accent" : "bg-border"}`} onClick={() => onChange(!checked)}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
      </div>
      {label && <span className="text-xs text-fg-subtle">{label}</span>}
    </label>
  );
}

function PluginSection({ title, hint, enabled, onToggle, children }: { title: string; hint: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded border border-border overflow-hidden">
      <div className="flex items-center gap-3 bg-bg-subtle px-3 py-2">
        <Toggle checked={enabled} onChange={onToggle} />
        <div className="flex-1 cursor-pointer" onClick={() => enabled && setOpen(o => !o)}>
          <div className="text-xs font-medium text-fg">{title}</div>
          <div className="text-[11px] text-fg-subtle">{hint}</div>
        </div>
        {enabled && (
          <button onClick={() => setOpen(o => !o)} className="text-fg-subtle hover:text-fg">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {enabled && open && <div className="p-3 space-y-3 border-t border-border bg-bg">{children}</div>}
    </div>
  );
}

function KVEditor({ items, onChange, keyPlaceholder = "Key", valuePlaceholder = "Value" }: { items: KV[]; onChange: (v: KV[]) => void; keyPlaceholder?: string; valuePlaceholder?: string }) {
  const add = () => onChange([...items, { key: "", value: "" }]);
  const del = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const set = (i: number, field: keyof KV, val: string) => onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input value={item.key} onChange={e => set(i, "key", e.target.value)} placeholder={keyPlaceholder} className="h-7 flex-1 rounded border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent" />
          <input value={item.value} onChange={e => set(i, "value", e.target.value)} placeholder={valuePlaceholder} className="h-7 flex-1 rounded border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent" />
          <button onClick={() => del(i)} className="text-fg-subtle hover:text-danger"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-[11px] text-accent hover:underline"><Plus className="h-3 w-3" />Add</button>
    </div>
  );
}

function TagListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const add = () => onChange([...items, ""]);
  const del = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const set = (i: number, val: string) => onChange(items.map((item, idx) => idx === i ? val : item));
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input value={item} onChange={e => set(i, e.target.value)} placeholder={placeholder} className="h-7 flex-1 rounded border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent" />
          <button onClick={() => del(i)} className="text-fg-subtle hover:text-danger"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-[11px] text-accent hover:underline"><Plus className="h-3 w-3" />Add</button>
    </div>
  );
}

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

function MethodPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (m: string) => onChange(value.includes(m) ? value.filter(x => x !== m) : [...value, m]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {METHODS.map(m => (
        <button key={m} onClick={() => toggle(m)} className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border transition-colors ${value.includes(m) ? "bg-accent text-white border-accent" : "border-border text-fg-subtle hover:border-accent"}`}>{m}</button>
      ))}
    </div>
  );
}

// ─── plugins panel (shared by route and service) ───────────────────────────

function PluginsPanel({ state, onChange }: { state: PluginsState; onChange: (s: PluginsState) => void }) {
  const set = <K extends keyof PluginsState>(key: K, val: PluginsState[K]) => onChange({ ...state, [key]: val });

  return (
    <div className="space-y-2">
      {/* Request ID */}
      <PluginSection title="Request ID" hint="为每个请求生成唯一 ID 并注入请求头" enabled={state.request_id.enabled} onToggle={v => set("request_id", { ...state.request_id, enabled: v })}>
        <Field label="请求头名称"><Input value={state.request_id.header_name} onChange={v => set("request_id", { ...state.request_id, header_name: v })} placeholder="X-Request-Id" /></Field>
        <Field label="算法"><Select value={state.request_id.algorithm} onChange={v => set("request_id", { ...state.request_id, algorithm: v })}><option value="uuid">UUID</option><option value="nanoid">Nano ID</option><option value="range_id">Range ID（自定义字符集）</option></Select></Field>
        <Field label="回写到响应头"><Toggle checked={state.request_id.include_in_response} onChange={v => set("request_id", { ...state.request_id, include_in_response: v })} label="在响应头中返回 Request ID" /></Field>
      </PluginSection>

      {/* Limit Count */}
      <PluginSection title="限流（Limit Count）" hint="滑动时间窗口限制请求次数" enabled={state.limit_count.enabled} onToggle={v => set("limit_count", { ...state.limit_count, enabled: v })}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="最大请求数" hint="时间窗口内允许的请求次数"><NumberInput value={state.limit_count.count} onChange={v => set("limit_count", { ...state.limit_count, count: v })} min={1} placeholder="100" /></Field>
          <Field label="时间窗口（秒）"><NumberInput value={state.limit_count.time_window} onChange={v => set("limit_count", { ...state.limit_count, time_window: v })} min={1} placeholder="60" /></Field>
        </div>
        <Field label="计数维度">
          <Select value={state.limit_count.key_type} onChange={v => set("limit_count", { ...state.limit_count, key_type: v })}>
            <option value="var">变量（如 remote_addr、http_x_forwarded_for）</option>
            <option value="var_combination">变量组合模板</option>
            <option value="constant">常量（所有请求共享一个计数器）</option>
          </Select>
        </Field>
        <Field label="计数 Key" hint={state.limit_count.key_type === "var" ? "内置变量名，例如 remote_addr" : state.limit_count.key_type === "var_combination" ? "模板，如 ${remote_addr}-${http_x_real_ip}" : "任意字符串"}>
          <Input value={state.limit_count.key} onChange={v => set("limit_count", { ...state.limit_count, key: v })} placeholder="remote_addr" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="拒绝时状态码"><NumberInput value={state.limit_count.rejected_code} onChange={v => set("limit_count", { ...state.limit_count, rejected_code: v })} placeholder="503" /></Field>
          <Field label="拒绝时返回的消息（可空）"><Input value={state.limit_count.rejected_msg} onChange={v => set("limit_count", { ...state.limit_count, rejected_msg: v })} placeholder="Too Many Requests" /></Field>
        </div>
      </PluginSection>

      {/* Path rewrite plugins */}
      <PluginSection title="替换路径（Replace Path）" hint="将请求路径完全替换为指定值，支持变量模板" enabled={state.replace_path.enabled} onToggle={v => set("replace_path", { ...state.replace_path, enabled: v })}>
        <Field label="新路径" hint="如 /backend/api，可使用 ${uri} 等模板变量"><Input value={state.replace_path.path} onChange={v => set("replace_path", { ...state.replace_path, path: v })} placeholder="/backend/api" /></Field>
      </PluginSection>

      <PluginSection title="去掉前缀（Strip Prefix）" hint="删除请求路径开头的前缀，常用于网关路由到子服务" enabled={state.strip_prefix.enabled} onToggle={v => set("strip_prefix", { ...state.strip_prefix, enabled: v })}>
        <Field label="要去除的前缀" hint="例如路由 /api/* → 上游收到 /* 时，填 /api"><Input value={state.strip_prefix.prefix} onChange={v => set("strip_prefix", { ...state.strip_prefix, prefix: v })} placeholder="/api" /></Field>
      </PluginSection>

      <PluginSection title="添加前缀（Add Prefix）" hint="在请求路径前追加前缀再转发到上游" enabled={state.add_prefix.enabled} onToggle={v => set("add_prefix", { ...state.add_prefix, enabled: v })}>
        <Field label="要添加的前缀"><Input value={state.add_prefix.prefix} onChange={v => set("add_prefix", { ...state.add_prefix, prefix: v })} placeholder="/v2" /></Field>
      </PluginSection>

      <PluginSection title="正则路径改写（Rewrite Path Regex）" hint="按正则匹配路径并替换，支持捕获组 $1 $2 等" enabled={state.rewrite_path_regex.enabled} onToggle={v => set("rewrite_path_regex", { ...state.rewrite_path_regex, enabled: v })}>
        <div className="space-y-2">
          {state.rewrite_path_regex.rules.map((rule, i) => (
            <div key={i} className="space-y-1.5 rounded border border-border p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-fg-subtle">规则 {i + 1}</span>
                {state.rewrite_path_regex.rules.length > 1 && <button onClick={() => set("rewrite_path_regex", { ...state.rewrite_path_regex, rules: state.rewrite_path_regex.rules.filter((_, idx) => idx !== i) })} className="text-fg-subtle hover:text-danger"><Trash2 className="h-3 w-3" /></button>}
              </div>
              <Field label="匹配正则（Pattern）" hint="如 ^/user/(\d+)(.*)$"><Input value={rule.pattern} onChange={v => set("rewrite_path_regex", { ...state.rewrite_path_regex, rules: state.rewrite_path_regex.rules.map((r, idx) => idx === i ? { ...r, pattern: v } : r) })} placeholder="^/v1/(.*)" /></Field>
              <Field label="替换表达式（Replacement）" hint="如 /v2/$1，可引用捕获组"><Input value={rule.replacement} onChange={v => set("rewrite_path_regex", { ...state.rewrite_path_regex, rules: state.rewrite_path_regex.rules.map((r, idx) => idx === i ? { ...r, replacement: v } : r) })} placeholder="/v2/$1" /></Field>
            </div>
          ))}
          <button onClick={() => set("rewrite_path_regex", { ...state.rewrite_path_regex, rules: [...state.rewrite_path_regex.rules, { pattern: "", replacement: "" }] })} className="flex items-center gap-1 text-[11px] text-accent hover:underline"><Plus className="h-3 w-3" />添加规则</button>
        </div>
      </PluginSection>

      {/* Request Transformer */}
      <PluginSection title="请求变换（Request Transformer）" hint="转发前修改请求方法、Host、Headers、Query 参数" enabled={state.request_transformer.enabled} onToggle={v => set("request_transformer", { ...state.request_transformer, enabled: v })}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="覆盖请求方法（可空）" hint="如 POST，不填则不修改"><Input value={state.request_transformer.method} onChange={v => set("request_transformer", { ...state.request_transformer, method: v })} placeholder="POST" /></Field>
          <Field label="覆盖 Host（可空）"><Input value={state.request_transformer.host} onChange={v => set("request_transformer", { ...state.request_transformer, host: v })} placeholder="api.example.com" /></Field>
        </div>
        <Field label="添加请求头"><KVEditor items={state.request_transformer.add_headers} onChange={v => set("request_transformer", { ...state.request_transformer, add_headers: v })} keyPlaceholder="Header 名" valuePlaceholder="值" /></Field>
        <Field label="覆盖请求头"><KVEditor items={state.request_transformer.set_headers} onChange={v => set("request_transformer", { ...state.request_transformer, set_headers: v })} keyPlaceholder="Header 名" valuePlaceholder="值" /></Field>
        <Field label="删除请求头"><TagListEditor items={state.request_transformer.remove_headers} onChange={v => set("request_transformer", { ...state.request_transformer, remove_headers: v })} placeholder="Header 名" /></Field>
        <Field label="添加 Query 参数"><KVEditor items={state.request_transformer.add_query} onChange={v => set("request_transformer", { ...state.request_transformer, add_query: v })} keyPlaceholder="参数名" valuePlaceholder="值" /></Field>
        <Field label="覆盖 Query 参数"><KVEditor items={state.request_transformer.set_query} onChange={v => set("request_transformer", { ...state.request_transformer, set_query: v })} keyPlaceholder="参数名" valuePlaceholder="值" /></Field>
        <Field label="删除 Query 参数"><TagListEditor items={state.request_transformer.remove_query} onChange={v => set("request_transformer", { ...state.request_transformer, remove_query: v })} placeholder="参数名" /></Field>
      </PluginSection>

      {/* Response Transformer */}
      <PluginSection title="响应变换（Response Transformer）" hint="返回响应时修改状态码、Body、响应头" enabled={state.response_transformer.enabled} onToggle={v => set("response_transformer", { ...state.response_transformer, enabled: v })}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="覆盖状态码（0 = 不修改）"><NumberInput value={state.response_transformer.status} onChange={v => set("response_transformer", { ...state.response_transformer, status: v })} placeholder="200" /></Field>
          <Field label="Content-Type（可空）"><Input value={state.response_transformer.content_type} onChange={v => set("response_transformer", { ...state.response_transformer, content_type: v })} placeholder="application/json" /></Field>
        </div>
        <Field label="覆盖响应 Body（可空）"><textarea value={state.response_transformer.body} onChange={e => set("response_transformer", { ...state.response_transformer, body: e.target.value })} placeholder='{"message":"ok"}' className="h-16 w-full resize-y rounded border border-border bg-bg p-2 font-mono text-xs text-fg outline-none focus:border-accent" /></Field>
        <Field label="添加响应头"><KVEditor items={state.response_transformer.add_headers} onChange={v => set("response_transformer", { ...state.response_transformer, add_headers: v })} keyPlaceholder="Header 名" valuePlaceholder="值" /></Field>
        <Field label="覆盖响应头"><KVEditor items={state.response_transformer.set_headers} onChange={v => set("response_transformer", { ...state.response_transformer, set_headers: v })} keyPlaceholder="Header 名" valuePlaceholder="值" /></Field>
        <Field label="删除响应头"><TagListEditor items={state.response_transformer.remove_headers} onChange={v => set("response_transformer", { ...state.response_transformer, remove_headers: v })} placeholder="Header 名" /></Field>
      </PluginSection>
    </div>
  );
}

// ─── resource-specific form sections ──────────────────────────────────────

function RouteForm({ state, onChange, serviceOptions }: { state: RouteState; onChange: (s: RouteState) => void; serviceOptions: RefOption[] }) {
  const set = <K extends keyof RouteState>(k: K, v: RouteState[K]) => onChange({ ...state, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="路由 ID" hint="唯一标识，字母数字横线"><Input value={state.id} onChange={v => set("id", v)} placeholder="route-my-api" /></Field>
        <Field label="优先级" hint="数字越大越优先，默认 0"><NumberInput value={state.priority} onChange={v => set("priority", v)} placeholder="0" /></Field>
      </div>
      <Field label="请求路径匹配">
        {/* Match mode tabs */}
        <div className="flex gap-1 mb-2">
          {(["exact", "prefix", "regex"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => set("uri_match", mode)}
              className={`px-3 py-1 rounded text-xs border transition-colors ${
                state.uri_match === mode
                  ? "bg-accent text-white border-accent"
                  : "border-border text-fg-subtle hover:border-accent"
              }`}
            >
              {mode === "exact" ? "精确匹配" : mode === "prefix" ? "前缀匹配" : "正则匹配"}
            </button>
          ))}
        </div>
        <Input
          value={state.uri}
          onChange={v => set("uri", v)}
          placeholder={
            state.uri_match === "exact"  ? "/api/v1/users" :
            state.uri_match === "prefix" ? "/api/v1" :
            "^/api/v1/user/(\\d+)$"
          }
        />
        <div className="mt-1 text-[11px] leading-snug text-fg-subtle">
          {state.uri_match === "exact"
            ? "完整路径精确匹配 — 如 /api/v1/users 只匹配该路径，不匹配 /api/v1/users/123"
            : state.uri_match === "prefix"
            ? "前缀匹配 — 如 /api 匹配 /api/users、/api/orders 等所有以此开头的路径"
            : "正则表达式 — 如 ^/user/(\\d+)$ 匹配 /user/42，捕获组可在插件中用 $1 引用"}
        </div>
      </Field>
      <Field label="允许的 HTTP 方法（不选则匹配全部）">
        <MethodPicker value={state.methods} onChange={v => set("methods", v)} />
      </Field>
      <Field label="关联服务（Service）" hint="路由将请求转发到该服务，服务再负责负载均衡到上游">
        <Select value={state.service_id} onChange={v => set("service_id", v)}>
          <option value="">— 请选择服务 —</option>
          {serviceOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      </Field>
      <Field label="状态">
        <Toggle checked={state.status === 1} onChange={v => set("status", v ? 1 : 0)} label={state.status === 1 ? "启用" : "禁用"} />
      </Field>
      <div className="pt-1">
        <div className="mb-2 text-xs font-medium text-fg">插件</div>
        <PluginsPanel state={state.plugins} onChange={v => set("plugins", v)} />
      </div>
    </div>
  );
}

function ServiceForm({ state, onChange, upstreamOptions }: { state: ServiceState; onChange: (s: ServiceState) => void; upstreamOptions: RefOption[] }) {
  const set = <K extends keyof ServiceState>(k: K, v: ServiceState[K]) => onChange({ ...state, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="服务 ID" hint="唯一标识，被路由通过 service_id 引用"><Input value={state.id} onChange={v => set("id", v)} placeholder="svc-user-api" /></Field>
      <Field label="关联上游（Upstream）" hint="服务将请求分发到该上游的节点">
        <Select value={state.upstream_id} onChange={v => set("upstream_id", v)}>
          <option value="">— 请选择上游 —</option>
          {upstreamOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      </Field>
      <div className="pt-1">
        <div className="mb-2 text-xs font-medium text-fg">插件</div>
        <PluginsPanel state={state.plugins} onChange={v => set("plugins", v)} />
      </div>
    </div>
  );
}

function UpstreamForm({ state, onChange }: { state: UpstreamState; onChange: (s: UpstreamState) => void }) {
  const set = <K extends keyof UpstreamState>(k: K, v: UpstreamState[K]) => onChange({ ...state, [k]: v });
  const setNode = (i: number, field: keyof UpstreamNode, val: string | number) =>
    set("nodes", state.nodes.map((n, idx) => idx === i ? { ...n, [field]: val } : n));
  return (
    <div className="space-y-4">
      <Field label="上游 ID" hint="唯一标识，被服务通过 upstream_id 引用"><Input value={state.id} onChange={v => set("id", v)} placeholder="up-user-api" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="负载均衡算法">
          <Select value={state.type} onChange={v => set("type", v)}>
            <option value="roundrobin">轮询（Round Robin）</option>
            <option value="chash">一致性哈希（Consistent Hash）</option>
            <option value="least_conn">最少连接（Least Connections）</option>
            <option value="ewma">指数加权移动平均（EWMA）</option>
          </Select>
        </Field>
        <Field label="协议">
          <Select value={state.scheme} onChange={v => set("scheme", v)}>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
          </Select>
        </Field>
      </div>
      <Field label="后端节点" hint="填写 host:port 和权重，多节点按权重分流">
        <div className="space-y-1.5">
          {state.nodes.map((node, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={node.addr} onChange={e => setNode(i, "addr", e.target.value)} placeholder="127.0.0.1:8080" className="h-7 flex-1 rounded border border-border bg-bg px-2 text-xs font-mono text-fg outline-none focus:border-accent" />
              <span className="text-xs text-fg-subtle">权重</span>
              <input type="number" value={node.weight} min={0} onChange={e => setNode(i, "weight", Number(e.target.value))} className="h-7 w-14 rounded border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent" />
              {state.nodes.length > 1 && <button onClick={() => set("nodes", state.nodes.filter((_, idx) => idx !== i))} className="text-fg-subtle hover:text-danger"><Trash2 className="h-3 w-3" /></button>}
            </div>
          ))}
          <button onClick={() => set("nodes", [...state.nodes, { addr: "", weight: 1 }])} className="flex items-center gap-1 text-[11px] text-accent hover:underline"><Plus className="h-3 w-3" />添加节点</button>
        </div>
      </Field>
      <Field label="Host 透传策略">
        <Select value={state.pass_host} onChange={v => set("pass_host", v)}>
          <option value="pass">透传（Pass）— 原样转发客户端的 Host</option>
          <option value="node">节点（Node）— 使用上游节点的 IP/域名</option>
          <option value="rewrite">自定义（Rewrite）— 使用下方指定的 Host</option>
        </Select>
      </Field>
      {state.pass_host === "rewrite" && (
        <Field label="自定义上游 Host"><Input value={state.upstream_host} onChange={v => set("upstream_host", v)} placeholder="api.internal.com" /></Field>
      )}
      <Field label="超时设置（秒）">
        <div className="grid grid-cols-3 gap-2">
          {(["timeout_connect", "timeout_read", "timeout_write"] as const).map((k, i) => (
            <div key={k}>
              <div className="mb-1 text-[11px] text-fg-subtle">{["连接", "读取", "写入"][i]}</div>
              <NumberInput value={state[k]} onChange={v => set(k, v)} min={1} placeholder="60" />
            </div>
          ))}
        </div>
      </Field>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────

interface ResourceFormDrawerProps {
  open: boolean;
  mode: FormDrawerMode;
  resource: ResourceKindForm;
  initialJson: string;
  serviceOptions?: RefOption[];
  upstreamOptions?: RefOption[];
  onSubmit?: (parsed: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

export function ResourceFormDrawer({ open, mode, resource, initialJson, serviceOptions = [], upstreamOptions = [], onSubmit, onClose }: ResourceFormDrawerProps) {
  const [routeState, setRouteState]     = useState<RouteState>(DEFAULT_ROUTE);
  const [serviceState, setServiceState] = useState<ServiceState>(DEFAULT_SERVICE);
  const [upstreamState, setUpstreamState] = useState<UpstreamState>(DEFAULT_UPSTREAM);
  const [jsonOpen, setJsonOpen]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);

  // Parse initial JSON into form state on open
  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    try {
      const raw = JSON.parse(initialJson || "{}") as Record<string, unknown>;
      if (resource === "routes")    setRouteState(jsonToRoute(raw));
      if (resource === "services")  setServiceState(jsonToService(raw));
      if (resource === "upstreams") setUpstreamState(jsonToUpstream(raw));
    } catch { /* keep defaults */ }
  }, [open, initialJson, resource]);

  if (!open) return null;

  // Compute JSON from current form state
  const computedJson =
    resource === "routes"    ? routeToJson(routeState) :
    resource === "services"  ? serviceToJson(serviceState) :
    upstreamToJson(upstreamState);

  const readOnly = mode === "view";

  const handleSave = async () => {
    if (!onSubmit || readOnly) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit(computedJson);
      onClose();
    } catch (err) {
      setSubmitError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const titles: Record<ResourceKindForm, string> = { routes: "路由", services: "服务", upstreams: "上游" };
  const badgeTone = mode === "create" ? "accent" : mode === "view" ? "neutral" : "warning";
  const badgeLabel = mode === "create" ? "新建" : mode === "view" ? "查看" : "编辑";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <Card className="h-full w-full max-w-2xl overflow-y-auto rounded-none border-l border-border" onClick={e => e.stopPropagation()}>
        <CardHeader
          title={<span className="inline-flex items-center gap-2"><span>{titles[resource]}</span><Badge tone={badgeTone}>{badgeLabel}</Badge></span>}
          description={resource === "routes" ? "路由 → 服务 → 上游" : resource === "services" ? "服务承载插件链，并指向上游" : "定义后端节点和负载均衡策略"}
          actions={<Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>}
        />
        <CardBody className="space-y-4">
          {/* Main form */}
          {resource === "routes" && (
            <RouteForm state={routeState} onChange={readOnly ? () => {} : setRouteState} serviceOptions={serviceOptions} />
          )}
          {resource === "services" && (
            <ServiceForm state={serviceState} onChange={readOnly ? () => {} : setServiceState} upstreamOptions={upstreamOptions} />
          )}
          {resource === "upstreams" && (
            <UpstreamForm state={upstreamState} onChange={readOnly ? () => {} : setUpstreamState} />
          )}

          {/* JSON preview */}
          <div className="rounded border border-border overflow-hidden">
            <button onClick={() => setJsonOpen(o => !o)} className="flex w-full items-center justify-between bg-bg-subtle px-3 py-2 text-xs font-medium text-fg-muted hover:text-fg">
              <span>JSON 预览</span>
              {jsonOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {jsonOpen && (
              <textarea
                readOnly
                value={JSON.stringify(computedJson, null, 2)}
                className="h-52 w-full resize-y border-t border-border bg-bg p-3 font-mono text-xs text-fg outline-none"
              />
            )}
          </div>

          {submitError && (
            <div className="rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{submitError}</div>
          )}

          {!readOnly && (
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={submitting}>
                {submitting ? "保存中…" : "保存"}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function formatError(err: unknown): string {
  if (isApiError(err)) return `${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return "未知错误";
}
