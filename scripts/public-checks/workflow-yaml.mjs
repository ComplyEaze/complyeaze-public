// A reader for the small subset of YAML that this repository's workflow files use: block mappings and
// sequences, plain and quoted scalars, block scalars (| and >), and flow sequences of scalars. It FAILS CLOSED:
// anything else (anchors, aliases, tags, flow mappings, nested flow collections, tabs, duplicate keys, multiple
// documents, merge keys, complex keys) throws, so a gate built on it never reads a file it did not understand.
// Every scalar is returned as a string, and an empty value as null; nothing is coerced to a boolean or number.

const KEY = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[A-Za-z0-9_.-]+):(?:[ \t]+(.*))?$/;

function unsupported(line, what) {
  throw new Error(`unsupported YAML (${what}) at line ${line + 1}`);
}

function stripComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      if (i === 0 || /[\s:\[,{-]/.test(text[i - 1])) quote = char;
    } else if (char === "#" && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text.trimEnd();
}

function scalar(raw, line) {
  const text = raw.trim();
  if (text === "" || text === "~" || text === "null") return null;
  if (/^[&*!]/.test(text)) unsupported(line, "anchor, alias or tag");
  if (text.startsWith("{")) unsupported(line, "flow mapping");
  if (text.startsWith("[")) {
    if (!text.endsWith("]")) unsupported(line, "unterminated flow sequence");
    const inner = text.slice(1, -1).trim();
    if (inner === "") return [];
    const items = [];
    let depth = 0;
    let quote = null;
    let current = "";
    for (const char of inner) {
      if (quote) { if (char === quote) quote = null; current += char; continue; }
      if (char === '"' || char === "'") quote = char;
      if (char === "[" || char === "{") unsupported(line, "nested flow collection");
      if (char === "," && depth === 0) { items.push(current); current = ""; continue; }
      current += char;
    }
    items.push(current);
    return items.map((item) => scalar(item, line));
  }
  if (text.startsWith('"')) {
    if (!/^"(?:[^"\\]|\\.)*"$/.test(text)) unsupported(line, "malformed double-quoted scalar");
    return text.slice(1, -1).replace(/\\(["\\\/])/g, "$1");
  }
  if (text.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(text)) unsupported(line, "malformed single-quoted scalar");
    return text.slice(1, -1).replaceAll("''", "'");
  }
  return text;
}

export function parseWorkflowYaml(source) {
  if (/\t/.test(source)) throw new Error("unsupported YAML (a tab character)");
  const raw = source.replace(/\r\n/g, "\n").split("\n");
  if (raw.some((line) => /^(---|\.\.\.)(\s|$)/.test(line))) throw new Error("unsupported YAML (document markers)");
  // Indentation is spaces only. Any other leading whitespace (a no-break space, an ideographic space) is not YAML
  // indentation, and JavaScript's trim would otherwise count it as indentation and read the line as nested.
  const lines = raw.map((text, index) => {
    const indent = text.length - text.replace(/^ +/, "").length;
    if (/^\s/.test(text.slice(indent))) unsupported(index, "leading whitespace other than spaces");
    return { text, indent };
  });
  let position = 0;

  const skipBlank = () => {
    while (position < lines.length && stripComment(lines[position].text).trim() === "") position += 1;
  };

  function blockScalar(header, parentIndent, lineNumber) {
    const [, style, chomp] = /^([|>])([+-]?)$/.exec(header) ?? [];
    if (!style || chomp === "+") unsupported(lineNumber, "block scalar header");
    const body = [];
    let contentIndent = null;
    while (position < lines.length) {
      const { text, indent } = lines[position];
      if (text.trim() === "") { body.push(""); position += 1; continue; }
      if (indent <= parentIndent) break;
      contentIndent ??= indent;
      if (indent < contentIndent) break;
      body.push(text.slice(contentIndent));
      position += 1;
    }
    while (body.length && body.at(-1) === "") body.pop();
    const joined = style === "|" ? body.join("\n") : body.join(" ");
    return chomp === "-" ? joined : `${joined}\n`;
  }

  function parseBlock(indent) {
    skipBlank();
    if (position >= lines.length) return null;
    const first = stripComment(lines[position].text).trimStart();
    return first.startsWith("- ") || first === "-" ? parseSequence(indent) : parseMapping(indent);
  }

  function parseMapping(indent) {
    const result = {};
    for (;;) {
      skipBlank();
      if (position >= lines.length) break;
      const { indent: here } = lines[position];
      if (here < indent) break;
      if (here > indent) unsupported(position, "unexpected indentation");
      const line = stripComment(lines[position].text).trim();
      if (line.startsWith("- ")) break;
      if (line.startsWith("? ") || line.startsWith("<<")) unsupported(position, "complex key or merge key");
      const match = KEY.exec(line);
      if (!match) unsupported(position, "a line that is not `key: value`");
      const key = match[1].replace(/^["']|["']$/g, "");
      if (Object.hasOwn(result, key)) unsupported(position, `duplicate key ${key}`);
      const lineNumber = position;
      const rest = (match[2] ?? "").trim();
      position += 1;
      if (rest === "") {
        skipBlank();
        const next = position < lines.length ? lines[position] : null;
        const nextText = next ? stripComment(next.text).trimStart() : "";
        // a block sequence may sit at the same indent as its key
        if (next && (next.indent > indent || (next.indent === indent && nextText.startsWith("- ")))) {
          result[key] = parseBlock(next.indent);
        } else {
          result[key] = null;
        }
      } else if (/^[|>]/.test(rest)) {
        result[key] = blockScalar(rest, indent, lineNumber);
      } else {
        result[key] = scalar(rest, lineNumber);
      }
    }
    return result;
  }

  function parseSequence(indent) {
    const result = [];
    for (;;) {
      skipBlank();
      if (position >= lines.length) break;
      const { indent: here } = lines[position];
      if (here < indent) break;
      if (here > indent) unsupported(position, "unexpected indentation");
      const line = stripComment(lines[position].text).trimStart();
      if (!(line.startsWith("- ") || line === "-")) break;
      const content = line === "-" ? "" : line.slice(2).trimStart();
      const lineNumber = position;
      if (content === "") {
        position += 1;
        skipBlank();
        result.push(position < lines.length && lines[position].indent > indent ? parseBlock(lines[position].indent) : null);
      } else if (KEY.test(content) && !content.startsWith('"') && !content.startsWith("'") || /^(?:"[^"]*"|'[^']*'):/.test(content)) {
        // "- key: value": read the item as a mapping whose first line sits after the dash
        const offset = indent + 2 + (line.slice(2).length - line.slice(2).trimStart().length);
        lines[position] = { text: " ".repeat(offset) + content, indent: offset };
        result.push(parseMapping(offset));
      } else {
        position += 1;
        result.push(scalar(content, lineNumber));
      }
    }
    return result;
  }

  skipBlank();
  if (position >= lines.length) return null;
  const value = parseBlock(lines[position].indent);
  skipBlank();
  if (position < lines.length) unsupported(position, "content after the document");
  return value;
}
