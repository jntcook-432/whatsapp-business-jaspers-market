/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

module.exports = class Message {
  constructor(rawMessage) {
    this.id = rawMessage.id;
    this.timestamp = rawMessage.timestamp ?? null;
    this.textBody =
      rawMessage.type === 'text' && typeof rawMessage.text?.body === 'string'
        ? rawMessage.text.body
        : null;

    // Only button replies route, since this bot only sends buttons. Other
    // interactive payloads (list_reply, nfm_reply, ...) fall through to
    // 'unknown' instead of throwing on a missing field.
    const replyId = rawMessage.interactive?.button_reply?.id;
    this.type =
      rawMessage.type === 'interactive' && typeof replyId === 'string'
        ? replyId
        : 'unknown';

    this.senderPhoneNumber = rawMessage.from;
  }
};
