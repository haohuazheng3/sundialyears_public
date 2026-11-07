/**
 * Owner error e-mails (src/lib/server/errors.ts → notifyOwner) link to /admin/errors. The errors live in the dashboard's
 * #errors panel, so send that link there instead of to a 404. Relative Location: no request data needed.
 */
export function GET() {
  return new Response(null, { status: 307, headers: { location: "/admin#errors", "cache-control": "no-store" } });
}
