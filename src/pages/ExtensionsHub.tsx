import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Activity, Archive, Bot, Boxes, CalendarClock, CheckCircle2, ChevronRight, Code2, Database, FileText, FolderOpen, Globe, KeyRound, Network, Play, Puzzle, RefreshCw, Server, Settings2, ShieldCheck, TerminalSquare, Users, Waypoints, Workflow, Wrench, XCircle } from "lucide-react";

type Item = { title: string; desc: string; icon: React.ReactNode; href?: string; state: "available" | "partial" | "provider"; detail: string };
const groups: { title: string; description: string; items: Item[] }[] = [
  { title: "Dashboard & Management", description: "Open existing panel tools. These use the panel's current server APIs.", items: [
    { title: "Advanced Server Console", desc: "Live logs and command input", icon: <TerminalSquare />, href: "/servers", state: "available", detail: "Open a server, then use its Console tab." },
    { title: "File Manager", desc: "Upload, edit, rename and organize files", icon: <FolderOpen />, href: "/servers", state: "available", detail: "Open a server, then use File Manager." },
    { title: "SFTP Access", desc: "Server connection credentials", icon: <Network />, href: "/servers", state: "available", detail: "Open a server and select SFTP." },
    { title: "Startup Configuration", desc: "Runtime startup options", icon: <Settings2 />, href: "/servers", state: "available", detail: "Open a server and review Settings/Startup." },
    { title: "Resource Usage Monitor", desc: "CPU, memory and server status", icon: <Activity />, href: "/servers", state: "available", detail: "Server list and server details show runtime status/resources." },
    { title: "Server Backup Manager", desc: "Create, download, restore and delete backups", icon: <Archive />, href: "/servers", state: "available", detail: "Open a server and select Backups." },
    { title: "Server Activity Logs", desc: "Runtime logs and panel events", icon: <FileText />, href: "/servers", state: "partial", detail: "Runtime logs are available; a unified audit timeline is not yet implemented." },
    { title: "Scheduled Tasks", desc: "One-time or recurring server start/stop/restart", icon: <CalendarClock />, state: "partial", detail: "Single-process scheduler is implemented. Use one panel replica only; multi-replica deployments need a distributed lock/queue." },
    { title: "Server Import / Export", desc: "Move server files and configuration", icon: <Boxes />, href: "/servers", state: "partial", detail: "File archive tools exist; full portable server export/import is not yet complete." },
  ]},
  { title: "Hosting & Deployment", description: "Deploy options supported by the current runtime foundation.", items: [
    { title: "Web Hosting Manager", desc: "Deploy Static HTML, PHP, Node.js or Python apps", icon: <Globe />, href: "/servers/create", state: "partial", detail: "Static HTML/Nginx and basic PHP runtime profiles are now available in Docker deployments; Node.js and Python profiles already exist. Public domains, managed SSL, WordPress/database provisioning and production reverse proxy still need setup." },
    { title: "Git Deployment", desc: "Deploy from a repository", icon: <Workflow />, state: "provider", detail: "Requires secure repository credentials and a build/deploy worker; not enabled yet." },
    { title: "PHP / WordPress Runtime", desc: "Basic PHP runtime; WordPress needs a database", icon: <Code2 />, href: "/servers/create", state: "partial", detail: "Basic PHP CLI web serving is available for Docker deployments. WordPress one-click installation, PHP-FPM, managed database and production-grade web routing are not implemented yet." },
    { title: "Node.js Runtime", desc: "Node apps, APIs and Discord bots", icon: <Code2 />, href: "/servers/create", state: "available", detail: "Deploy page has a Node.js runtime profile." },
    { title: "Python Runtime", desc: "Python apps, scripts and bot processes", icon: <TerminalSquare />, href: "/servers/create", state: "available", detail: "Deploy page has a Python runtime profile." },
    { title: "Database Manager", desc: "Provision and manage databases", icon: <Database />, state: "provider", detail: "Needs a database provider and credential-safe lifecycle API." },
    { title: "Domains, Subdomains & SSL", desc: "DNS routing and certificate lifecycle", icon: <Waypoints />, state: "provider", detail: "Requires DNS provider credentials and a reverse-proxy/ACME integration." },
    { title: "Bot Hosting Manager", desc: "Discord/Telegram bots on Node.js or Python", icon: <Bot />, href: "/servers/create", state: "available", detail: "Use Node.js or Python runtime. Dedicated bot templates can be added after runtime/egg configuration." },
    { title: "Lavalink Manager", desc: "Java audio node deployment and configuration", icon: <Play />, state: "provider", detail: "Requires a verified Lavalink image/egg and persistent config template." },
    { title: "VPS Manager", desc: "KVM virtual machines via a hypervisor", icon: <Server />, href: "/nodes", state: "provider", detail: "The current panel runtime is not a KVM provider. Requires Proxmox/libvirt integration and verified network/storage templates." },
  ]},
  { title: "Admin & Automation", description: "Control-plane tools and operational safety.", items: [
    { title: "Runtime / Egg Manager", desc: "Manage approved runtime templates", icon: <Puzzle />, href: "/admin/settings", state: "partial", detail: "Current Deploy supports its existing runtime types; a safe template editor is still needed." },
    { title: "Server Template Manager", desc: "Reusable deployment presets", icon: <Boxes />, href: "/servers/create", state: "partial", detail: "Existing software choices work; custom templates are not yet persisted." },
    { title: "Resource Limit Manager", desc: "RAM, CPU and disk limits", icon: <Activity />, href: "/admin/servers", state: "available", detail: "Admin server controls already include resource management." },
    { title: "User & Permission Manager", desc: "Owners, users and access control", icon: <Users />, href: "/admin/servers", state: "available", detail: "Existing owner assignment and server sub-user features are available." },
    { title: "Audit Logs", desc: "Security and admin action history", icon: <ShieldCheck />, state: "partial", detail: "Persistent panel mutation events are recorded and visible above for admins; full tamper-resistant central audit storage remains future work." },
    { title: "Maintenance Mode", desc: "Controlled maintenance window", icon: <Wrench />, href: "/admin/settings", state: "partial", detail: "Admin settings exist; a complete maintenance-mode gate is not yet wired to all routes." },
    { title: "Backup & Restore", desc: "Panel data backup and recovery", icon: <RefreshCw />, href: "/admin/settings", state: "partial", detail: "Per-server backup actions exist. Full panel-wide tested restore is still required." },
    { title: "API Key Manager", desc: "Manage panel API credentials", icon: <KeyRound />, href: "/api-keys", state: "available", detail: "Existing API Keys page." },
    { title: "System Health Monitor", desc: "Live panel inventory and capability status", icon: <Activity />, state: "available", detail: "Live status is fetched from /api/extensions/status above. Docker daemon and provider-specific probes are not yet comprehensive." },
  ]},
];
const statusLabel = { available: "AVAILABLE", partial: "PARTIAL", provider: "NEEDS SETUP" };
export default function ExtensionsHub() {
  const [query, setQuery] = useState("");
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [healthError, setHealthError] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditError, setAuditError] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [scheduleServer, setScheduleServer] = useState("");
  const [scheduleAction, setScheduleAction] = useState("restart");
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleInterval, setScheduleInterval] = useState("0");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const refreshHealth = async () => {
    try { const response = await axios.get("/api/extensions/status"); setLiveStatus(response.data); setHealthError(""); }
    catch { setHealthError("Could not load live backend status."); }
  };
  const loadAudit = async () => {
    setAuditLoading(true); setAuditError("");
    try { const response = await axios.get("/api/extensions/audit"); setAuditEvents(response.data.events || []); setAuditOpen(true); }
    catch (error: any) { setAuditError(error?.response?.data?.error || "Could not load audit log."); setAuditOpen(true); }
    finally { setAuditLoading(false); }
  };
  const refreshSchedules = async () => {
    try {
      const [taskResponse, serverResponse] = await Promise.all([axios.get("/api/extensions/schedules"), axios.get("/api/servers")]);
      setScheduledTasks(taskResponse.data.tasks || []);
      const rows = Array.isArray(serverResponse.data) ? serverResponse.data : (serverResponse.data.servers || []);
      setServers(rows);
      if (!scheduleServer && rows.length) setScheduleServer(rows[0].id);
    } catch { setScheduleMessage("Could not load scheduled tasks/servers. Check your login and API permissions."); }
  };
  const createSchedule = async (event: React.FormEvent) => {
    event.preventDefault(); setScheduleBusy(true); setScheduleMessage("");
    try {
      const response = await axios.post("/api/extensions/schedules", { serverId: scheduleServer, action: scheduleAction, firstRunAt: new Date(scheduleAt).toISOString(), intervalMinutes: Number(scheduleInterval) });
      setScheduleMessage(`Scheduled ${response.data.task.action} for ${response.data.task.serverName}.`); await refreshSchedules();
    } catch (error: any) { setScheduleMessage(error?.response?.data?.error || "Could not create schedule."); }
    finally { setScheduleBusy(false); }
  };
  const deleteSchedule = async (id: string) => { try { await axios.delete(`/api/extensions/schedules/${encodeURIComponent(id)}`); await refreshSchedules(); } catch (error: any) { setScheduleMessage(error?.response?.data?.error || "Could not delete task."); } };
  useEffect(() => { void refreshHealth(); void refreshSchedules(); }, []);
  const [filter, setFilter] = useState("all");
  const flat = useMemo(() => groups.map(g => ({ ...g, items: g.items.filter(i => `${i.title} ${i.desc} ${i.detail}`.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || i.state === filter)) })).filter(g => g.items.length), [query, filter]);
  const counts = useMemo(() => groups.flatMap(g => g.items).reduce((a, i) => ({ ...a, [i.state]: a[i.state] + 1 }), { available: 0, partial: 0, provider: 0 }), []);
  return <main className="min-h-full p-4 md:p-8 text-white">
    <div className="max-w-7xl mx-auto space-y-7">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div><div className="text-[10px] uppercase tracking-[.28em] text-cyan-400 font-mono mb-2">MAGARZ CLOUD / CONTROL PLANE</div><h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Extensions & Services</h1><p className="text-sm text-zinc-400 mt-2 max-w-2xl">Management tools live here in the panel—not hidden inside Settings. Status is explicit: unavailable integrations are never shown as working.</p></div>
        <Link to="/servers/create" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 bg-white text-black text-sm font-semibold hover:bg-zinc-200"><Play size={16}/> Deploy service <ChevronRight size={16}/></Link>
      </header>
      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold">Live panel health</h2><p className="text-xs text-zinc-500 mt-1">Values are read from the backend, not demo counters.</p></div>
          <div className="flex gap-2">
            <button onClick={() => void refreshHealth()} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">Refresh status</button>
            <button onClick={() => void loadAudit()} className="rounded-lg border border-cyan-500/30 text-cyan-200 px-3 py-2 text-xs hover:bg-cyan-500/10">{auditLoading ? "Loading…" : "View audit log"}</button>
          </div>
        </div>
        {healthError && <p role="alert" className="mt-3 text-xs text-rose-300">{healthError}</p>}
        {liveStatus && <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[["Panel", liveStatus.panel?.status || "unknown"], ["Servers", String(liveStatus.inventory?.servers ?? "—")], ["Users", String(liveStatus.inventory?.users ?? "—")], ["Default runtime", liveStatus.runtime?.configuredDefault || "unknown"]].map(([label,value]) => <div key={label} className="rounded-lg border border-white/5 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>)}
        </div>}
        {auditOpen && <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Security & admin audit events</h3><button onClick={() => setAuditOpen(false)} className="text-xs text-zinc-400 hover:text-white">Close</button></div>
          {auditError ? <p role="alert" className="mt-3 text-xs text-amber-300">{auditError}</p> : auditEvents.length === 0 ? <p className="mt-3 text-xs text-zinc-500">No recorded audit events yet. This log shows recorded events only; it does not fabricate history.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-zinc-500"><tr><th className="p-2">Time</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Target</th><th className="p-2">Outcome</th></tr></thead><tbody>{auditEvents.map((event:any)=><tr key={event.id} className="border-t border-white/5"><td className="p-2 whitespace-nowrap">{new Date(event.timestamp).toLocaleString()}</td><td className="p-2">{event.actorName}</td><td className="p-2">{event.action}</td><td className="p-2">{event.targetName || event.targetId || "—"}</td><td className="p-2">{event.outcome}</td></tr>)}</tbody></table></div>}
        </div>}
        {liveStatus?.capabilities && <div className="mt-4 flex flex-wrap gap-2">{Object.entries(liveStatus.capabilities).map(([key,value]) => <span key={key} className={`rounded-md px-2 py-1 text-[10px] ${value === "integrated" ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>{key.replace(/[A-Z]/g," $&")}: {String(value)}</span>)}</div>}
      </section>
      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-sm font-semibold">Scheduled server tasks</h2><p className="text-xs text-zinc-500 mt-1">Schedule real start, stop or restart actions for servers you own. Repeat interval: minimum 5 minutes.</p></div><button onClick={() => void refreshSchedules()} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">Refresh tasks</button></div>
        <form onSubmit={createSchedule} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={scheduleServer} onChange={e=>setScheduleServer(e.target.value)} required className="rounded-lg bg-black border border-white/10 px-3 py-2 text-sm"><option value="">Select server</option>{servers.map((server:any)=><option key={server.id} value={server.id}>{server.name || server.id}</option>)}</select>
          <select value={scheduleAction} onChange={e=>setScheduleAction(e.target.value)} className="rounded-lg bg-black border border-white/10 px-3 py-2 text-sm"><option value="start">Start</option><option value="stop">Stop</option><option value="restart">Restart</option></select>
          <input type="datetime-local" value={scheduleAt} onChange={e=>setScheduleAt(e.target.value)} required className="rounded-lg bg-black border border-white/10 px-3 py-2 text-sm" />
          <select value={scheduleInterval} onChange={e=>setScheduleInterval(e.target.value)} className="rounded-lg bg-black border border-white/10 px-3 py-2 text-sm"><option value="0">Run once</option><option value="5">Every 5 minutes</option><option value="15">Every 15 minutes</option><option value="30">Every 30 minutes</option><option value="60">Every hour</option><option value="1440">Daily</option><option value="10080">Weekly</option></select>
          <button disabled={scheduleBusy || !scheduleServer || !scheduleAt} className="rounded-lg bg-cyan-500 text-black font-semibold text-sm px-3 py-2 disabled:opacity-40">{scheduleBusy ? "Saving…" : "Create schedule"}</button>
        </form>
        {scheduleMessage && <p role="status" className="text-xs text-cyan-200">{scheduleMessage}</p>}
        {scheduledTasks.length === 0 ? <p className="text-xs text-zinc-500">No scheduled tasks configured.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-zinc-500"><tr><th className="p-2">Server</th><th className="p-2">Action</th><th className="p-2">Next run</th><th className="p-2">Repeat</th><th className="p-2">Last result</th><th className="p-2"></th></tr></thead><tbody>{scheduledTasks.map((task:any)=><tr key={task.id} className="border-t border-white/5"><td className="p-2">{task.serverName}</td><td className="p-2 capitalize">{task.action}</td><td className="p-2">{task.enabled ? new Date(task.nextRunAt).toLocaleString() : "Completed/disabled"}</td><td className="p-2">{task.intervalMinutes ? `Every ${task.intervalMinutes}m` : "Once"}</td><td className="p-2">{task.lastResult || "Pending"}</td><td className="p-2"><button onClick={()=>void deleteSchedule(task.id)} className="text-rose-300 hover:text-rose-200">Delete</button></td></tr>)}</tbody></table></div>}
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[{key:"available",label:"Available now",icon:<CheckCircle2 className="text-emerald-400"/>},{key:"partial",label:"Partially integrated",icon:<RefreshCw className="text-amber-400"/>},{key:"provider",label:"Needs provider setup",icon:<XCircle className="text-zinc-400"/>}].map(x=><div key={x.key} className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-white/5">{x.icon}</div><div><div className="text-2xl font-semibold">{counts[x.key as keyof typeof counts]}</div><div className="text-xs text-zinc-400">{x.label}</div></div></div>)}
      </section>
      <div className="flex flex-col sm:flex-row gap-3"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search extensions..." className="w-full sm:max-w-md rounded-lg bg-zinc-950 border border-white/10 px-4 py-3 text-sm outline-none focus:border-cyan-500/60"/><div className="flex flex-wrap gap-2">{[{id:"all",label:"All"},{id:"available",label:"Available"},{id:"partial",label:"Partial"},{id:"provider",label:"Needs setup"}].map(f=><button key={f.id} onClick={()=>setFilter(f.id)} className={`rounded-lg border px-3 py-2 text-xs ${filter===f.id?"bg-white text-black border-white":"bg-zinc-950 text-zinc-400 border-white/10 hover:text-white"}`}>{f.label}</button>)}</div></div>
      {flat.map(group=><section key={group.title} className="space-y-3"><div><h2 className="text-lg font-semibold">{group.title}</h2><p className="text-xs text-zinc-500 mt-1">{group.description}</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{group.items.map(item=><article key={item.title} className="rounded-xl border border-white/10 bg-zinc-950/55 p-4 hover:border-white/20 transition-colors flex flex-col min-h-48"><div className="flex gap-3 items-start"><div className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300">{React.cloneElement(item.icon as React.ReactElement, { size: 19 })}</div><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.title}</h3><p className="text-xs text-zinc-400 mt-1">{item.desc}</p></div></div><p className="text-xs text-zinc-500 leading-relaxed mt-4 flex-1">{item.detail}</p><div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5"><span className={`text-[9px] font-mono tracking-wider rounded px-2 py-1 ${item.state==="available"?"bg-emerald-500/10 text-emerald-300":item.state==="partial"?"bg-amber-500/10 text-amber-300":"bg-zinc-800 text-zinc-400"}`}>{statusLabel[item.state]}</span>{item.href?<Link to={item.href} className="text-xs inline-flex items-center gap-1 text-cyan-300 hover:text-white">Open <ChevronRight size={14}/></Link>:<span className="text-[10px] text-zinc-600">Integration required</span>}</div></article>)}</div></section>)}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-cyan-100/80 leading-relaxed"><strong className="text-cyan-200">Deployment safety:</strong> Web, bot and runtime options use the existing Node.js/Python deployment path. PHP/WordPress, Git build workers, DNS/SSL, database provisioning, scheduled tasks and KVM VPS remain marked as setup-required until their providers/templates are configured and tested.</div>
    </div>
  </main>;
}
