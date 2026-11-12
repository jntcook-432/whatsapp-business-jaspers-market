/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");

const { isValidSignature } = require("../services/inbound");
const Message = require("../services/message");

const SECRET = "test-app-secret";
const BODY = Buffer.from('{"object":"whatsapp_business_account"}');

function sign(body, secret = SECRET) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

test("accepts a signature computed from the raw body with the app secret", () => {
  assert.equal(isValidSignature(BODY, sign(BODY), SECRET), true);
});

test("rejects a missing signature header", () => {
  assert.equal(isValidSignature(BODY, undefined, SECRET), false);
});

test("rejects a signature made with a different secret", () => {
  assert.equal(isValidSignature(BODY, sign(BODY, "other"), SECRET), false);
});

test("rejects a signature over a different body", () => {
  assert.equal(isValidSignature(Buffer.from("{}"), sign(BODY), SECRET), false);
});

test("rejects a malformed or truncated signature", () => {
  assert.equal(isValidSignature(BODY, "sha256=", SECRET), false);
  assert.equal(isValidSignature(BODY, "sha256=zz", SECRET), false);
  assert.equal(isValidSignature(BODY, sign(BODY).slice(0, 40), SECRET), false);
  assert.equal(isValidSignature(BODY, sign(BODY).replace("sha256=", "sha1="), SECRET), false);
});

test("fails closed when the app secret is not configured", () => {
  assert.equal(isValidSignature(BODY, sign(BODY, ""), ""), false);
  assert.equal(isValidSignature(BODY, sign(BODY), undefined), false);
});

test("list replies do not throw and route to the default branch", () => {
  const message = new Message({
    id: "wamid.list-reply",
    from: "15551234567",
    type: "interactive",
    interactive: {
      type: "list_reply",
      list_reply: { id: "some-list-row", title: "Row" },
    },
  });

  assert.equal(message.id, "wamid.list-reply");
  assert.equal(message.type, "unknown");
});

test("interactive messages without any reply payload do not throw", () => {
  const message = new Message({
    id: "wamid.bare-interactive",
    from: "15551234567",
    type: "interactive",
    interactive: { type: "nfm_reply" },
  });

  assert.equal(message.type, "unknown");
});

test("button replies still route on their id", () => {
  const message = new Message({
    id: "wamid.button-reply",
    from: "15551234567",
    type: "interactive",
    interactive: {
      type: "button_reply",
      button_reply: { id: "reply-offer", title: "Current promo" },
    },
  });

  assert.equal(message.type, "reply-offer");
});
