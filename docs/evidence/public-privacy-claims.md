# Evidence for indexed privacy and product-boundary claims

Checked 2026-09-30 against the public repositories named below. Each row is a
claim now made on an indexed complyeaze.com page, with the wording it was
narrowed to and the source that supports it. If a source stops saying this, the
page wording must change.

| Page copy (packages/public-content/src/complyeaze.routes.json) | Source | What the source says |
| --- | --- | --- |
| Home: "Pack does not capture your GST password"; "Its public source lists no capture of credentials, OTPs, CAPTCHAs, cookies or session tokens" | github.com/lamemustafa/pack `README.md`, "V0 is intentionally narrow" (commit a4237865d84923b3933719114349aae1527b7fd7) | "no GST Portal credential, OTP, CAPTCHA, cookie, or session-token capture" |
| Home: "Pack ... uploads no GST documents"; Products/Pack: "no GST document upload" | same | "no GST document upload in the local-download workflow" |
| Products/Pack: "no extension analytics or telemetry"; "No ComplyEaze account" | same | "no extension analytics or telemetry"; "no ComplyEaze, Axal, or Pack login" |
| Home sample slip: "GST document uploaded: None" and "Pack saves the filed PDF to your computer and uploads no GST document"; "Password captured: No" | same Pack README | "no GST document upload in the local-download workflow"; "no GST Portal credential, OTP, CAPTCHA, cookie, or session-token capture" |
| Home: "Tools work on pasted rows inside the browser tab and need no file upload"; Products/Tools: "No account or file upload is required, and pasted rows are not intentionally sent to ComplyEaze" | github.com/lamemustafa/complyeaze-tools `README.md` and `docs/privacy-local-first.md` (commit 726ec6e7ddf9fda1c38f221be6c950fafc330876) | "Files are processed in your browser. No account or file upload is required."; "Tool files are not intentionally sent to ComplyEaze by these tools." |
| Products/Bridge: status "Preview; posting is off by default" | Bridge `README.md`, "The Claude Desktop extension turns voucher posting off by default" | same |
| Products/Bridge: "Reaches Tally on the same computer only. What the assistant reads goes to your AI provider." | github.com/lamemustafa/bridge `README.md`, opening paragraphs (commit 8fd8619560d2d3736d4f0fa0616cfef820ceb331) | "on `localhost` only. A remote Tally host is refused"; "What the assistant reads does reach the AI provider you chose" |
| Products/Pack: "Public beta"; Pack description: filed GSTR-3B and GSTR-1 returns and the GSTR-2B statement | Pack `README.md`, "Status": the Store-published package is the `v0.5.0` beta, publication maintainer-observed; GSTR-2B "auto-drafted statements"; Chrome Web Store listing description "Beta: Save filed GSTR-1 and GSTR-3B returns and auto-drafted GSTR-2B statements locally" | Store package is a beta; 2B is a statement, its live gate "not fully closed" |
| Home and Products: Bridge "local log of every action" and "approve before anything posts" | Bridge `README.md` (receipt log; native approval before posting) | README under "Is this for you": a receipt is appended to a log on your own machine for every tool call (line 28); one voucher per approval "in a dialog on your own machine. The assistant cannot approve it" (lines 58-60) |
| /privacy/: "Visiting this website" | `.github/workflows/pages-deploy.yml` (GitHub Pages deploy of `apps/complyeaze/dist`); response headers 2026-09-30 (served by Cloudflare, Cloudflare bot-detection script injected); layout has no analytics code | request metadata and security signals are processed by GitHub Pages and Cloudflare |
| Home and Products: Pack, Tools, Bridge and this website are open source under Apache 2.0 | GitHub license API for each repository | `Apache-2.0` for pack, complyeaze-tools, bridge |

## Wording deliberately removed

- "your GST password never reaches us", "Sent to ComplyEaze: Nothing", "sends nothing to ComplyEaze", "Nothing is uploaded", "no telemetry" and
  "nothing saved on our side" were absolute. The Tools source itself notes that
  its static host receives normal web request metadata and that Cloudflare
  security checks may process browser signals, so those phrasings could not be
  proven and were narrowed to what each source states.
- The Bridge card no longer says it "connects only to Tally on the same
  computer", because the assistant's reads reach its AI provider.

## Not evidenced here (owner attestation needed)

- "Free" (home lede and the "Free, open-source" descriptions; the Tools "Free to use" status was replaced): none of the Pack, Tools or Bridge
  READMEs state a price. The wording predates this change and was left as the
  owner's product statement; it is flagged in the PR for the owner to confirm.
- "Install Pack" links to the Chrome Web Store listing, which loads and is titled
  "ComplyEaze Pack: GST Return Downloader" (checked 2026-09-30).
- The hosted Tools site (tools.complyeaze.com) returned HTTP 525 on 2026-09-30; the Tools status and gateway page say so.
