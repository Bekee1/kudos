import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, sql } from "drizzle-orm";
import { db, colleaguesTable, kudosTable } from "@workspace/db";
import {
  CreateKudoBody,
  GetDashboardSummaryResponse,
  ListColleaguesQueryParams,
  ListColleaguesResponse,
  ListKudosResponse,
  ListModerationKudosQueryParams,
  ListModerationKudosResponse,
  ModerateKudoBody,
  ReportKudoBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
let seedPromise: Promise<void> | null = null;
const weekStart = (): Date => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date;
};

async function ensureSeedData(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(colleaguesTable);
    if (Number(count) > 0) return;

    const [maya, jordan, sam, priya] = await db
      .insert(colleaguesTable)
      .values([
        { name: "Maya Chen", role: "Product Design", initials: "MC", isAdmin: true },
        { name: "Jordan Ellis", role: "Engineering", initials: "JE", isAdmin: false },
        { name: "Sam Okafor", role: "Customer Success", initials: "SO", isAdmin: false },
        { name: "Priya Shah", role: "Marketing", initials: "PS", isAdmin: false },
      ])
      .returning();

    await db.insert(kudosTable).values([
      {
        senderName: "Amara Williams",
        recipientId: jordan.id,
        message: "Thank you for unblocking the launch and making the handoff feel effortless.",
        status: "approved",
        isVisible: true,
      },
      {
        senderName: "Theo Martin",
        recipientId: maya.id,
        message: "Your thoughtful critique helped the whole team find a clearer direction.",
        status: "approved",
        isVisible: true,
      },
      {
        senderName: "Leila Brown",
        recipientId: sam.id,
        message: "You kept every customer conversation kind, clear, and moving forward.",
        status: "approved",
        isVisible: true,
      },
      {
        senderName: "Nate Wilson",
        recipientId: priya.id,
        message: "The campaign story made the work easy to understand and exciting to share.",
        status: "needs_review",
        isVisible: false,
        reportReason: "Contains wording that needs a quick review.",
      },
    ]);
  })();
  try {
    await seedPromise;
  } finally {
    seedPromise = null;
  }
}

async function selectKudos(status?: string) {
  const query = db
    .select({
      id: kudosTable.id,
      senderName: kudosTable.senderName,
      recipientId: kudosTable.recipientId,
      recipientName: colleaguesTable.name,
      recipientInitials: colleaguesTable.initials,
      message: kudosTable.message,
      status: kudosTable.status,
      isVisible: kudosTable.isVisible,
      reportReason: kudosTable.reportReason,
      createdAt: kudosTable.createdAt,
    })
    .from(kudosTable)
    .innerJoin(colleaguesTable, eq(kudosTable.recipientId, colleaguesTable.id))
    .orderBy(desc(kudosTable.createdAt));

  if (status) return query.where(eq(kudosTable.status, status));
  return query;
}

router.get("/colleagues", async (req, res): Promise<void> => {
  await ensureSeedData();
  const parsed = ListColleaguesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search } = parsed.data;
  const rows = await db
    .select({
      id: colleaguesTable.id,
      name: colleaguesTable.name,
      role: colleaguesTable.role,
      initials: colleaguesTable.initials,
    })
    .from(colleaguesTable)
    .where(search ? ilike(colleaguesTable.name, `%${search}%`) : undefined)
    .orderBy(colleaguesTable.name);

  res.json(ListColleaguesResponse.parse(rows));
});

router.get("/kudos", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const rows = await db
    .select({
      id: kudosTable.id,
      senderName: kudosTable.senderName,
      recipientId: kudosTable.recipientId,
      recipientName: colleaguesTable.name,
      recipientInitials: colleaguesTable.initials,
      message: kudosTable.message,
      status: kudosTable.status,
      isVisible: kudosTable.isVisible,
      reportReason: kudosTable.reportReason,
      createdAt: kudosTable.createdAt,
    })
    .from(kudosTable)
    .innerJoin(colleaguesTable, eq(kudosTable.recipientId, colleaguesTable.id))
    .where(and(eq(kudosTable.status, "approved"), eq(kudosTable.isVisible, true)))
    .orderBy(desc(kudosTable.createdAt))
    .limit(30);
  res.json(ListKudosResponse.parse(rows));
});

router.post("/kudos", async (req, res): Promise<void> => {
  await ensureSeedData();
  const parsed = CreateKudoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [recipient] = await db
    .select()
    .from(colleaguesTable)
    .where(eq(colleaguesTable.id, parsed.data.recipientId));
  if (!recipient) {
    res.status(400).json({ error: "Choose a valid colleague." });
    return;
  }

  const [created] = await db
    .insert(kudosTable)
    .values({
      recipientId: parsed.data.recipientId,
      message: parsed.data.message.trim(),
      senderName: parsed.data.senderName ?? "You",
      status: "approved",
      isVisible: true,
    })
    .returning();

  res.status(201).json({
    id: created.id,
    senderName: created.senderName,
    recipientId: recipient.id,
    recipientName: recipient.name,
    recipientInitials: recipient.initials,
    message: created.message,
    status: created.status,
    isVisible: created.isVisible,
    reportReason: created.reportReason,
    createdAt: created.createdAt,
  });
});

router.post("/kudos/:id/report", async (req, res): Promise<void> => {
  await ensureSeedData();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid kudo id." });
    return;
  }
  const parsed = ReportKudoBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(kudosTable)
    .set({
      status: "needs_review",
      isVisible: false,
      reportReason: parsed.data.reason?.trim() || "Reported by community.",
    })
    .where(eq(kudosTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Kudo not found." });
    return;
  }

  const [row] = await (await selectKudos("needs_review")).filter(
    (kudo) => kudo.id === id,
  );
  res.json(row);
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const visible = and(eq(kudosTable.status, "approved"), eq(kudosTable.isVisible, true));
  const [{ totalKudos }] = await db
    .select({ totalKudos: sql<number>`count(*)` })
    .from(kudosTable)
    .where(visible);
  const [{ kudosThisWeek }] = await db
    .select({ kudosThisWeek: sql<number>`count(*)` })
    .from(kudosTable)
    .where(and(visible, gte(kudosTable.createdAt, weekStart())));
  const [{ peopleRecognized }] = await db
    .select({ peopleRecognized: sql<number>`count(distinct ${kudosTable.recipientId})` })
    .from(kudosTable)
    .where(visible);

  res.json(
    GetDashboardSummaryResponse.parse({
      totalKudos: Number(totalKudos),
      kudosThisWeek: Number(kudosThisWeek),
      peopleRecognized: Number(peopleRecognized),
    }),
  );
});

router.get("/admin/kudos", async (req, res): Promise<void> => {
  await ensureSeedData();
  const parsed = ListModerationKudosQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await selectKudos(parsed.data.status);
  res.json(ListModerationKudosResponse.parse(rows));
});

router.patch("/admin/kudos/:id/moderation", async (req, res): Promise<void> => {
  await ensureSeedData();
  const id = Number(req.params.id);
  const parsed = ModerateKudoBody.safeParse(req.body);
  if (!Number.isInteger(id) || id < 1 || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid kudo id." : parsed.error.message });
    return;
  }
  const isVisible = parsed.data.status === "approved";
  const [updated] = await db
    .update(kudosTable)
    .set({ status: parsed.data.status, isVisible, moderatedAt: new Date() })
    .where(eq(kudosTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Kudo not found." });
    return;
  }
  const rows = await selectKudos();
  res.json(rows.find((row) => row.id === id));
});

router.delete("/admin/kudos/:id", async (req, res): Promise<void> => {
  await ensureSeedData();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid kudo id." });
    return;
  }
  const deleted = await db.delete(kudosTable).where(eq(kudosTable.id, id)).returning({ id: kudosTable.id });
  if (!deleted.length) {
    res.status(404).json({ error: "Kudo not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;