import { useMemo, useState, type ReactNode } from "react";
import { Link, Route, Router, Switch, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardSummaryQueryKey,
  getListKudosQueryKey,
  getListModerationKudosQueryKey,
  useCreateKudo,
  useDeleteKudo,
  useGetDashboardSummary,
  useListColleagues,
  useListKudos,
  useListModerationKudos,
  useModerateKudo,
  useReportKudo,
  type Colleague,
  type Kudo,
  type ModerationStatus,
} from "@workspace/api-client-react";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Heart,
  Inbox,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

const queryClient = new QueryClient();

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(date),
  );
}

function Avatar({ initials, tone = "coral" }: { initials: string; tone?: string }) {
  return <span className={`avatar avatar-${tone}`}>{initials}</span>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Heart size={17} fill="currentColor" /></div>
          <span>kudos</span>
        </div>
        <div className="workspace-label">TEAM CULTURE</div>
        <nav className="nav-list" aria-label="Primary navigation">
          <Link href="/" className={`nav-link ${location === "/" ? "active" : ""}`} data-testid="link-dashboard">
            <Sparkles size={17} /> Overview
          </Link>
          <Link href="/admin" className={`nav-link ${location === "/admin" ? "active" : ""}`} data-testid="link-admin">
            <ShieldCheck size={17} /> Moderation <span className="nav-pill">4</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-card">
            <div className="admin-avatar"><ShieldCheck size={16} /></div>
            <div><strong>Admin mode</strong><span>Review workspace</span></div>
            <ChevronDown size={15} />
          </div>
          <div className="user-card">
            <Avatar initials="YO" tone="purple" />
            <div><strong>You</strong><span>Team member</span></div>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark"><Heart size={16} fill="currentColor" /></div><span>kudos</span></div>
          <div className="topbar-spacer" />
          <span className="live-dot"><i /> All systems healthy</span>
          <button className="icon-button" aria-label="Notifications" data-testid="button-notifications"><Inbox size={18} /></button>
        </header>
        {children}
      </main>
    </div>
  );
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value?: number; detail: string; icon: ReactNode; tone: string }) {
  return (
    <div className={`stat-card ${tone}`} data-testid={`stat-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? <span className="skeleton short" />}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

function KudoCard({ kudo, onReport }: { kudo: Kudo; onReport: (kudo: Kudo) => void }) {
  return (
    <article className="kudo-card" data-testid={`card-kudo-${kudo.id}`}>
      <div className="kudo-card-top">
        <Avatar initials={kudo.recipientInitials} tone={kudo.id % 3 === 0 ? "gold" : kudo.id % 2 === 0 ? "blue" : "coral"} />
        <div className="kudo-meta">
          <strong>{kudo.senderName} <span>recognized</span> {kudo.recipientName}</strong>
          <time>{formatDate(kudo.createdAt)}</time>
        </div>
        <button className="quiet-button" onClick={() => onReport(kudo)} aria-label={`Report kudos for ${kudo.recipientName}`} data-testid={`button-report-${kudo.id}`}>
          <MoreHorizontal size={18} />
        </button>
      </div>
      <p className="kudo-message">“{kudo.message}”</p>
      <div className="kudo-card-footer"><span className="celebrate"><Heart size={13} fill="currentColor" /> Appreciation shared</span><span className="recipient-tag">@{kudo.recipientName.split(" ")[0].toLowerCase()}</span></div>
    </article>
  );
}

function SubmitKudos() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Colleague | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const colleagues = useListColleagues({ search });
  const createKudo = useCreateKudo();

  const submit = () => {
    if (!selected || message.trim().length < 3) {
      setError("Choose a colleague and write at least a few words.");
      return;
    }
    setError("");
    createKudo.mutate(
      { data: { recipientId: selected.id, message: message.trim(), senderName: "You" } },
      {
        onSuccess: () => {
          setSelected(null);
          setSearch("");
          setMessage("");
          setSuccess(true);
          void queryClient.invalidateQueries({ queryKey: getListKudosQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: (requestError) => setError(getErrorMessage(requestError)),
      },
    );
  };

  return (
    <section className="composer panel" aria-labelledby="send-kudos-heading">
      <div className="section-eyebrow"><Sparkles size={15} /> MAKE SOMEONE&apos;S DAY</div>
      <h2 id="send-kudos-heading">Send a little appreciation.</h2>
      <p className="muted">A few words can make a big difference. Let someone know you noticed.</p>
      <div className="form-row">
        <div className="field-wrap colleague-picker">
          <label htmlFor="colleague-search">Recognize someone</label>
          <div className="input-with-icon"><Search size={17} /><input id="colleague-search" value={selected ? selected.name : search} onChange={(event) => { setSelected(null); setSearch(event.target.value); }} placeholder="Search your team..." data-testid="input-colleague-search" /></div>
          {!selected && search.length > 0 && (
            <div className="suggestions" role="listbox">
              {colleagues.isLoading ? <div className="suggestion-empty"><Loader2 className="spin" size={16} /> Searching…</div> : colleagues.data?.length ? colleagues.data.map((colleague) => (
                <button key={colleague.id} type="button" className="suggestion" onClick={() => { setSelected(colleague); setSearch(""); }} data-testid={`button-select-colleague-${colleague.id}`}>
                  <Avatar initials={colleague.initials} tone="blue" /><span><strong>{colleague.name}</strong><small>{colleague.role}</small></span><ArrowUpRight size={15} />
                </button>
              )) : <div className="suggestion-empty">No teammates found.</div>}
            </div>
          )}
          {selected && <button className="clear-selection" type="button" onClick={() => setSelected(null)} data-testid="button-clear-colleague"><Check size={14} /> {selected.role}<X size={14} /></button>}
        </div>
        <div className="field-wrap message-field">
          <label htmlFor="kudos-message">Your message</label>
          <textarea id="kudos-message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 280))} placeholder="What did they do that made a difference?" rows={3} data-testid="textarea-kudos-message" />
          <span className="character-count">{message.length}/280</span>
        </div>
      </div>
      {error && <div className="form-message error" role="alert" data-testid="status-submit-error"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="form-message success" role="status" data-testid="status-submit-success"><CheckCircle2 size={16} /> Your appreciation is now in the feed.</div>}
      <div className="composer-actions"><span className="private-note"><ShieldCheck size={14} /> Visible to the whole team</span><button className="primary-button" onClick={submit} disabled={createKudo.isPending} data-testid="button-submit-kudos">{createKudo.isPending ? <Loader2 className="spin" size={17} /> : <Heart size={17} />} Send kudos</button></div>
    </section>
  );
}

function Dashboard() {
  const [reporting, setReporting] = useState<Kudo | null>(null);
  const summary = useGetDashboardSummary();
  const feed = useListKudos();
  const report = useReportKudo();
  const [reportError, setReportError] = useState("");
  const reportKudo = () => {
    if (!reporting) return;
    setReportError("");
    report.mutate({ id: reporting.id, data: { reason: "Needs administrator review." } }, {
      onSuccess: () => setReporting(null),
      onError: (error) => setReportError(getErrorMessage(error)),
    });
  };

  return (
    <>
      <div className="page-heading"><div><div className="section-eyebrow">TUESDAY, SEPTEMBER 22</div><h1>Good work deserves<br /><em>a little recognition.</em></h1><p className="heading-copy">Celebrate the people who make this team better, one kudo at a time.</p></div><div className="heading-decoration"><div className="sunburst">✦</div><span>Small moments.<br />Big energy.</span></div></div>
      <div className="stats-grid">
        <StatCard label="Total kudos" value={summary.data?.totalKudos} detail="All time" tone="stat-coral" icon={<Heart size={18} />} />
        <StatCard label="This week" value={summary.data?.kudosThisWeek} detail="Since Monday" tone="stat-yellow" icon={<Sparkles size={18} />} />
        <StatCard label="People recognized" value={summary.data?.peopleRecognized} detail="On your team" tone="stat-blue" icon={<Users size={18} />} />
      </div>
      <SubmitKudos />
      <section className="feed-section">
        <div className="section-header"><div><div className="section-eyebrow">THE GOOD STUFF</div><h2>Recent kudos</h2></div><span className="feed-count">{feed.data?.length ?? "—"} shared</span></div>
        {feed.isLoading ? <div className="loading-state"><Loader2 className="spin" size={22} /> Loading recent appreciation…</div> : feed.isError ? <div className="empty-state error-state"><AlertCircle size={24} /><strong>Couldn&apos;t load the feed</strong><span>{getErrorMessage(feed.error)}</span></div> : feed.data?.length ? <div className="feed-list">{feed.data.map((kudo) => <KudoCard key={kudo.id} kudo={kudo} onReport={setReporting} />)}</div> : <div className="empty-state"><MessageCircle size={26} /><strong>Be the first to share appreciation</strong><span>Recognize a teammate above and their kudo will appear here.</span></div>}
      </section>
      {reporting && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="modal-close" onClick={() => setReporting(null)} aria-label="Close report dialog" data-testid="button-close-report"><X size={18} /></button><div className="modal-icon"><ShieldCheck size={21} /></div><h2 id="report-title">Report this kudo?</h2><p>It will be hidden from the public feed while an administrator reviews it.</p>{reportError && <div className="form-message error">{reportError}</div>}<div className="modal-actions"><button className="secondary-button" onClick={() => setReporting(null)} data-testid="button-cancel-report">Keep it</button><button className="danger-button" onClick={reportKudo} disabled={report.isPending} data-testid="button-confirm-report">{report.isPending ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />} Report for review</button></div></div></div>}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.replace("_", "-")}`}>{status === "needs_review" ? "Needs review" : status[0].toUpperCase() + status.slice(1)}</span>;
}

function Admin() {
  const [status, setStatus] = useState<"all" | ModerationStatus>("needs_review");
  const [actionError, setActionError] = useState("");
  const queryClient = useQueryClient();
  const params = useMemo(() => status === "all" ? {} : { status }, [status]);
  const queue = useListModerationKudos(params);
  const moderate = useModerateKudo();
  const remove = useDeleteKudo();
  const rows = queue.data ?? [];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListModerationKudosQueryKey(params) });
    void queryClient.invalidateQueries({ queryKey: getListKudosQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };
  const decide = (kudo: Kudo, nextStatus: "approved" | "removed") => {
    setActionError("");
    moderate.mutate({ id: kudo.id, data: { status: nextStatus } }, { onSuccess: refresh, onError: (error) => setActionError(getErrorMessage(error)) });
  };
  const deletePermanently = (kudo: Kudo) => {
    if (!window.confirm("Permanently delete this kudo?")) return;
    setActionError("");
    remove.mutate({ id: kudo.id }, { onSuccess: refresh, onError: (error) => setActionError(getErrorMessage(error)) });
  };

  return (
    <>
      <div className="page-heading admin-heading"><div><div className="section-eyebrow">ADMINISTRATOR VIEW</div><h1>Keep the good<br /><em>stuff visible.</em></h1><p className="heading-copy">Review reports, protect the team culture, and keep appreciation moving.</p></div><div className="admin-illustration"><ShieldCheck size={62} strokeWidth={1.3} /><span>MODERATION<br />CENTER</span></div></div>
      <div className="moderation-toolbar"><div className="tabs" role="tablist">{(["needs_review", "approved", "removed", "all"] as const).map((item) => <button key={item} role="tab" aria-selected={status === item} className={`tab ${status === item ? "active" : ""}`} onClick={() => setStatus(item)} data-testid={`tab-moderation-${item}`}>{item === "needs_review" ? "Needs review" : item[0].toUpperCase() + item.slice(1)}{item === "needs_review" && <span className="tab-count">1</span>}</button>)}</div><span className="muted small"><ShieldCheck size={14} /> Public visibility is protected</span></div>
      {actionError && <div className="form-message error" role="alert"><AlertCircle size={16} /> {actionError}</div>}
      {queue.isLoading ? <div className="loading-state"><Loader2 className="spin" size={22} /> Loading moderation queue…</div> : queue.isError ? <div className="empty-state error-state"><AlertCircle size={24} /><strong>Couldn&apos;t load moderation</strong><span>{getErrorMessage(queue.error)}</span></div> : rows.length ? <div className="moderation-list">{rows.map((kudo) => <article className="moderation-card" key={kudo.id} data-testid={`card-moderation-${kudo.id}`}><div className="moderation-card-top"><div className="moderation-person"><Avatar initials={kudo.recipientInitials} tone="blue" /><div><strong>{kudo.senderName} <span>to</span> {kudo.recipientName}</strong><time>{formatDate(kudo.createdAt)}</time></div></div><StatusBadge status={kudo.status} /></div><p>{kudo.message}</p>{kudo.reportReason && <div className="report-reason"><ShieldCheck size={15} /><span><strong>Report note</strong>{kudo.reportReason}</span></div>}<div className="moderation-actions">{kudo.status !== "approved" && <button className="approve-button" onClick={() => decide(kudo, "approved")} disabled={moderate.isPending} data-testid={`button-approve-${kudo.id}`}><CheckCircle2 size={16} /> Approve</button>}{kudo.status !== "removed" && <button className="remove-button" onClick={() => decide(kudo, "removed")} disabled={moderate.isPending} data-testid={`button-remove-${kudo.id}`}><X size={16} /> Remove</button>}<button className="delete-button" onClick={() => deletePermanently(kudo)} disabled={remove.isPending} data-testid={`button-delete-${kudo.id}`}><Trash2 size={15} /> Delete permanently</button></div></article>)}</div> : <div className="empty-state"><CheckCircle2 size={28} /><strong>Nothing here right now</strong><span>This moderation queue is clear.</span></div>}
    </>
  );
}

function NotFound() {
  return <div className="empty-state page-empty"><AlertCircle size={28} /><strong>Page not found</strong><Link href="/" className="text-link">Return to overview</Link></div>;
}

function AppRoutes() {
  return <Router base={getBasePath()}><Shell><Switch><Route path="/" component={Dashboard} /><Route path="/admin" component={Admin} /><Route path="/preview" component={Dashboard} /><Route path="/preview/admin" component={Admin} /><Route component={NotFound} /></Switch></Shell></Router>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><AppRoutes /></QueryClientProvider>;
}