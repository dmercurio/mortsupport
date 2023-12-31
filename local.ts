#!/usr/bin/env npx ts-node
import {command, run} from 'cmd-ts';
import {execSync} from 'child_process';

const local = command({
  name: './local.ts',
  args: {},
  handler: () => {
    process.stdout.write(`${String.fromCharCode(27)}]0;./local.ts${String.fromCharCode(7)}`); // rename terminal tab
    execSync('npm run local --prefix server', {stdio: 'inherit'});
  },
});
run(local, process.argv.slice(2));
