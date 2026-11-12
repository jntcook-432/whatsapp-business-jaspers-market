/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const { urlencoded, json } = require('body-parser');
require('dotenv').config();
const express = require('express');

const config = require('./services/config');
const Conversation = require('./services/conversation');
const { isValidSignature } = require('./services/inbound');
const app = express();

// Parse application/x-www-form-urlencoded
app.use(
  urlencoded({
    extended: true
  })
);

// Parse application/json. Verify that callback came from Facebook
app.use(json({ verify: verifyRequestSignature }));

// Handle webhook verification handshake
app.get("/webhook", function (req, res) {
  if (
    req.query["hub.mode"] != "subscribe" ||
    req.query["hub.verify_token"] != config.verifyToken
  ) {
    res.sendStatus(403);
    return;
  }

  res.send(req.query["hub.challenge"]);
});

// Handle incoming messages
app.post('/webhook', (req, res) => {
  // Do not log req.body: it contains customer phone numbers and message text.

  if (req.body.object === "whatsapp_business_account") {
    (req.body.entry || []).forEach(entry => {
      (entry.changes || []).forEach(change => {
        const value = change.value;
        if (value) {
          const senderPhoneNumberId = value.metadata.phone_number_id;

          if (value.statuses) {
            value.statuses.forEach(status => {
              // Handle message status updates. Conversation methods catch
              // their own errors; this is a second line of defence so one
              // bad event can never terminate the process.
              Conversation.handleStatus(senderPhoneNumberId, status)
                .catch(err => console.error('handleStatus failed:', err));
            });
          }

          if (value.messages) {
            value.messages.forEach(rawMessage => {
              // Respond to message
              Conversation.handleMessage(senderPhoneNumberId, rawMessage)
                .catch(err => console.error('handleMessage failed:', err));
            });
          }
        }
      });
    });
  }

  res.status(200).send('EVENT_RECEIVED');
});

// Default route for health check
app.get('/', (req, res) => {
  res.json({
    message: 'Jasper\'s Market Server is running',
    endpoints: [
      'POST /webhook - WhatsApp webhook endpoint'
    ]
  });
});

// Check if all environment variables are set
config.checkEnvVariables();

// Verify that the callback came from Facebook. Fails closed: requests without
// a valid signature are rejected, and so is everything when APP_SECRET is unset.
function verifyRequestSignature(req, res, buf) {
  if (!config.appSecret) {
    throw httpError(503, "APP_SECRET is not configured");
  }
  if (!isValidSignature(buf, req.headers["x-hub-signature-256"], config.appSecret)) {
    throw httpError(403, "Couldn't validate the request signature.");
  }
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
}


var listener = app.listen(config.port, () => {
  console.log(`The app is listening on port ${listener.address().port}`);
});
