import { describe, it, expect } from "vitest";
import { Writable } from "stream";
import pino from "pino";

describe("pino JSON logging is not vulnerable to log injection", () => {
  it("keeps an embedded newline inside one JSON log line, not a forged extra line", () => {
    const chunks = [];
    const memoryStream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });
    const logger = pino(memoryStream);

    logger.info(
      {
        name: "Attacker\nFAKE LOG ENTRY: admin logged in",
        email: "a@test.com",
        phone: "123",
      },
      "contact form submitted"
    );

    const output = chunks.join("");
    const lines = output.split("\n").filter(Boolean);

    // a raw text logger (console.log with string concatenation) would let
    // the embedded \n forge a second, fake log line here; pino's JSON
    // serialization escapes it as \n inside one string field instead -
    // exactly one line is printed, and it's whole, parseable JSON
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.name).toBe("Attacker\nFAKE LOG ENTRY: admin logged in");
    expect(entry.msg).toBe("contact form submitted");
  });
});
