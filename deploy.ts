#!/usr/bin/env npx ts-node
import {command, run, oneOf, option, optional, string} from 'cmd-ts';
import {execSync} from 'child_process';
import {readFileSync} from 'fs';

const deploy = command({
  name: './deploy.ts',
  args: {
    env: option({
      type: oneOf(['staging', 'prod']),
      long: 'env',
      defaultValue: () => 'staging',
    }),
    version: option({type: optional(string), long: 'version'}),
  },
  handler: ({env, version}) => {
    const project = JSON.parse(readFileSync(`infrastructure/outputs/${env}/project.json`, 'utf-8')).id;
    const versionClause = version ? `--version=${version} --no-promote` : '';
    execSync(`npm run build --prefix server`, {
      stdio: 'inherit',
      env: {...process.env, NODE_ENV: 'production'},
    });
    execSync(`yes | gcloud app deploy --project=${project} ${versionClause} app.yaml cron.yaml index.yaml`, {
      stdio: 'inherit',
      env: {...process.env, TZ: '/usr/share/zoneinfo/UTC'},
    });
    execSync(
      [
        `gcloud app versions list --filter="traffic_split=0" --sort-by="~last_deployed_time" --format "value(version.id)" --project=${project}`,
        'tail -n +100',
        `xargs -r gcloud app versions delete --project=${project}`,
      ].join(' | '),
    );
  },
});
run(deploy, process.argv.slice(2));
