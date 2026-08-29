import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const origin = url.origin;

        if (!code) {
          return Response.redirect(`${origin}/?github_error=missing_code`, 302);
        }

        const clientId =
          process.env["GITHUB_CLIENT_ID"] || process.env["VITE_GITHUB_CLIENT_ID"] || "";
        const clientSecret = process.env["GITHUB_CLIENT_SECRET"] || "";

        if (!clientId || !clientSecret) {
          return Response.redirect(
            `${origin}/?github_error=missing_server_credentials`,
            302,
          );
        }

        try {
          const response = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code,
            }),
          });

          const data = (await response.json()) as {
            access_token?: string;
            error?: string;
            error_description?: string;
          };

          if (data.access_token) {
            let customUser = null;
            try {
              const userRes = await fetch("https://api.github.com/user", {
                headers: {
                  Accept: "application/vnd.github+json",
                  Authorization: `Bearer ${data.access_token}`,
                  "User-Agent": "Pocket-CTO-App",
                },
              });
              if (userRes.ok) {
                const ghUser = (await userRes.json()) as {
                  id: number;
                  login: string;
                  name?: string;
                  avatar_url?: string;
                  email?: string;
                };
                customUser = {
                  id: `github_${ghUser.id}`,
                  email: ghUser.email || `${ghUser.login}@users.noreply.github.com`,
                  user_metadata: {
                    display_name: ghUser.name || ghUser.login,
                    full_name: ghUser.name || ghUser.login,
                    avatar_url: ghUser.avatar_url || "",
                    user_name: ghUser.login,
                  },
                };
              }
            } catch {
              /* ignore error fetching extra profile */
            }

            const userParam = customUser
              ? `&auth_user=${encodeURIComponent(JSON.stringify(customUser))}`
              : "";

            return Response.redirect(
              `${origin}/history?github_token=${encodeURIComponent(data.access_token)}${userParam}`,
              302,
            );
          }

          const errMsg = data.error_description || data.error || "oauth_failed";
          return Response.redirect(
            `${origin}/auth?github_error=${encodeURIComponent(errMsg)}`,
            302,
          );
        } catch (err) {
          return Response.redirect(
            `${origin}/auth?github_error=${encodeURIComponent(String(err))}`,
            302,
          );
        }
      },
    },
  },
});
