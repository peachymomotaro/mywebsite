import { headers } from "next/headers";
import { createInviteAction, deactivateUserAction, revokeInviteAction } from "./actions";
import { requireAdminUser } from "@/lib/reading-river/current-user";
import { getPrismaClient } from "@/lib/reading-river/db";
import { readingRiverPath } from "@/lib/reading-river/routes";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
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

export default async function AdminPage({ searchParams }: AdminPageProps) {
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

  /** Laid out like How It Works: each job is a section with its name in the margin. */
  return (
    <main className="editorial-page river-how-page">
      <div className="editorial-page-surface">
        <header className="editorial-page-masthead">
          <div className="editorial-page-masthead-copy">
            <h1 className="editorial-page-title">Admin</h1>
            <p className="editorial-page-intro">
              Invite readers, review redemptions, and manage beta accounts. Only you can see this page.
            </p>
          </div>
        </header>

        <div className="editorial-page-content river-how-page-content">
          <section className="river-how-section" aria-labelledby="river-admin-invite">
            <h2 id="river-admin-invite">Invite a reader</h2>
            <div className="river-how-copy">
              <form action={createInviteAction} className="river-preferences-form">
                <label className="river-preferences-choice">
                  <span className="river-preferences-choice-copy">Invite email</span>
                  <input
                    autoComplete="email"
                    className="intake-input river-admin-input"
                    name="email"
                    required
                    type="email"
                  />
                </label>
                <div className="river-preferences-submit-row">
                  <button className="intake-submit-button" type="submit">
                    Create invite
                  </button>
                </div>
              </form>

              {inviteUrl ? (
                <div className="river-admin-invite-ready" role="status">
                  {emailStatus === "sent" ? (
                    <p>Invite email sent.</p>
                  ) : emailStatus === "failed" ? (
                    <p>
                      Invite created, but the email did not send. Copy the link below and send it
                      manually.
                    </p>
                  ) : null}
                  <label className="river-preferences-choice">
                    <span className="river-preferences-choice-copy">Invite URL</span>
                    <input className="intake-input river-admin-input" readOnly type="text" value={inviteUrl} />
                  </label>
                  <a href={inviteUrl} className="river-history-link">
                    Open invite
                  </a>
                </div>
              ) : null}
            </div>
          </section>

          <section className="river-how-section" aria-labelledby="river-admin-pending">
            <h2 id="river-admin-pending">Pending invites</h2>
            {pendingInvites.length > 0 ? (
              <ul className="river-history-list">
                {pendingInvites.map((invite) => (
                  <li key={invite.id} className="river-history-item river-admin-row">
                    <div>
                      <h3 className="river-history-item-title">{invite.email}</h3>
                      <p className="river-history-meta">
                        Expires {dateFormatter.format(invite.expiresAt)}
                      </p>
                    </div>
                    <form action={revokeInviteAction}>
                      <input name="inviteId" type="hidden" value={invite.id} />
                      <button className="river-admin-action" type="submit"
                        aria-label={`Revoke invite for ${invite.email}`}>
                        Revoke
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="river-how-copy"><p>No pending invites.</p></div>
            )}
          </section>

          <section className="river-how-section" aria-labelledby="river-admin-redeemed">
            <h2 id="river-admin-redeemed">Redeemed invites</h2>
            {redeemedInvites.length > 0 ? (
              <ul className="river-history-list">
                {redeemedInvites.map((invite) => (
                  <li key={invite.id} className="river-history-item">
                    <h3 className="river-history-item-title">{invite.email}</h3>
                    <p className="river-history-meta">
                      Redeemed {dateFormatter.format(invite.redeemedAt ?? invite.updatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="river-how-copy"><p>No redeemed invites yet.</p></div>
            )}
          </section>

          <section className="river-how-section" aria-labelledby="river-admin-users">
            <h2 id="river-admin-users">Readers</h2>
            {users.length > 0 ? (
              <ul className="river-history-list">
                {users.map((user) => {
                  const isCurrentAdmin = user.id === currentUser.id;
                  const isActive = user.status === "active";

                  return (
                    <li key={user.id} className="river-history-item river-admin-row">
                      <div>
                        <h3 className="river-history-item-title">
                          {user.displayName ?? user.email}
                        </h3>
                        <p className="river-history-meta">
                          {user.displayName ? `${user.email}, ` : ""}
                          {isCurrentAdmin ? "you (admin)" : user.isAdmin ? "admin" : isActive ? "active" : "deactivated"}
                        </p>
                      </div>
                      {!isCurrentAdmin && isActive && !user.isAdmin ? (
                        <form action={deactivateUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="river-admin-action" type="submit"
                            aria-label={`Deactivate ${user.email}`}>
                            Deactivate
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="river-how-copy"><p>No readers yet.</p></div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
