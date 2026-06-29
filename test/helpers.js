const { Readable } = require('node:stream');

function user(id = 'user-1', username = 'rapha') {
  return {
    id,
    username,
    discriminator: '0'
  };
}

function interaction(overrides = {}) {
  return {
    id: 'interaction-1',
    application_id: 'app-1',
    token: 'token-1',
    type: 2,
    member: {
      permissions: '0',
      user: user()
    },
    data: {
      name: 'verify'
    },
    ...overrides
  };
}

function adminInteraction(overrides = {}) {
  return interaction({
    member: {
      permissions: '32',
      user: user('admin-1', 'admin')
    },
    ...overrides
  });
}

function modalComponent(customId, value) {
  return {
    type: 18,
    component: {
      type: 4,
      custom_id: customId,
      value
    }
  };
}

function modalUpload(customId, attachmentId) {
  return {
    type: 18,
    component: {
      type: 19,
      custom_id: customId,
      values: [attachmentId]
    }
  };
}

function fakeResponse() {
  return {
    headers: {},
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      this.headersSent = true;
      return this;
    },
    send(payload) {
      this.payload = payload;
      this.headersSent = true;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(payload) {
      this.payload = payload;
      this.headersSent = true;
    }
  };
}

function fakeRequest(body, headers = {}) {
  const req = Readable.from([body]);
  req.method = 'POST';
  req.headers = headers;
  return req;
}

module.exports = {
  adminInteraction,
  fakeRequest,
  fakeResponse,
  interaction,
  modalComponent,
  modalUpload,
  user
};
