// Broad on purpose: Cloudflare also rewrites address-shaped text such as "pnpm@10.28.2".
const emailAddress = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

// Cloudflare's Email Address Obfuscation rewrites addresses in served HTML into a script-decoded
// "[email protected]" link that crawlers and assistants cannot read. It skips anything between
// these comment markers, so the address stays readable as plain text.
export function withEmailsReadable(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped.replace(emailAddress, (address) => `<!--email_off-->${address}<!--/email_off-->`);
}
