import Link from "next/link";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/src/lib/authz";
import { ensureBugReportTable, q } from "@/src/lib/db";

type BugReport = {
  id: string;
  userid: string | null;
  characterid: string | null;
  description: string;
  screenshot: string | null;
  status: string;
  createdat: string;
};

export default async function AdminBugReportsPage() {
  const session = await assertAdmin();
  if (!session) return <div className="text-red-400">Forbidden</div>;
  await ensureBugReportTable();
  const reports = await q<BugReport>`
    select id, userid, characterid, description, screenshot, status,
           to_char(createdat, 'YYYY-MM-DD"T"HH24:MI:SSZ') as createdat
    from "BugReport"
    where status <> 'resolved'
    order by createdat desc
  `;
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bug Reports</h1>
        <span className="text-sm text-gray-400">{reports.length} open</span>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-gray-400">No active bug reports.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <BugCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </section>
  );
}

function BugCard({ report }: { report: BugReport }) {
  const created = new Date(report.createdat);
  const createdLabel = created.toLocaleString();
  const characterHref = report.characterid ? `/api/admin/zones?highlight=${report.characterid}` : null;
  return (
    <div className="space-y-3 rounded border border-white/10 bg-black/40 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-300">Open</div>
          <div className="text-sm text-gray-400">{createdLabel}</div>
        </div>
        <CompleteButton id={report.id} />
      </div>
      <div className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">{report.description}</div>
      <div className="text-xs text-gray-400 space-y-1">
        <div>Report ID: <span className="font-mono text-gray-300">{report.id}</span></div>
        {report.userid && <div>User: <span className="font-mono text-gray-300">{report.userid}</span></div>}
        {report.characterid && (
          <div>
            Character:{" "}
            {characterHref ? (
              <Link href={characterHref} className="text-emerald-300 hover:underline">
                {report.characterid}
              </Link>
            ) : (
              <span className="font-mono text-gray-300">{report.characterid}</span>
            )}
          </div>
        )}
      </div>
      {report.screenshot ? (
        <div className="overflow-hidden rounded border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.screenshot} alt="Bug screenshot" className="w-full object-cover" />
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">No screenshot attached.</div>
      )}
    </div>
  );
}

async function completeReport(id: string) {
  "use server";
  await ensureBugReportTable();
  await q`
    update "BugReport"
    set status = 'resolved', resolvedat = now()
    where id = ${id}
  `;
  revalidatePath("/admin/bug-reports");
}

function CompleteButton({ id }: { id: string }) {
  async function onComplete() {
    await completeReport(id);
  }
  return (
    <form action={onComplete}>
      <button className="btn bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-sm" type="submit">
        Complete
      </button>
    </form>
  );
}
