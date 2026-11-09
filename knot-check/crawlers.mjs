// Which app is fetching a link preview, and which share card it shows best.
//
// Each app fetches previews with its own crawler and names itself in the
// user agent. Order matters: iMessage sends
//   facebookexternalhit/1.1 Facebot Twitterbot/1.0
// so it has to match before Facebook or X, or it gets their wide card.
// Sources: Stack Overflow / Webmasters SE / Medium reports (2016-2025) for
// iMessage, api.slack.com/robots for Slack, published crawler lists for the
// rest. All of these can change without notice: `knot-check share` re-checks.

export const CRAWLERS = [
  { app: "iMessage", card: "tall", test: (ua) => /facebookexternalhit/i.test(ua) && /Twitterbot/i.test(ua),
    sample: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0" },
  { app: "WhatsApp", card: "tall", test: (ua) => /WhatsApp/i.test(ua), sample: "WhatsApp/2.23.20.0 A" },
  { app: "Telegram", card: "tall", test: (ua) => /TelegramBot/i.test(ua), sample: "TelegramBot (like TwitterBot)" },
  { app: "X", card: "wide", test: (ua) => /Twitterbot/i.test(ua), sample: "Twitterbot/1.0" },
  { app: "LinkedIn", card: "wide", test: (ua) => /LinkedInBot/i.test(ua), sample: "LinkedInBot/1.0 (compatible; Mozilla/5.0; +http://www.linkedin.com)" },
  { app: "Facebook", card: "wide", test: (ua) => /facebookexternalhit|Facebot/i.test(ua), sample: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" },
  { app: "Slack", card: "wide", test: (ua) => /Slackbot/i.test(ua), sample: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)" },
  { app: "Discord", card: "wide", test: (ua) => /Discordbot/i.test(ua), sample: "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" },
];

/** The app a user agent belongs to, or null for browsers, search engines and unknown apps. */
export function classify(ua = "") {
  return CRAWLERS.find((c) => c.test(ua)) ?? null;
}
