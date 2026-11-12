/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const crypto = require("crypto");

const SIGNATURE_PREFIX = "sha256=";

/**
 * Verify the X-Hub-Signature-256 header against the raw request body.
 * Fails closed: a missing secret, a missing header, or a malformed value
 * all return false. The comparison is constant-time.
 */
function isValidSignature(rawBody, header, appSecret) {
  if (!appSecret || typeof header !== "string") {
    return false;
  }
  if (!header.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest();
  const received = Buffer.from(header.slice(SIGNATURE_PREFIX.length), "hex");

  if (received.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(received, expected);
}

module.exports = {
  isValidSignature,
};
