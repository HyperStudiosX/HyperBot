// Created by HyperForgeX
// Pterodactyl Panel authentication and session handling.

import axios from "axios";
import config from "../config.js";

const PANEL_URL = String(
  config.PTERODACTYL_URL ||
  config.pterodactylUrl ||
  ""
).trim().replace(/\/+$/, "");

if (!PANEL_URL) {
  throw new Error("PTERODACTYL_URL is not configured.");
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

function extractCookies(setCookie) {
  if (!Array.isArray(setCookie)) return {};

  const cookies = {};

  for (const item of setCookie) {
    const firstPart = String(item).split(";")[0];
    const separator = firstPart.indexOf("=");

    if (separator === -1) continue;

    const name = firstPart.slice(0, separator).trim();
    const value = firstPart.slice(separator + 1).trim();

    if (name) {
      cookies[name] = value;
    }
  }

  return cookies;
}

function mergeCookies(...cookieSets) {
  const merged = {};

  for (const set of cookieSets) {
    if (!set) continue;

    for (const [name, value] of Object.entries(set)) {
      if (value !== undefined && value !== null) {
        merged[name] = value;
      }
    }
  }

  return merged;
}

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function extractCsrfToken(html) {
  const source = String(html || "");

  const patterns = [
    /name=["']_token["'][^>]*value=["']([^"']+)["']/i,
    /name=["']_token["'][^>]*value=([^ >]+)/i,
    /value=["']([^"']+)["'][^>]*name=["']_token["']/i,
    /value=([^ >]+)[^>]*name=["']_token["']/i,
    /name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']csrf-token["']/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);

    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function normalizeRedirect(location) {
  if (!location) return "/";

  try {
    return new URL(location, PANEL_URL).pathname;
  } catch {
    return String(location);
  }
}

function isLoginPage(html) {
  const source = String(html || "").toLowerCase();

  return (
    source.includes("_token") &&
    source.includes("password") &&
    (
      source.includes("name=\"email\"") ||
      source.includes("type=\"email\"") ||
      source.includes("name='email'") ||
      source.includes("type='email'")
    )
  );
}

function getErrorFromHtml(html) {
  const source = String(html || "").toLowerCase();

  const messages = [
    "these credentials do not match our records",
    "the provided credentials are incorrect",
    "invalid credentials",
    "these credentials do not match",
    "invalid email",
    "invalid password",
    "too many login attempts"
  ];

  for (const message of messages) {
    if (source.includes(message)) {
      return message;
    }
  }

  return null;
}

function getResponsePreview(data) {
  if (typeof data !== "string") {
    try {
      return JSON.stringify(data).slice(0, 500);
    } catch {
      return String(data).slice(0, 500);
    }
  }

  return data
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

async function getLoginPage() {
  let response;

  try {
    response = await axios.get(`${PANEL_URL}/auth/login`, {
      maxRedirects: 0,
      validateStatus: () => true,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      }
    });
  } catch (error) {
    throw new PanelAuthError(
      `Could not connect to the Pterodactyl Panel: ${error.message}`,
      "PANEL_CONNECTION_ERROR",
      502
    );
  }

  if (response.status >= 400) {
    const preview = getResponsePreview(response.data);

    console.error(
      `[PanelAuth] Login page returned HTTP ${response.status}: ${preview}`
    );

    throw new PanelAuthError(
      `Pterodactyl login page returned HTTP ${response.status}. The Panel or reverse proxy may be blocking the dashboard request.`,
      "LOGIN_PAGE_REJECTED",
      response.status
    );
  }

  const cookies = extractCookies(response.headers["set-cookie"]);
  const csrfToken = extractCsrfToken(response.data);

  if (!csrfToken) {
    console.error(
      "[PanelAuth] CSRF token was not found on the Pterodactyl login page."
    );

    console.error(
      "[PanelAuth] Response preview:",
      getResponsePreview(response.data)
    );

    throw new PanelAuthError(
      "Pterodactyl did not provide a CSRF token. Check the Panel URL and reverse proxy configuration.",
      "MISSING_CSRF",
      502
    );
  }

  return {
    html: response.data,
    csrfToken,
    cookies
  };
}

async function verifyPanelSession(cookies) {
  if (!cookies || Object.keys(cookies).length === 0) {
    return {
      authenticated: false,
      reason: "NO_COOKIES"
    };
  }

  let response;

  try {
    response = await axios.get(`${PANEL_URL}/account`, {
      maxRedirects: 0,
      validateStatus: () => true,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${PANEL_URL}/auth/login`,
        Cookie: cookieHeader(cookies)
      }
    });
  } catch (error) {
    return {
      authenticated: false,
      reason: "CONNECTION_ERROR",
      error: error.message
    };
  }

  const location =
    response.headers.location ||
    response.headers.Location ||
    "";

  const redirectPath = normalizeRedirect(location);

  if (
    response.status >= 300 &&
    response.status < 400 &&
    redirectPath.startsWith("/auth/login")
  ) {
    return {
      authenticated: false,
      reason: "REDIRECTED_TO_LOGIN"
    };
  }

  if (response.status === 401 || response.status === 403) {
    console.error(
      `[PanelAuth] Session verification returned HTTP ${response.status}`
    );

    return {
      authenticated: false,
      reason: `HTTP_${response.status}`
    };
  }

  if (response.status >= 200 && response.status < 300) {
    if (isLoginPage(response.data)) {
      return {
        authenticated: false,
        reason: "LOGIN_PAGE_RETURNED"
      };
    }

    return {
      authenticated: true
    };
  }

  return {
    authenticated: false,
    reason: `HTTP_${response.status}`
  };
}

async function getPanelAccount(cookies) {
  const verification = await verifyPanelSession(cookies);

  if (!verification.authenticated) {
    console.error(
      `[PanelAuth] Panel session verification failed: ${verification.reason}`
    );

    return null;
  }

  return {
    authenticated: true
  };
}

export async function loginToPanel(email, password) {
  if (!email || !password) {
    throw new PanelAuthError(
      "Panel email and password are required.",
      "MISSING_CREDENTIALS",
      400
    );
  }

  console.log(
    `[PanelAuth] Starting Pterodactyl login for ${String(email).trim()}`
  );

  const loginPage = await getLoginPage();

  const initialCookies = loginPage.cookies;

  console.log(
    `[PanelAuth] Login page obtained. Cookies: ${Object.keys(initialCookies).join(", ") || "none"}`
  );

  const form = new URLSearchParams();

  form.append("_token", loginPage.csrfToken);
  form.append("email", String(email).trim());
  form.append("password", String(password));

  let response;

  try {
    response = await axios.post(
      `${PANEL_URL}/auth/login`,
      form.toString(),
      {
        maxRedirects: 0,
        validateStatus: () => true,
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: `${PANEL_URL}/auth/login`,
          Origin: PANEL_URL,
          Cookie: cookieHeader(initialCookies),
          "Cache-Control": "no-cache"
        }
      }
    );
  } catch (error) {
    console.error("[PanelAuth] Login request failed:", error.message);

    throw new PanelAuthError(
      `Could not connect to the Pterodactyl Panel: ${error.message}`,
      "LOGIN_CONNECTION_ERROR",
      502
    );
  }

  const responseCookies = extractCookies(
    response.headers["set-cookie"]
  );

  const cookies = mergeCookies(
    initialCookies,
    responseCookies
  );

  const location =
    response.headers.location ||
    response.headers.Location ||
    "";

  const redirectPath = normalizeRedirect(location);

  console.log(
    `[PanelAuth] Login response: HTTP ${response.status} ${location ? `-> ${redirectPath}` : ""}`
  );

  if (response.status >= 300 && response.status < 400) {
    if (redirectPath.startsWith("/auth/login")) {
      const htmlError = getErrorFromHtml(response.data);

      if (htmlError) {
        throw new PanelAuthError(
          "Pterodactyl rejected the email or password.",
          "INVALID_CREDENTIALS",
          401
        );
      }

      throw new PanelAuthError(
        "Pterodactyl redirected back to the login page. The email/password may be incorrect or the Panel rejected the session.",
        "LOGIN_REDIRECTED",
        401
      );
    }

    if (
      redirectPath.startsWith("/auth/checkpoint") ||
      redirectPath.startsWith("/auth/two-factor")
    ) {
      throw new PanelAuthError(
        "This Pterodactyl account requires additional authentication. Complete the Panel login directly first.",
        "TWO_FACTOR_REQUIRED",
        401
      );
    }

    const account = await getPanelAccount(cookies);

    if (!account) {
      throw new PanelAuthError(
        "Pterodactyl accepted the login redirect, but the dashboard could not verify the session.",
        "SESSION_VERIFICATION_FAILED",
        401
      );
    }

    return {
      success: true,
      cookies,
      redirect: redirectPath,
      panelAccount: account
    };
  }

  const htmlError = getErrorFromHtml(response.data);

  if (htmlError) {
    throw new PanelAuthError(
      "Pterodactyl rejected the email or password.",
      "INVALID_CREDENTIALS",
      401
    );
  }

  if (response.status === 419) {
    throw new PanelAuthError(
      "Pterodactyl rejected the CSRF/session token. Check the Panel URL and reverse proxy configuration.",
      "CSRF_ERROR",
      419
    );
  }

  if (response.status === 403) {
    const preview = getResponsePreview(response.data);

    console.error(
      `[PanelAuth] Pterodactyl returned HTTP 403 during login. Response: ${preview}`
    );

    throw new PanelAuthError(
      "Pterodactyl returned HTTP 403 for the login request. This is a Panel/proxy access rejection, not necessarily an incorrect password.",
      "PANEL_403",
      403
    );
  }

  if (response.status === 401) {
    throw new PanelAuthError(
      "Pterodactyl rejected the login credentials.",
      "INVALID_CREDENTIALS",
      401
    );
  }

  if (response.status >= 400) {
    const preview = getResponsePreview(response.data);

    console.error(
      `[PanelAuth] Login returned HTTP ${response.status}: ${preview}`
    );

    throw new PanelAuthError(
      `Pterodactyl rejected the login request with HTTP ${response.status}.`,
      "LOGIN_REJECTED",
      response.status
    );
  }

  const account = await getPanelAccount(cookies);

  if (!account) {
    throw new PanelAuthError(
      `Pterodactyl login could not be verified (HTTP ${response.status}).`,
      "SESSION_VERIFICATION_FAILED",
      401
    );
  }

  return {
    success: true,
    cookies,
    redirect: redirectPath,
    panelAccount: account
  };
}

export class PanelAuthError extends Error {
  constructor(message, code = "PANEL_AUTH_ERROR", status = 401) {
    super(message);

    this.name = "PanelAuthError";
    this.code = code;
    this.status = status;
  }
}

export default {
  loginToPanel,
  PanelAuthError
};

// Copyright © HyperForgeX. All rights reserved.