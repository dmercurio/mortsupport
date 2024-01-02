# MortSupport

## Setup

### Install Node.js

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 18
node --version # e.g. v18.16.0
```

Copy `cdnvm()` into `~/.bash_profile` from https://github.com/nvm-sh/nvm#automatically-call-nvm-use


## Scripts

### Local Development
```bash
./local.ts
```

### Deployments
```bash
./deploy.ts # deploys staging
./deploy.ts --env prod # deploys prod
./deploy.ts --version mytest # deploys mytest version
```
