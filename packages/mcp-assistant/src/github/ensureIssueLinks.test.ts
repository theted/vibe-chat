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

test("adds comment links the answer left out", () => {
  const comment = {
    issueNumber: 3,
    url: "https://github.com/x/y/issues/3#issuecomment-5",
  };
  expect(ensureIssueLinks("Done!", [], [comment])).toBe(
    "Done!\nCommented on #3: https://github.com/x/y/issues/3#issuecomment-5",
  );
  expect(ensureIssueLinks(`See ${comment.url}`, [], [comment])).toBe(
    `See ${comment.url}`,
  );
});
