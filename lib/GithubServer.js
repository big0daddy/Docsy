
"use strict";

const config = require('../config');

const crypto = require('crypto');
const child_process = require('child_process');

const express = require('express');
const bodyParser = require('body-parser');



class GithubServer {

  constructor(data, docs) {
    this.data = data;
    this.docs = docs;

    const app = express();
    app.use(bodyParser.json());
    app.post('/hooks/github', this.verify, (req, res) => {
      if (req.headers['x-github-event'] !== 'push') return res.status(200).json({ ok: true });

      const payload = req.body
          , repo = payload.repository.full_name
          , branch = payload.ref.split('/').pop();

      const repoName = `${repo}#${branch}`;

      console.log(`GitHub webhook: got pull payload: ${repoName}`);

      if (this.data.repos.hasOwnProperty(repoName))
        return docs.update(repoName);

      if (repoName === "Programmix/Docsy#master") {
        child_process.execSync('git pull');
      }

      res.status(200).json({ ok: true });
    });

    app.listen(config.port, () => {
      console.log(`Server started on port ${config.port}.`);
    });
  }

  get verify() {
    let signBlob = (key, blob) => {
      return 'sha1=' + crypto.createHmac('sha1', key).update(blob).digest('hex');
    };

    return bodyParser.json({
      verify: (req, res, buffer) => {
        if (!req.headers['x-hub-signature'])
          throw new Error('No X-Hub-Signature found on request');

        if (!req.headers['x-github-event'])
          throw new Error('No X-Github-Event found on request');

        if (!req.headers['x-github-delivery'])
          throw new Error('No X-Github-Delivery found on request');

        const received_sig = req.headers['x-hub-signature'];
        const computed_sig = signBlob(config.github.secret, buffer);

        if (received_sig != computed_sig) {
          console.warn('Recieved an invalid HMAC: calculated:' +
            computed_sig + ' != recieved:' + received_sig);
          throw new Error('Invalid signature');
        }
      }
    });
  }

}


module.exports = GithubServer;
