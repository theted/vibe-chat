import { expect, test } from "bun:test";

import { ensureIssueLinks } from "../index";

const issue = { number: 3, title: "T", url: "https://github.com/x/y/issues/3" };

test("adds the link when the answer left it out", () => {
  expect(ensureIssueLinks("Done!", [issue])).toBe(
    "Done!\nFiled #3: https://github.com/x/y/issues/3",
  );
  expect(ensureIssueLinks("", [issue])).toBe(
    "Filed #3: https://github.com/x/y/issues/3",
  );
});

test("leaves an answer that already links it alone", () => {
  const answer = `Filed it: ${issue.url}`;
  expect(ensureIssueLinks(answer, [issue])).toBe(answer);
});
