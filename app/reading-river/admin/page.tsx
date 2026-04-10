import { headers } from "next/headers";
import { createInviteAction, deactivateUserAction, revokeInviteAction } from "./actions";
import { requireAdminUser } from "@/lib/reading-river/current-user";
import { getPrismaClient } from "@/lib/reading-river/db";
import { readingRiverPath } from "@/lib/reading-river/routes";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function getSearchParamValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return typeof value === "string" ? value : null;
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
}

export default async function AdminPage({ searchParams }: AdminPageProps = {}) {
  const currentUser = await requireAdminUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const inviteToken = getSearchParamValue(resolvedSearchParams, "inviteToken");
  const emailStatus = getSearchParamValue(resolvedSearchParams, "emailStatus");
  const origin = inviteToken ? await getRequestOrigin() : null;
  const inviteUrl = inviteToken
    ? origin
      ? new URL(readingRiverPath(`/invite/${inviteToken}`), origin).toString()
      : readingRiverPath(`/invite/${inviteToken}`)
    : null;
  const prisma = getPrismaClient();

  const [invites, users] = await Promise.all([
    prisma.invite.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.user.findMany({
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const pendingInvites = invites.filter((invite) => !invite.redeemedAt && !invite.revokedAt);
  const redeemedInvites = invites.filter((invite) => invite.redeemedAt);

  return (
    <main className="river-page">
      <section className="editorial-page-masthead">
        <div className="editorial-page-masthead-copy">
          <p className="editorial-page-kicker">Admin</p>
          <h1 className="editorial-page-title">Admin beta management</h1>
          <p className="editorial-page-intro">
            Invite readers, review redemptions, and manage beta accounts.
          </p>
        </div>
      </section>

      <section className="editorial-panel">
        <div className="space-y-3">
          <p className="river-section-label">Create invite</p>
          <h2 className="text-2xl font-semibold tracking-tight">Invite a reader</h2>
        </div>

        <form action={createInviteAction} className="editorial-form">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Invite email</span>
            <input
              autoComplete="email"
              className="intake-input"
              name="email"
              required
              type="email"
            />
          </label>
          <div className="intake-submit-row">
            <button className="intake-submit-button" type="submit">
              Create invite
            </button>
          </div>
        </form>
      </section>

      {inviteUrl ? (
        <section className="editorial-panel">
          <p className="river-section-label">Invite link ready</p>
          {emailStatus === "sent" ? (
            <p className="river-history-meta">Invite email sent.</p>
          ) : emailStatus === "failed" ? (
            <p className="river-history-meta">
              Invite created, but the email did not send. Copy the link below and send it
              manually.
            </p>
          ) : null}
          <label className="block space-y-2">
            <span className="text-sm font-medium">Invite URL</span>
            <input className="intake-input" readOnly type="text" value={inviteUrl} />
          </label>
          <a href={inviteUrl} className="river-spotlight-link">
            Open invite
          </a>
        </section>
      ) : null}

      <section className="editorial-panel">
        <p className="river-section-label">Pending invites</p>
        {pendingInvites.length > 0 ? (
          <ul className="river-history-list">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="river-history-item">
                <div className="river-history-item-head">
                  <h2 className="river-history-item-title">{invite.email}</h2>
                </div>
                <p className="river-history-meta">
                  Expires {dateFormatter.format(invite.expiresAt)}
                </p>
                <form action={revokeInviteAction}>
                  <input name="inviteId" type="hidden" value={invite.id} />
                  <button className="river-spotlight-action-button" type="submit">
                    Revoke invite for {invite.email}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="river-spotlight-empty">No pending invites.</p>
        )}
      </section>

      <section className="editorial-panel">
        <p className="river-section-label">Redeemed invites</p>
        {redeemedInvites.length > 0 ? (
          <ul className="river-history-list">
            {redeemedInvites.map((invite) => (
              <li key={invite.id} className="river-history-item">
                <div className="river-history-item-head">
                  <h2 className="river-history-item-title">{invite.email}</h2>
                </div>
                <p className="river-history-meta">
                  Redeemed {dateFormatter.format(invite.redeemedAt ?? invite.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="river-spotlight-empty">No redeemed invites yet.</p>
        )}
      </section>

      <section className="editorial-panel">
        <p className="river-section-label">Users</p>
        {users.length > 0 ? (
          <ul className="river-history-list">
            {users.map((user) => {
              const isCurrentAdmin = user.id === currentUser.id;
              const isActive = user.status === "active";

              return (
                <li key={user.id} className="river-history-item">
                  <div className="river-history-item-head">
                    <h2 className="river-history-item-title">
                      {user.displayName ?? user.email}
                    </h2>
                  </div>
                  <p className="river-history-meta">
                    {user.email}
                    {" • "}
                    {user.isAdmin ? "Admin" : user.status}
                  </p>
                  {isCurrentAdmin ? (
                    <p className="river-spotlight-tags">Current admin</p>
                  ) : isActive ? (
                    <form action={deactivateUserAction}>
                      <input name="userId" type="hidden" value={user.id} />
                      <button className="river-spotlight-action-button" type="submit">
                        Deactivate {user.email}
                      </button>
                    </form>
                  ) : (
                    <p className="river-spotlight-tags">Deactivated</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="river-spotlight-empty">No users yet.</p>
        )}
      </section>
    </main>
  );
}
